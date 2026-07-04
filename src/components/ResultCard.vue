<template>
  <div class="card">
    <img v-if="match.coverArtUrl" class="card__art" :src="match.coverArtUrl" alt="" @error="artFailed = true" v-show="!artFailed" />
    <div class="card__title">{{ match.title }}</div>
    <div class="card__artist">{{ match.artist }}</div>
    <div v-if="albumLine" class="card__album">{{ albumLine }}</div>
    <div class="card__meta">
      <span class="card__score">{{ scorePct }}% match</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import type { TrackMatch } from '../lib/types'

export default defineComponent({
  name: 'ResultCard',
  props: {
    match: { type: Object as PropType<TrackMatch>, required: true },
  },
  data() {
    return { artFailed: false }
  },
  computed: {
    scorePct(): number {
      return Math.round((this.match.score ?? 0) * 100)
    },
    albumLine(): string {
      if (!this.match.album) return this.match.year ? `(${this.match.year})` : ''
      return this.match.year ? `${this.match.album} (${this.match.year})` : this.match.album
    },
  },
  watch: {
    'match.coverArtUrl'() {
      this.artFailed = false
    },
  },
})
</script>

<style lang="scss" scoped>
.card {
  width: 100%;
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  background: var(--surface);
  border: 1px solid var(--border);
  text-align: center;
}

.card__art {
  width: 130px;
  height: 130px;
  object-fit: cover;
  border-radius: var(--radius-md);
  margin-bottom: var(--space-4);
}

.card__title {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.3;
  word-break: break-word;
}

.card__artist {
  margin-top: var(--space-2);
  font-size: 16px;
  color: var(--brand-color);
}

.card__album {
  margin-top: var(--space-1);
  font-size: 13px;
  color: var(--text-muted);
}

.card__meta {
  margin-top: var(--space-4);
}

.card__score {
  display: inline-block;
  padding: 2px var(--space-3);
  border-radius: var(--radius-pill);
  background: var(--surface-2);
  color: var(--text-muted);
  font-size: 12px;
}
</style>
