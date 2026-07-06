<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="card" role="dialog" aria-modal="true">
      <header class="card__head">
        <button class="card__close" aria-label="Close" @click="$emit('close')">✕</button>
        <img class="card__icon" :src="appIcon" alt="" @click="onLogoTap" />
        <h2 class="card__name">{{ name }}</h2>
        <p class="card__desc">{{ description }}</p>
      </header>

      <div class="card__body">
        <h3 class="card__whatsnew">What's new in <span class="card__ver">v{{ version }}</span></h3>
        <ul class="card__changes">
          <li v-for="(c, i) in changelog.changes" :key="i">{{ c }}</li>
        </ul>
      </div>

      <footer class="card__foot">
        <button class="card__attrib" @click="open(siteUrl)">
          <img class="card__ltm" :src="ltmLogo" alt="" />
          <span>Made with <span class="card__heart">♥</span> by Ltrademark</span>
        </button>
        <button class="card__report" @click="open(reportUrl)">Report a bug</button>
      </footer>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { APP_NAME, APP_DESCRIPTION } from '../version'
import { CHANGELOG } from '../changelog'
import appIcon from '../assets/img/app_logo.svg'
import ltmLogo from '../assets/img/LTM-logo.svg'

const UNLOCK_TAPS = 10

export default defineComponent({
  name: 'WhatsNew',
  emits: ['close', 'unlock-debug'],
  data() {
    return {
      appIcon,
      ltmLogo,
      name: APP_NAME,
      description: APP_DESCRIPTION,
      version: __APP_VERSION__,
      changelog: CHANGELOG,
      reportUrl: 'https://github.com/ltrademark/EvenG2-Music-Search/issues/new',
      siteUrl: 'https://www.ltrademark.com',
      logoTaps: 0,
    }
  },
  methods: {
    open(url: string) {
      window.open(url, '_blank', 'noopener,noreferrer')
    },
    // Easter egg: tap the app icon 10× to unlock the hidden Debug panel.
    onLogoTap() {
      this.logoTaps += 1
      if (this.logoTaps >= UNLOCK_TAPS) {
        this.logoTaps = 0
        this.$emit('unlock-debug')
      }
    },
  },
})
</script>

<style lang="scss" scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: color-mix(in srgb, #000 70%, transparent);
}

.card {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 440px;
  max-height: 90%;
  overflow: hidden;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--surface);
}

.card__head {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--space-6) var(--space-5) var(--space-5);
  border-bottom: 1px solid var(--border);
}

.card__close {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 18px;
}

.card__icon {
  width: 96px;
  height: 96px;
  margin-bottom: var(--space-3);
  user-select: none;
  -webkit-user-select: none;
}

.card__name {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
}

.card__desc {
  margin: var(--space-2) 0 0;
  font-size: 13px;
  color: var(--text-muted);
  text-wrap: balance;
}

.card__body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-5);
}

.card__whatsnew {
  margin: 0 0 var(--space-4);
  font-size: 24px;
  font-weight: 700;
}

.card__ver {
  color: var(--success);
}

.card__changes {
  margin: 0;
  padding-left: var(--space-2);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  font-size: 12px;
  li {
    text-wrap: balance;
  }
}

.card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--border);
}

.card__attrib {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
}

.card__ltm {
  width: 18px;
  height: 18px;
}

.card__heart {
  color: var(--danger);
}

.card__report {
  flex-shrink: 0;
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  background: var(--surface-2);
  color: var(--text);
  font-size: 13px;
}
</style>
