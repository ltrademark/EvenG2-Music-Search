<template>
  <div class="entry" :class="{ 'entry--open': expanded }">
    <button class="entry__head" @click="$emit('toggle')">
      <img
        v-if="expanded && art && !artFailed"
        class="entry__art"
        :src="art"
        alt=""
        @error="artFailed = true"
      />
      <span v-else-if="expanded" class="entry__art entry__art--empty">♪</span>

      <span class="entry__text">
        <span class="entry__title">{{ entry.title }}</span>
        <span class="entry__artist">{{ entry.artist }}</span>
        <span v-if="expanded && albumLine" class="entry__album">{{ albumLine }}</span>
      </span>

      <img
        class="entry__chevron"
        :class="{ 'entry__chevron--open': expanded }"
        :src="chevron"
        alt=""
      />
    </button>

    <div v-if="expanded" class="entry__detail">
      <ServiceLinks :entry="entry" />
      <div v-if="date" class="entry__date">Identified on {{ date }}</div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import ServiceLinks from './ServiceLinks.vue'
import { formatDate } from '../lib/format'
import type { TrackMatch } from '../lib/types'
import chevron from '../assets/img/icon_chevron.svg'

export default defineComponent({
  name: 'HistoryEntry',
  components: { ServiceLinks },
  props: {
    entry: { type: Object as PropType<TrackMatch>, required: true },
    expanded: { type: Boolean, default: false },
  },
  emits: ['toggle'],
  data() {
    return { chevron, artFailed: false }
  },
  computed: {
    art(): string | undefined {
      return this.entry.coverArtData || this.entry.coverArtUrl
    },
    albumLine(): string {
      if (!this.entry.album) return ''
      return this.entry.year ? `${this.entry.album} (${this.entry.year})` : this.entry.album
    },
    date(): string {
      return formatDate(this.entry.identifiedAt)
    },
  },
  watch: {
    art() {
      this.artFailed = false
    },
  },
})
</script>

<style lang="scss" scoped>
.entry {
  border-bottom: 1px solid var(--border);
}

.entry__head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-4) var(--space-4);
  border: none;
  background: transparent;
  color: var(--text);
  text-align: left;
}

.entry__art {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  background: var(--surface-2);
}

.entry__art--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  color: var(--text-muted);
}

.entry__text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.entry__title {
  font-size: 17px;
  font-weight: 700;
  word-break: break-word;
}

.entry__artist {
  font-size: 14px;
  color: var(--text-muted);
  word-break: break-word;
}

.entry__album {
  margin-top: var(--space-1);
  font-size: 13px;
  font-style: italic;
  color: var(--text-muted);
}

.entry__chevron {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  opacity: 0.7;
  transition: transform 0.2s ease;
}

.entry__chevron--open {
  transform: rotate(180deg);
}

.entry__detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: 0 var(--space-4) var(--space-4);
}

.entry__date {
  text-align: right;
  font-size: 12px;
  font-style: italic;
  color: var(--text-muted);
}
</style>
