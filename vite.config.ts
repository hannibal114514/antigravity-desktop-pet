import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './',
  clearScreen: false,
  build: {
    // WKWebView 对 import.meta.url 的相对 PNG 解析不稳定，把贴图内联成 data URI
    assetsInlineLimit: 3_000_000
  },
  server: {
    port: 1420,
    strictPort: true,
    host: true
  },
  envPrefix: ['VITE_', 'TAURI_']
})
