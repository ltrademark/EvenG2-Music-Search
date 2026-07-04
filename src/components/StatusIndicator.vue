<template>
  <div class="status" :class="`status--${phase}`">
    <span class="status__dot" />
    <span class="status__label">{{ label }}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import type { AppPhase } from '../lib/types'

export default defineComponent({
  name: 'StatusIndicator',
  props: {
    phase: { type: String as PropType<AppPhase>, required: true },
    remaining: { type: Number, default: 0 },
  },
  computed: {
    label(): string {
      switch (this.phase) {
        case 'listening':
          return `Listening... ${Math.ceil(this.remaining)}s`
        case 'identifying':
          return 'Identifying...'
        case 'result':
          return 'Match found'
        case 'nomatch':
          return 'No match'
        case 'error':
          return 'Something went wrong'
        default:
          return 'Ready'
      }
    },
  },
})
</script>

<style lang="scss" scoped>
.status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-pill);
  background: var(--surface-2);
  color: var(--text-muted);
  font-size: 13px;
}

.status__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
}

.status--listening .status__dot,
.status--identifying .status__dot {
  background: var(--brand-color);
  animation: pulse 1s ease-in-out infinite;
}

.status--result {
  color: var(--success);
  .status__dot {
    background: var(--success);
  }
}

.status--error {
  color: var(--danger);
  .status__dot {
    background: var(--danger);
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}
</style>
