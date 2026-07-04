<template>
  <div class="app">
    <header class="app__bar">
      <h1 class="app__brand">MUSE</h1>
    </header>

    <p v-if="needsKey" class="app__banner" @click="view = 'settings'">
      Add your free AcoustID key in Settings to start identifying →
    </p>

    <main class="app__main">
      <IdentifyView
        v-if="view === 'identify'"
        :phase="phase"
        :remaining="remaining"
        :match="match"
        :error-message="errorMessage"
        @identify="identify"
      />
      <HistoryView v-else-if="view === 'history'" :history="history" @clear="onClearHistory" />
      <SettingsView v-else :settings="settings" @save="onSaveSettings" />
    </main>

    <nav class="app__nav">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="app__tab"
        :class="{ 'app__tab--active': view === tab.id }"
        @click="view = tab.id"
      >
        {{ tab.label }}
      </button>
    </nav>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { OsEventTypeList, type EvenHubEvent } from '@evenrealities/even_hub_sdk'
import IdentifyView from './views/IdentifyView.vue'
import HistoryView from './views/HistoryView.vue'
import SettingsView from './views/SettingsView.vue'
import { getBridge } from './lib/bridge'
import { captureAudio } from './lib/audio/capture'
import { computeFingerprint } from './lib/audio/fingerprint'
import { lookupFingerprint, coverArtUrl } from './lib/api/acoustid'
import { fetchYear } from './lib/api/musicbrainz'
import { loadSettings, saveSettings, DEFAULT_SETTINGS, type Settings } from './lib/storage/settings'
import { loadHistory, addToHistory, clearHistory } from './lib/storage/history'
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
import type { AppPhase, GlassesScreen, PhoneView, TrackMatch } from './lib/types'

const SPLASH_MS = 2000

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
}

export default defineComponent({
  name: 'App',
  components: { IdentifyView, HistoryView, SettingsView },
  data(): Data {
    return {
      view: 'identify',
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
    }
  },
  computed: {
    busy(): boolean {
      return this.phase === 'listening' || this.phase === 'identifying'
    },
    needsKey(): boolean {
      return !this.settings.acoustIdKey
    },
    tabs(): { id: PhoneView; label: string }[] {
      return [
        { id: 'identify', label: 'Identify' },
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
    setTimeout(() => void this.gotoMenu(), SPLASH_MS)
  },
  beforeUnmount() {
    this.captureAbort?.abort()
    stopWave()
    this.unsubscribe?.()
  },
  methods: {
    /** Run the full listen → fingerprint → lookup pipeline (drives both surfaces). */
    async identify() {
      if (this.busy) return
      this.match = null
      this.errorMessage = ''
      this.view = 'identify'
      this.searchCancelled = false

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
        if (this.searchCancelled) return

        stopWave()
        this.phase = 'identifying'
        await setListeningStatus('Searching...')

        const fingerprint = await computeFingerprint(audio)
        const match = await lookupFingerprint(fingerprint, this.settings.acoustIdKey)

        if (match) {
          if (match.releaseGroupId) match.year = await fetchYear(match.releaseGroupId)
          match.identifiedAt = Date.now()
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
        this.phase = 'error'
        this.glassesScreen = 'nomatch'
        await showNoMatch(this.errorMessage)
      } finally {
        this.captureAbort = null
      }
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
          title: "It's Been a Long Time",
          artist: 'Rakim',
          album: 'The 18th Letter',
          year: '1997',
          coverArtUrl: coverArtUrl('1b022e01-4da6-387b-8658-8678046e4cef'),
          score: 0.94,
          identifiedAt: Date.UTC(2026, 4, 12),
        },
        {
          acoustId: 'demo-2',
          title: 'The Jawn',
          artist: 'Jerri',
          album: 'The Jawn',
          year: '2026',
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
  },
})
</script>

<style lang="scss" scoped>
.app {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.app__bar {
  padding: var(--space-4);
  text-align: center;
  border-bottom: 1px solid var(--border);
}

.app__brand {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.app__banner {
  margin: 0;
  padding: var(--space-3) var(--space-4);
  background: color-mix(in srgb, var(--brand-color) 18%, var(--bg));
  color: var(--text);
  font-size: 13px;
  text-align: center;
  cursor: pointer;
}

.app__main {
  flex: 1;
  overflow-y: auto;
}

.app__nav {
  display: flex;
  border-top: 1px solid var(--border);
  background: var(--surface);
}

.app__tab {
  flex: 1;
  padding: var(--space-4) 0;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 13px;

  &--active {
    color: var(--brand-color);
    box-shadow: inset 0 2px 0 var(--brand-color);
  }
}
</style>
