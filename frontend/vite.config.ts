import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { VitePWA } from 'vite-plugin-pwa'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vitejs.dev/config/
export default defineConfig(({ mode: _mode }) => ({
  server: {
    host: '::',
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
    watch: {
      usePolling: false
    }
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      disable: _mode === 'development', // Desabilitar PWA em dev para velocidade
      registerType: 'prompt',
      injectRegister: 'auto',
      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.mapbox\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mapbox-cache',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\/api\/v1\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              networkTimeoutSeconds: 10
            }
          }
        ]
      },
      manifest: {
        name: 'Gestão Virtual',
        short_name: 'Gestão Virtual',
        description: 'Sistema de Gestão de Obras - Gestão Virtual',
        theme_color: '#0a0a0b',
        icons: [
          {
            src: 'logo-hero-pwa.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo-hero-pwa.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ] as any,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'child_process': path.resolve(__dirname, 'src/mocks/child_process.ts')
    }
  },
  build: {
    chunkSizeWarningLimit: 2000,
    sourcemap: true
  }
}))
