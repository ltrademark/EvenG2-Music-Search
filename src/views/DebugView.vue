<template>
  <section class="debug">
    <header class="debug__head">
      <h2 class="debug__title">Debug</h2>
      <button v-if="entries.length" class="debug__clear" @click="$emit('clear')">Clear</button>
    </header>

    <p class="debug__hint">
      Pipeline trace of each search. <strong>peak</strong> is the loudest sample (0–32767):
      near 0 means the mic captured silence; a healthy capture is usually in the thousands.
    </p>

    <p v-if="!entries.length" class="debug__empty">
      Run a search to see the mic, fingerprint, and AcoustID steps here.
    </p>

    <ul v-else class="debug__list">
      <li
        v-for="(e, i) in entries"
        :key="i"
        class="debug__item"
        :class="{ 'debug__item--ok': e.ok === true, 'debug__item--bad': e.ok === false }"
      >
        <div class="debug__row">
          <span class="debug__dot" />
          <span class="debug__label">{{ e.label }}</span>
          <span class="debug__time">{{ fmt(e.time) }}</span>
        </div>
        <div v-if="e.detail" class="debug__detail">{{ e.detail }}</div>
      </li>
    </ul>
  </section>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import type { DebugEntry } from '../lib/types'

export default defineComponent({
  name: 'DebugView',
  props: {
    entries: { type: Array as PropType<DebugEntry[]>, default: () => [] },
  },
  emits: ['clear'],
  methods: {
    fmt(ms: number): string {
      const d = new Date(ms)
      const p = (n: number) => String(n).padStart(2, '0')
      return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
    },
  },
})
</script>

<style lang="scss" scoped>
.debug {
  padding: var(--space-5) var(--space-4);
}

.debug__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}

.debug__title {
  margin: 0;
  font-size: 18px;
}

.debug__clear {
  border: none;
  background: transparent;
  color: var(--danger);
  font-size: 13px;
}

.debug__hint {
  margin: 0 0 var(--space-4);
  font-size: 12px;
  color: var(--text-muted);
}

.debug__empty {
  color: var(--text-muted);
  font-size: 14px;
}

.debug__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.debug__item {
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--surface);
  border: 1px solid var(--border);
  border-left: 3px solid var(--text-muted);

  &--ok {
    border-left-color: var(--success);
  }
  &--bad {
    border-left-color: var(--danger);
  }
}

.debug__row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.debug__dot {
  display: none;
}

.debug__label {
  flex: 1;
  font-size: 13px;
  font-weight: 700;
  word-break: break-word;
}

.debug__time {
  font-size: 11px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.debug__detail {
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-muted);
  word-break: break-word;
}
</style>
