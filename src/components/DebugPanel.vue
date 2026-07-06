<template>
  <section class="dbg" :class="{ 'dbg--open': open }">
    <header class="dbg__head">
      <span class="dbg__title">
        <img class="dbg__bug" :src="bug" alt="" />
        Debug
      </span>
      <button v-if="entries.length" class="dbg__clear" @click="$emit('clear')">Clear</button>
      <button class="dbg__toggle" :aria-label="open ? 'Collapse' : 'Expand'" @click="open = !open">
        <img class="dbg__chevron" :class="{ 'dbg__chevron--open': open }" :src="chevron" alt="" />
      </button>
    </header>

    <template v-if="open">
      <p class="dbg__hint">
        Pipeline trace of each search. Peak is the loudest sample (0–32767): near 0 means the mic
        captured silence. A healthy capture is usually in the thousands.
      </p>

      <div class="dbg__term">
        <div v-if="!entries.length" class="dbg__empty">Run a search to see the trace here.</div>
        <div v-for="(e, i) in entries" :key="i" class="dbg__entry">
          <div class="dbg__line" :class="`dbg__line--${kind(e)}`">
            <span class="dbg__icon">{{ icon(e) }}</span>{{ e.label }}
          </div>
          <div v-if="e.detail" class="dbg__line dbg__line--detail">&gt; {{ e.detail }}</div>
        </div>
      </div>
    </template>
  </section>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import type { DebugEntry } from '../lib/types'
import bug from '../assets/img/bug.svg'
import chevron from '../assets/img/icon_chevron.svg'

type Kind = 'ok' | 'bad' | 'mic' | 'step'

export default defineComponent({
  name: 'DebugPanel',
  props: {
    entries: { type: Array as PropType<DebugEntry[]>, default: () => [] },
  },
  emits: ['clear'],
  data() {
    return { bug, chevron, open: false }
  },
  methods: {
    kind(e: DebugEntry): Kind {
      if (e.ok === false) return 'bad'
      if (e.label.startsWith('Mic')) return 'mic'
      if (e.ok === true) return 'ok'
      return 'step'
    },
    icon(e: DebugEntry): string {
      return { ok: '✓ ', bad: '✗ ', mic: '♪ ', step: '' }[this.kind(e)]
    },
  },
})
</script>

<style lang="scss" scoped>
.dbg {
  display: flex;
  flex-direction: column;
  padding: var(--space-5) var(--space-4);
}

.dbg--open {
  flex: 1;
  min-height: 0;
}

.dbg__head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.dbg__title {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 17px;
  font-weight: 700;
}

.dbg__bug {
  width: 22px;
  height: 22px;
}

.dbg__clear {
  border: 1px solid color-mix(in srgb, var(--danger) 50%, transparent);
  background: color-mix(in srgb, var(--danger) 12%, transparent);
  color: var(--danger);
  font-size: 13px;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-pill);
}

.dbg__toggle {
  border: none;
  background: transparent;
  padding: 0;
  display: flex;
}

.dbg__chevron {
  width: 20px;
  height: 20px;
  opacity: 0.7;
  transition: transform 0.2s ease;
}

.dbg__chevron--open {
  transform: rotate(180deg);
}

.dbg__hint {
  margin: var(--space-4) 0;
  font-size: 12px;
  color: var(--text-muted);
}

.dbg__term {
  flex: 1;
  min-height: 180px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background-color: #0a0d13;
  background-image: radial-gradient(var(--border) 1px, transparent 1px);
  background-size: 22px 22px;
  font-size: 13px;
  line-height: 1.5;
}

.dbg__empty {
  color: var(--text-muted);
}

.dbg__line {
  word-break: break-word;
  white-space: pre-wrap;
}

.dbg__icon {
  white-space: pre;
}

.dbg__line--ok {
  color: var(--success);
}
.dbg__line--bad {
  color: var(--danger);
}
.dbg__line--mic {
  color: #e6c34a;
}
.dbg__line--step {
  color: var(--text);
}
.dbg__line--detail {
  color: var(--text-muted);
}
</style>
