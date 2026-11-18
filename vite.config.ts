import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages sert l'app sous /<nom-du-dépôt>/ ; le workflow fournit BASE_PATH.
const base = process.env.BASE_PATH ?? '/lexique/'

export default defineConfig({
  base,
  build: { target: 'es2022' },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Lexique',
        short_name: 'Lexique',
        description: 'Révision de vocabulaire à répétition espacée',
        lang: 'fr',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f6f3ec',
        theme_color: '#f6f3ec',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg}'] },
    }),
  ],
})
