import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import wasm from 'vite-plugin-wasm'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), wasm()],
  // The WASM chromaprint module is instantiated with top-level await; target
  // esnext so it's emitted natively (no vite-plugin-top-level-await needed).
  build: {
    target: 'esnext',
  },
  optimizeDeps: {
    exclude: ['rusty-chromaprint-wasm'],
  },
})
