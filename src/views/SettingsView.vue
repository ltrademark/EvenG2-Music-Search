<template>
  <section class="settings">
    <div class="settings__scroll">
      <div class="row">
        <div class="row__line">
          <span class="row__label">Listening Duration</span>
          <span class="row__value">{{ form.captureSeconds }}s</span>
        </div>
        <input
          v-model.number="form.captureSeconds"
          class="row__range"
          type="range"
          min="5"
          max="20"
          step="1"
        />
      </div>

      <div class="row row--inline">
        <span class="row__label">Microphone</span>
        <div class="seg">
          <button
            class="seg__opt"
            :class="{ 'seg__opt--active': form.micSource === sources.Glasses }"
            @click="form.micSource = sources.Glasses"
          >
            G2
          </button>
          <button
            class="seg__opt"
            :class="{ 'seg__opt--active': form.micSource === sources.Phone }"
            @click="form.micSource = sources.Phone"
          >
            Phone
          </button>
        </div>
      </div>

      <div class="row row--inline">
        <span class="row__label">Auto-Listen on Open</span>
        <button
          class="switch"
          :class="{ 'switch--on': form.autoListen }"
          role="switch"
          :aria-checked="form.autoListen"
          @click="form.autoListen = !form.autoListen"
        >
          <span class="switch__knob" />
        </button>
      </div>

      <DebugPanel v-if="debugUnlocked" :entries="debug" @clear="$emit('clear-debug')" />
    </div>

    <button class="settings__save" @click="save">
      {{ saved ? 'Saved' : 'Save Settings' }}
    </button>
  </section>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import { AudioInputSource } from '@evenrealities/even_hub_sdk'
import DebugPanel from '../components/DebugPanel.vue'
import type { Settings } from '../lib/storage/settings'
import type { DebugEntry } from '../lib/types'

export default defineComponent({
  name: 'SettingsView',
  components: { DebugPanel },
  props: {
    settings: { type: Object as PropType<Settings>, required: true },
    debug: { type: Array as PropType<DebugEntry[]>, default: () => [] },
    debugUnlocked: { type: Boolean, default: false },
  },
  emits: ['save', 'clear-debug'],
  data() {
    return {
      form: { ...this.settings } as Settings,
      sources: AudioInputSource,
      saved: false,
    }
  },
  watch: {
    settings: {
      deep: true,
      handler(next: Settings) {
        this.form = { ...next }
      },
    },
  },
  methods: {
    save() {
      this.$emit('save', { ...this.form })
      this.saved = true
      setTimeout(() => (this.saved = false), 1500)
    },
  },
})
</script>

<style lang="scss" scoped>
.settings {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.settings__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.row {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-5) var(--space-4);
  border-bottom: 1px solid var(--border);
}

.row--inline {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.row__line {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.row__label {
  font-size: 17px;
  font-weight: 700;
}

.row__value {
  font-size: 16px;
  color: var(--text);
}

.row__range {
  width: 100%;
  accent-color: var(--brand-color);
}

// Segmented G2 / Phone control
.seg {
  display: flex;
  padding: 3px;
  border-radius: var(--radius-pill);
  background: var(--surface-2);
}

.seg__opt {
  padding: var(--space-2) var(--space-4);
  border: none;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--text-muted);
  font-size: 15px;
  font-weight: 700;

  &--active {
    background: color-mix(in srgb, var(--brand-color) 22%, var(--bg));
    color: var(--brand-color);
  }
}

// Toggle switch
.switch {
  position: relative;
  width: 52px;
  height: 30px;
  padding: 0;
  border: none;
  border-radius: var(--radius-pill);
  background: var(--surface-2);
  transition: background 0.18s ease;

  &--on {
    background: var(--brand-color);
  }
}

.switch__knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.18s ease;

  .switch--on & {
    transform: translateX(22px);
  }
}

.settings__save {
  flex-shrink: 0;
  margin: var(--space-4);
  padding: var(--space-4);
  border-radius: var(--radius-pill);
  border: none;
  background: var(--brand-color);
  color: var(--brand-color-ink);
  font-size: 16px;
  font-weight: 700;
}
</style>
