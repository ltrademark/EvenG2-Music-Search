<template>
  <div class="links">
    <a
      v-for="link in links"
      :key="link.key"
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
  computed: {
    links(): ServiceLink[] {
      return serviceLinks(this.entry)
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
  border-radius: var(--radius-pill);
  background: var(--surface-2);
  border: 1px solid var(--border);
  transition: background 0.15s ease;

  &:active {
    background: var(--border);
  }
}

.links__icon {
  width: 22px;
  height: 22px;
  display: block;
}
</style>
