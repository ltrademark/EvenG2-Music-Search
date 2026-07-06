<template>
  <div class="app">
    <header class="topbar">
      <nav class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab"
          :class="{ 'tab--active': view === tab.id }"
          @click="view = tab.id"
        >
          {{ tab.label }}
        </button>
      </nav>
      <div class="topbar__right">
        <span class="topbar__ver">v{{ version }}</span>
        <button class="topbar__help" aria-label="What's new" @click="showWhatsNew = true">?</button>
      </div>
    </header>

    <main class="app__main">
      <HistoryView
        v-if="view === 'history'"
        :history="history"
        @export="onExportHistory"
        @import="onImportHistory"
        @clear="onClearHistory"
      />
      <SettingsView
        v-else
        :settings="settings"
        :debug="debug"
        :debug-unlocked="debugUnlocked"
        @save="onSaveSettings"
        @clear-debug="debug = []"
      />
    </main>

    <WhatsNew v-if="showWhatsNew" @close="showWhatsNew = false" @unlock-debug="onUnlockDebug" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { OsEventTypeList, type EvenHubEvent } from '@evenrealities/even_hub_sdk'
import HistoryView from './views/HistoryView.vue'
import SettingsView from './views/SettingsView.vue'
import WhatsNew from './components/WhatsNew.vue'
import { getBridge } from './lib/bridge'
import { captureAudio } from './lib/audio/capture'
import { recognize } from './lib/api/recognition'
import { toDataUrl } from './lib/api/coverart'
import { loadSettings, saveSettings, DEFAULT_SETTINGS, type Settings } from './lib/storage/settings'
import { loadHistory, addToHistory, clearHistory, importHistory } from './lib/storage/history'
import { exportHistory, parseImport } from './lib/history-io'
import {
  showSplash,
  showMenu,
  showListening,
  setListeningStatus,
  stopWave,
  showResult,
  showNoMatch,
  showHistoryList,
  showHistoryEmpty,
  showHistoryDetail,
} from './lib/glasses/screens'
import type { AppPhase, DebugEntry, GlassesScreen, PhoneView, TrackMatch } from './lib/types'

const SPLASH_MS = 2000
const DEBUG_UNLOCK_KEY = 'musicid.debugUnlocked'

interface Data {
  view: PhoneView
  phase: AppPhase
  glassesScreen: GlassesScreen
  remaining: number
  match: TrackMatch | null
  errorMessage: string
  history: TrackMatch[]
  settings: Settings
  captureAbort: AbortController | null
  unsubscribe: (() => void) | null
  searchCancelled: boolean
  debug: DebugEntry[]
  showWhatsNew: boolean
  debugUnlocked: boolean
  autoListenedThisSession: boolean
}

export default defineComponent({
  name: 'App',
  components: { HistoryView, SettingsView, WhatsNew },
  data(): Data {
    return {
      view: 'history',
      phase: 'idle',
      glassesScreen: 'splash',
      remaining: 0,
      match: null,
      errorMessage: '',
      history: [],
      settings: { ...DEFAULT_SETTINGS },
      captureAbort: null,
      unsubscribe: null,
      searchCancelled: false,
      debug: [],
      showWhatsNew: false,
      debugUnlocked: false,
      autoListenedThisSession: false,
    }
  },
  computed: {
    version(): string {
      return __APP_VERSION__
    },
    busy(): boolean {
      return this.phase === 'listening' || this.phase === 'identifying'
    },
    tabs(): { id: PhoneView; label: string }[] {
      return [
        { id: 'history', label: 'History' },
        { id: 'settings', label: 'Settings' },
      ]
    },
  },
  async mounted() {
    this.settings = await loadSettings()
    this.history = await loadHistory()

    // Splash is the first page (createStartUpPageContainer), then the menu.
    await showSplash()
    const bridge = await getBridge()
    this.debugUnlocked = (await bridge.getLocalStorage(DEBUG_UNLOCK_KEY)) === 'true'
    this.unsubscribe = bridge.onEvenHubEvent(this.onGlassesEvent)

    // Dev-only: `VITE_DEMO=1 yarn dev` seeds sample data to verify the
    // result/history layouts in the simulator (no mic/key there). Never in prod.
    // `VITE_DEMO=listening` shows the listening screen + wave.
    if (import.meta.env.DEV && import.meta.env.VITE_DEMO) {
      if (import.meta.env.VITE_DEMO === 'splash') {
        // Splash already rendered above; just don't advance to the menu.
      } else if (import.meta.env.VITE_DEMO === 'listening') {
        this.glassesScreen = 'listening'
        await showListening()
      } else {
        await this.seedDemo()
      }
      return
    }

    // After the splash, either auto-listen (once per session) or show the menu.
    setTimeout(() => {
      if (this.settings.autoListen && !this.autoListenedThisSession) {
        this.autoListenedThisSession = true
        void this.identify()
      } else {
        void this.gotoMenu()
      }
    }, SPLASH_MS)
  },
  beforeUnmount() {
    this.captureAbort?.abort()
    stopWave()
    this.unsubscribe?.()
  },
  methods: {
    /** Run the full listen → fingerprint → lookup pipeline (drives the glasses). */
    async identify() {
      if (this.busy) return
      this.match = null
      this.errorMessage = ''
      this.searchCancelled = false
      this.pushDebug(`Search started (${this.settings.captureSeconds}s, ${this.settings.micSource} mic)`)

      try {
        this.phase = 'listening'
        this.glassesScreen = 'listening'
        await showListening()

        this.captureAbort = new AbortController()
        const audio = await captureAudio({
          durationSec: this.settings.captureSeconds,
          source: this.settings.micSource,
          signal: this.captureAbort.signal,
          onProgress: (_elapsed, remaining) => (this.remaining = remaining),
        })
        if (this.searchCancelled) {
          this.pushDebug('Search cancelled')
          return
        }
        // Mic health: peak near 0 (or 0 chunks) means no real audio was captured.
        const micOk = audio.chunkCount > 0 && audio.peak >= 500
        this.pushDebug(
          `Mic: ${audio.chunkCount} chunks, ${audio.samples.length} samples, ${audio.durationSec.toFixed(1)}s`,
          `peak ${audio.peak}/32767 · rms ${audio.rms}` +
            (micOk ? '' : ' — very low/no signal; mic may not be capturing'),
          micOk,
        )

        stopWave()
        this.phase = 'identifying'
        await setListeningStatus('Searching...')

        this.pushDebug('Generating signature + querying...')
        const result = await recognize(audio, this.captureAbort?.signal)
        this.pushDebug(
          `Recognition: ${result.matched ? 'match' : 'no match'} (sig ${result.sampleMs}ms)`,
          result.match ? `${result.match.title} — ${result.match.artist}` : undefined,
          result.matched,
        )
        const match = result.match

        if (match) {
          match.identifiedAt = Date.now()
          // Cache the cover art as base64 so history is offline-friendly + exportable.
          match.coverArtData = (await toDataUrl(match.coverArtUrl)) ?? undefined
          this.match = match
          this.history = await addToHistory(match)
          this.phase = 'result'
          this.glassesScreen = 'result'
          await showResult(match)
        } else {
          this.phase = 'nomatch'
          this.glassesScreen = 'nomatch'
          await showNoMatch()
        }
      } catch (err) {
        stopWave()
        this.errorMessage = (err as Error).message || 'Identification failed.'
        this.pushDebug('Error', this.errorMessage, false)
        this.phase = 'error'
        this.glassesScreen = 'nomatch'
        await showNoMatch(this.errorMessage)
      } finally {
        this.captureAbort = null
      }
    },

    /** Append a line to the debug log (newest first, capped). */
    pushDebug(label: string, detail?: string, ok?: boolean) {
      this.debug = [{ time: Date.now(), label, detail, ok }, ...this.debug].slice(0, 80)
    },

    // ---- Glasses navigation -------------------------------------------------

    async gotoMenu() {
      stopWave()
      this.glassesScreen = 'menu'
      await showMenu()
    },

    async gotoHistoryList() {
      this.history = await loadHistory()
      if (this.history.length === 0) {
        this.glassesScreen = 'historyEmpty'
        await showHistoryEmpty()
      } else {
        this.glassesScreen = 'historyList'
        await showHistoryList(this.history)
      }
    },

    async openHistoryDetail(index: number) {
      const item = this.history[index]
      if (!item) return
      this.glassesScreen = 'historyDetail'
      await showHistoryDetail(item)
    },

    cancelSearch() {
      this.searchCancelled = true
      this.captureAbort?.abort()
      this.phase = 'idle'
      void this.gotoMenu()
    },

    // ---- Glasses input routing ---------------------------------------------

    onGlassesEvent(event: EvenHubEvent) {
      // List single-press → selection on the active list screen.
      if (event.listEvent) {
        this.onGlassesSelect(event.listEvent.currentSelectItemIndex ?? 0)
        return
      }

      const sys = event.sysEvent
      if (!sys) return
      const type = sys.eventType ?? OsEventTypeList.CLICK_EVENT

      // Lifecycle: backgrounded mid-capture → stop listening.
      if (type === OsEventTypeList.FOREGROUND_EXIT_EVENT || type === OsEventTypeList.ABNORMAL_EXIT_EVENT) {
        this.captureAbort?.abort()
        return
      }

      const isDouble =
        type === OsEventTypeList.DOUBLE_CLICK_EVENT || type === OsEventTypeList.SYSTEM_EXIT_EVENT
      const isSingle = type === OsEventTypeList.CLICK_EVENT

      switch (this.glassesScreen) {
        case 'listening':
          if (isDouble) this.cancelSearch()
          break
        case 'result':
        case 'nomatch':
          if (isSingle) void this.identify()
          else if (isDouble) void this.gotoMenu()
          break
        case 'historyDetail':
          if (isDouble) void this.gotoHistoryList()
          break
        case 'historyList':
        case 'historyEmpty':
          if (isDouble) void this.gotoMenu()
          break
        case 'menu':
          if (isDouble) void this.exit()
          break
      }
    },

    onGlassesSelect(index: number) {
      if (this.glassesScreen === 'menu') {
        if (index === 0) void this.identify()
        else void this.gotoHistoryList()
      } else if (this.glassesScreen === 'historyList') {
        void this.openHistoryDetail(index)
      }
    },

    async exit() {
      const bridge = await getBridge()
      await bridge.shutDownPageContainer(1)
    },

    /** Dev-only: seed sample history + show a result, to verify layouts. */
    async seedDemo() {
      const samples: TrackMatch[] = [
        {
          acoustId: 'demo-1',
          releaseGroupId: '1b022e01-4da6-387b-8658-8678046e4cef',
          title: 'Smells Like Teen Spirit',
          artist: 'Nirvana',
          album: 'Nevermind',
          year: '1991',
          coverArtUrl:
            'https://coverartarchive.org/release-group/1b022e01-4da6-387b-8658-8678046e4cef/front-250',
          score: 0.94,
          identifiedAt: Date.UTC(2026, 4, 12),
        },
        {
          acoustId: 'demo-2',
          title: '小風波',
          artist: 'Alan Tam',
          album: '愛的根源',
          year: '1986',
          score: 0.8,
          identifiedAt: Date.UTC(2026, 0, 3),
        },
      ]
      for (const s of [...samples].reverse()) this.history = await addToHistory(s)
      this.match = samples[0]
      this.glassesScreen = 'result'
      await showResult(samples[0])
    },

    async onSaveSettings(next: Settings) {
      this.settings = next
      await saveSettings(next)
    },

    async onClearHistory() {
      await clearHistory()
      this.history = []
    },

    async onExportHistory() {
      const result = await exportHistory(this.history)
      if (result === 'copied')
        window.alert('History copied to the clipboard as JSON. Paste it into a file to save it, then use Import to restore.')
      else if (result === 'failed') window.alert('Could not export the history.')
    },

    async onImportHistory(text: string) {
      try {
        const items = parseImport(text)
        this.history = await importHistory(items)
      } catch (err) {
        window.alert(`Import failed: ${(err as Error).message}`)
      }
    },

    async onUnlockDebug() {
      this.debugUnlocked = true
      const bridge = await getBridge()
      await bridge.setLocalStorage(DEBUG_UNLOCK_KEY, 'true')
      // Reveal it: close the modal and drop the user on Settings.
      this.showWhatsNew = false
      this.view = 'settings'
    },
  },
})
</script>

<style lang="scss" scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border);
}

.tabs {
  display: flex;
  gap: var(--space-2);
}

.tab {
  padding: var(--space-2) var(--space-4);
  border: none;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--text-muted);
  font-size: 17px;
  font-weight: 700;

  &--active {
    background: color-mix(in srgb, var(--brand-color) 22%, var(--bg));
    color: var(--brand-color);
  }
}

.topbar__right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.topbar__ver {
  font-size: 14px;
  color: var(--text-muted);
}

.topbar__help {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 50%;
  background: var(--surface-2);
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 700;
}

.app__main {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
</style>
