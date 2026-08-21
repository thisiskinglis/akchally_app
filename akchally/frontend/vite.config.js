import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png','icon-512.png','icon-512-maskable-pad.png'],
      manifest: {
        name: 'Akchally',
        short_name: 'Akchally',
        description: 'Gets dinner handled. Not another recipe app.',
        theme_color: '#FAF7F1',
        background_color: '#FAF7F1',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        display_override: ['window-controls-overlay','standalone'],
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-512-maskable-pad.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ]
})
