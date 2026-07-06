<template>
  <div class="links">
    <template v-for="link in links" :key="link.key">
      <!-- Opens in a new context. -->
      <a
        v-if="link.mode === 'open'"
        class="links__btn"
        :href="link.href"
        :title="link.label"
        :aria-label="link.label"
        target="_blank"
        rel="noopener noreferrer"
        @click.stop
      >
        <img class="links__icon" :src="link.icon" alt="" />
      </a>
      <!-- Copies its link instead (e.g. Spotify won't open from the webview). -->
      <button
        v-else
        class="links__btn"
        :class="{ 'links__btn--copied': copiedKey === link.key }"
        :title="link.label"
        :aria-label="link.label"
        @click.stop="copy(link)"
      >
        <span v-if="copiedKey === link.key" class="links__check">✓</span>
        <img v-else class="links__icon" :src="link.icon" alt="" />
      </button>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import { serviceLinks, type ServiceLink } from '../lib/links'
import type { TrackMatch } from '../lib/types'

export default defineComponent({
  name: 'ServiceLinks',
  props: {
    entry: { type: Object as PropType<TrackMatch>, required: true },
  },
  data() {
    return { copiedKey: null as string | null, timer: 0 }
  },
  computed: {
    links(): ServiceLink[] {
      return serviceLinks(this.entry)
    },
  },
  beforeUnmount() {
    clearTimeout(this.timer)
  },
  methods: {
    async copy(link: ServiceLink) {
      try {
        await navigator.clipboard.writeText(link.href)
        this.copiedKey = link.key
        clearTimeout(this.timer)
        this.timer = window.setTimeout(() => (this.copiedKey = null), 1500)
      } catch {
        window.prompt('Copy this link:', link.href)
      }
    },
  },
})
</script>

<style lang="scss" scoped>
.links {
  display: flex;
  gap: var(--space-3);
}

.links__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border-radius: var(--radius-pill);
  background: var(--surface-2);
  border: 1px solid var(--border);
  transition: background 0.15s ease;

  &:active {
    background: var(--border);
  }

  &--copied {
    background: color-mix(in srgb, var(--success) 22%, var(--bg));
    border-color: var(--success);
  }
}

.links__icon {
  width: 22px;
  height: 22px;
  display: block;
}

.links__check {
  color: var(--success);
  font-size: 18px;
  font-weight: 700;
}
</style>
