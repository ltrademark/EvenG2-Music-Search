<template>
  <section class="history">
    <div v-if="!history.length" class="history__empty">
      <img class="history__empty-icon" :src="emptyIcon" alt="" />
      <h2 class="history__empty-title">No Songs Identified Yet</h2>
      <p class="history__empty-hint">Use your glasses to find songs around you</p>
    </div>

    <template v-else>
      <ul class="history__list">
        <li v-for="item in history" :key="item.acoustId">
          <HistoryEntry
            :entry="item"
            :expanded="expandedId === item.acoustId"
            @toggle="toggle(item.acoustId)"
          />
        </li>
      </ul>

      <div v-if="history.length > 1" class="history__controls">
        <button class="history__btn" @click="$emit('export')">Export List</button>
        <button class="history__btn" @click="pickFile">Import List</button>
        <button class="history__btn history__btn--danger" @click="$emit('clear')">Clear all</button>
      </div>
    </template>

    <input
      ref="file"
      class="history__file"
      type="file"
      accept="application/json,.json"
      @change="onFile"
    />
  </section>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import HistoryEntry from '../components/HistoryEntry.vue'
import type { TrackMatch } from '../lib/types'
import emptyIcon from '../assets/img/icon_nosong.svg'

export default defineComponent({
  name: 'HistoryView',
  components: { HistoryEntry },
  props: {
    history: { type: Array as PropType<TrackMatch[]>, default: () => [] },
  },
  emits: ['export', 'import', 'clear'],
  data() {
    return { emptyIcon, expandedId: null as string | null }
  },
  methods: {
    toggle(id: string) {
      this.expandedId = this.expandedId === id ? null : id
    },
    pickFile() {
      ;(this.$refs.file as HTMLInputElement).click()
    },
    async onFile(e: Event) {
      const input = e.target as HTMLInputElement
      const file = input.files?.[0]
      if (!file) return
      const text = await file.text()
      input.value = '' // allow re-importing the same file
      this.$emit('import', text)
    },
  },
})
</script>

<style lang="scss" scoped>
.history {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.history__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.history__controls {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-4);
}

.history__btn {
  flex: 1;
  padding: var(--space-3) var(--space-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--text);
  font-size: 14px;

  &--danger {
    color: var(--danger);
    border-color: color-mix(in srgb, var(--danger) 50%, transparent);
  }
}

.history__file {
  display: none;
}

.history__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--space-6);
  gap: var(--space-2);
}

.history__empty-icon {
  width: 96px;
  height: 96px;
  margin-bottom: var(--space-3);
  opacity: 0.9;
}

.history__empty-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.history__empty-hint {
  margin: 0;
  font-size: 14px;
  color: var(--text-muted);
}
</style>
