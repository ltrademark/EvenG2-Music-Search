<template>
  <div class="app">
    <header class="app__bar">
      <h1 class="app__brand">Music ID</h1>
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
import { lookupFingerprint } from './lib/api/acoustid'
import { loadSettings, saveSettings, DEFAULT_SETTINGS, type Settings } from './lib/storage/settings'
import { loadHistory, addToHistory, clearHistory } from './lib/storage/history'
import {
  initGlasses,
  setGlassesText,
  glassesIdle,
  glassesListening,
  glassesIdentifying,
  glassesResult,
  glassesNoMatch,
  glassesError,
} from './lib/glasses/screens'
import type { AppPhase, PhoneView, TrackMatch } from './lib/types'

interface Data {
  view: PhoneView
  phase: AppPhase
  remaining: number
  match: TrackMatch | null
  errorMessage: string
  history: TrackMatch[]
  settings: Settings
  captureAbort: AbortController | null
  unsubscribe: (() => void) | null
  lastGlassesSecond: number
}

export default defineComponent({
  name: 'App',
  components: { IdentifyView, HistoryView, SettingsView },
  data(): Data {
    return {
      view: 'identify',
      phase: 'idle',
      remaining: 0,
      match: null,
      errorMessage: '',
      history: [],
      settings: { ...DEFAULT_SETTINGS },
      captureAbort: null,
      unsubscribe: null,
      lastGlassesSecond: -1,
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

    await initGlasses(glassesIdle())
    const bridge = await getBridge()
    this.unsubscribe = bridge.onEvenHubEvent(this.onGlassesEvent)
  },
  beforeUnmount() {
    this.captureAbort?.abort()
    this.unsubscribe?.()
  },
  methods: {
    /** Run the full listen → fingerprint → lookup pipeline. */
    async identify() {
      if (this.busy) return
      this.match = null
      this.errorMessage = ''
      this.view = 'identify'

      try {
        this.setPhase('listening')
        this.captureAbort = new AbortController()
        const audio = await captureAudio({
          durationSec: this.settings.captureSeconds,
          source: this.settings.micSource,
          signal: this.captureAbort.signal,
          onProgress: (_elapsed, remaining) => this.onListenProgress(remaining),
        })

        this.setPhase('identifying')
        const fingerprint = await computeFingerprint(audio)
        const match = await lookupFingerprint(fingerprint, this.settings.acoustIdKey)

        if (match) {
          match.identifiedAt = Date.now()
          this.match = match
          this.history = await addToHistory(match)
          this.setPhase('result')
        } else {
          this.setPhase('nomatch')
        }
      } catch (err) {
        this.errorMessage = (err as Error).message || 'Identification failed.'
        this.setPhase('error')
      } finally {
        this.captureAbort = null
      }
    },

    onListenProgress(remaining: number) {
      this.remaining = remaining
      // Mirror to glasses only when the whole-second countdown changes.
      const second = Math.ceil(remaining)
      if (second !== this.lastGlassesSecond) {
        this.lastGlassesSecond = second
        void setGlassesText(glassesListening(remaining))
      }
    },

    /** Update pipeline phase and mirror the matching screen to the glasses. */
    setPhase(phase: AppPhase) {
      this.phase = phase
      switch (phase) {
        case 'listening':
          this.lastGlassesSecond = -1
          void setGlassesText(glassesListening(this.settings.captureSeconds))
          break
        case 'identifying':
          void setGlassesText(glassesIdentifying())
          break
        case 'result':
          if (this.match) void setGlassesText(glassesResult(this.match))
          break
        case 'nomatch':
          void setGlassesText(glassesNoMatch())
          break
        case 'error':
          void setGlassesText(glassesError(this.errorMessage))
          break
        default:
          void setGlassesText(glassesIdle())
      }
    },

    onGlassesEvent(event: EvenHubEvent) {
      const sys = event.sysEvent
      if (!sys) return

      // Protobuf zero-values arrive as undefined, so treat that as a click.
      const type = sys.eventType ?? OsEventTypeList.CLICK_EVENT

      switch (type) {
        case OsEventTypeList.CLICK_EVENT:
          if (!this.busy) void this.identify()
          break
        case OsEventTypeList.DOUBLE_CLICK_EVENT:
        case OsEventTypeList.SYSTEM_EXIT_EVENT:
          void this.exit()
          break
        case OsEventTypeList.FOREGROUND_EXIT_EVENT:
        case OsEventTypeList.ABNORMAL_EXIT_EVENT:
          // Backgrounded mid-capture: stop the mic so it doesn't keep listening.
          this.captureAbort?.abort()
          break
      }
    },

    async exit() {
      const bridge = await getBridge()
      await bridge.shutDownPageContainer(1)
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
