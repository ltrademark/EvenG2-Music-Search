<template>
  <section class="settings">
    <h2 class="settings__title">Settings</h2>

    <label class="field">
      <span class="field__label">AcoustID API key</span>
      <input
        v-model.trim="form.acoustIdKey"
        class="field__input"
        type="text"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        placeholder="Paste your AcoustID application key"
      />
      <span class="field__help">
        Free key from acoustid.org/new-application. Stored only on this device.
      </span>
    </label>

    <label class="field">
      <span class="field__label">Listen duration: {{ form.captureSeconds }}s</span>
      <input
        v-model.number="form.captureSeconds"
        class="field__range"
        type="range"
        min="5"
        max="20"
        step="1"
      />
    </label>

    <div class="field">
      <span class="field__label">Microphone</span>
      <div class="toggle">
        <button
          class="toggle__option"
          :class="{ 'toggle__option--active': form.micSource === sources.Glasses }"
          @click="form.micSource = sources.Glasses"
        >
          Glasses
        </button>
        <button
          class="toggle__option"
          :class="{ 'toggle__option--active': form.micSource === sources.Phone }"
          @click="form.micSource = sources.Phone"
        >
          Phone
        </button>
      </div>
    </div>

    <button class="settings__save" :disabled="!dirty" @click="save">
      {{ saved ? 'Saved' : 'Save' }}
    </button>
  </section>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import { AudioInputSource } from '@evenrealities/even_hub_sdk'
import type { Settings } from '../lib/storage/settings'

export default defineComponent({
  name: 'SettingsView',
  props: {
    settings: { type: Object as PropType<Settings>, required: true },
  },
  emits: ['save'],
  data() {
    return {
      form: { ...this.settings } as Settings,
      sources: AudioInputSource,
      saved: false,
    }
  },
  computed: {
    dirty(): boolean {
      return (
        this.form.acoustIdKey !== this.settings.acoustIdKey ||
        this.form.captureSeconds !== this.settings.captureSeconds ||
        this.form.micSource !== this.settings.micSource
      )
    },
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
  padding: var(--space-5) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.settings__title {
  margin: 0;
  font-size: 18px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.field__label {
  font-size: 14px;
  font-weight: 700;
}

.field__input {
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-family: inherit;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: var(--brand-color);
  }
}

.field__range {
  width: 100%;
  accent-color: var(--brand-color);
}

.field__help {
  font-size: 12px;
  color: var(--text-muted);
}

.toggle {
  display: flex;
  gap: var(--space-2);
}

.toggle__option {
  flex: 1;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);

  &--active {
    border-color: var(--brand-color);
    background: var(--brand-color);
    color: var(--brand-color-ink);
  }
}

.settings__save {
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border: none;
  background: var(--brand-color);
  color: var(--brand-color-ink);
  font-size: 15px;
  font-weight: 700;

  &:disabled {
    background: var(--surface-2);
    color: var(--text-muted);
  }
}
</style>
