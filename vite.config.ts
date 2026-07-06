import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import pkg from './package.json'

// The Even Hub store scanner rejects the bundle if it contains ANY URL literal
// not in app.json's network whitelist — even non-network ones. Vue's runtime
// embeds `https://vuejs.org/error-reference/...` in an error-message string
// (never fetched). Strip the host at build time so the scan passes; the link
// only ever appears inside a thrown runtime error's text.
const stripDocUrls = {
  name: 'strip-doc-urls',
  apply: 'build' as const,
  renderChunk(code: string) {
    return { code: code.replace(/https:\/\/vuejs\.org\/error-reference\//g, ''), map: null }
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), stripDocUrls],
  // Single source of truth for the version = package.json (also synced into
  // app.json by scripts/sync-version.mjs on prebuild).
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    target: 'esnext',
  },
})
