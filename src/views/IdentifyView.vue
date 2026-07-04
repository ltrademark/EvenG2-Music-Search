<template>
  <section class="identify">
    <button
      class="identify__button"
      :class="{ 'identify__button--busy': busy }"
      :disabled="busy"
      @click="$emit('identify')"
    >
      <span v-if="busy" class="identify__ring" />
      <span class="identify__glyph">{{ busy ? '' : '♪' }}</span>
    </button>

    <StatusIndicator :phase="phase" :remaining="remaining" />

    <ResultCard v-if="phase === 'result' && match" :match="match" />

    <p v-else-if="phase === 'nomatch'" class="identify__hint">
      No match found. Try again with the music a little louder or closer.
    </p>

    <p v-else-if="phase === 'error'" class="identify__error">
      {{ errorMessage }}
    </p>

    <p v-else-if="phase === 'idle'" class="identify__hint">
      Tap to listen and identify the music playing around you.
    </p>
  </section>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import StatusIndicator from '../components/StatusIndicator.vue'
import ResultCard from '../components/ResultCard.vue'
import type { AppPhase, TrackMatch } from '../lib/types'

export default defineComponent({
  name: 'IdentifyView',
  components: { StatusIndicator, ResultCard },
  props: {
    phase: { type: String as PropType<AppPhase>, required: true },
    remaining: { type: Number, default: 0 },
    match: { type: Object as PropType<TrackMatch | null>, default: null },
    errorMessage: { type: String, default: '' },
  },
  emits: ['identify'],
  computed: {
    busy(): boolean {
      return this.phase === 'listening' || this.phase === 'identifying'
    },
  },
})
</script>

<style lang="scss" scoped>
.identify {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-5);
  padding: var(--space-6) var(--space-4);
}

.identify__button {
  position: relative;
  width: 160px;
  height: 160px;
  border-radius: 50%;
  border: none;
  background: var(--brand-color);
  color: var(--brand-color-ink);
  box-shadow: 0 8px 30px rgba(17, 85, 238, 0.4);
  transition: transform 0.1s ease, background 0.2s ease;

  &:hover:not(:disabled) {
    background: var(--brand-color-hover);
  }
  &:active:not(:disabled) {
    transform: scale(0.96);
  }
  &--busy {
    background: var(--surface-2);
    cursor: default;
  }
}

.identify__glyph {
  font-size: 56px;
  line-height: 1;
}

.identify__ring {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 4px solid var(--border);
  border-top-color: var(--brand-color);
  animation: spin 0.9s linear infinite;
}

.identify__hint {
  max-width: 280px;
  text-align: center;
  color: var(--text-muted);
  font-size: 14px;
}

.identify__error {
  max-width: 280px;
  text-align: center;
  color: var(--danger);
  font-size: 14px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
