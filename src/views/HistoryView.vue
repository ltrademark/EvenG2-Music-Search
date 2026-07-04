<template>
  <section class="history">
    <header class="history__head">
      <h2 class="history__title">History</h2>
      <button v-if="history.length" class="history__clear" @click="$emit('clear')">Clear</button>
    </header>

    <p v-if="!history.length" class="history__empty">
      Songs you identify will show up here.
    </p>

    <ul v-else class="history__list">
      <li v-for="item in history" :key="item.acoustId" class="history__item">
        <div class="history__song">{{ item.title }}</div>
        <div class="history__artist">{{ item.artist }}</div>
      </li>
    </ul>
  </section>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import type { TrackMatch } from '../lib/types'

export default defineComponent({
  name: 'HistoryView',
  props: {
    history: { type: Array as PropType<TrackMatch[]>, default: () => [] },
  },
  emits: ['clear'],
})
</script>

<style lang="scss" scoped>
.history {
  padding: var(--space-5) var(--space-4);
}

.history__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.history__title {
  margin: 0;
  font-size: 18px;
}

.history__clear {
  border: none;
  background: transparent;
  color: var(--danger);
  font-size: 13px;
}

.history__empty {
  color: var(--text-muted);
  font-size: 14px;
}

.history__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.history__item {
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--surface);
  border: 1px solid var(--border);
}

.history__song {
  font-weight: 700;
  word-break: break-word;
}

.history__artist {
  margin-top: 2px;
  font-size: 13px;
  color: var(--brand-color);
}
</style>
