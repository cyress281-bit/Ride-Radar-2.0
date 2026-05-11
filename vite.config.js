import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

// Sentry plugin for source maps upload (optional, only in production with auth token)
let sentryPlugin = null;
if (process.env.SENTRY_AUTH_TOKEN && process.env.NODE_ENV === 'production') {
  try {
    const { sentryPlugin: plugin } = await import('./vite-plugin-sentry.config.js');
    sentryPlugin = plugin;
  } catch (e) {
    console.warn('[Vite] Sentry plugin not available (install @sentry/vite-plugin)');
  }
}

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      cleanupOutdatedCaches: true,
      includeAssets: ['favicon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'maskable-icon-512.png', 'motorcycle-icon.svg'],
      manifest: {
        name: 'Ride Radar',
        short_name: 'Ride Radar',
        description: 'Social network for motorcyclists - find rides, connect with riders, and stay safe on the road',
        id: '/',
        theme_color: '#beff00',
        background_color: '#080808',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/home',
        scope: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/maskable-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Create Broadcast',
            short_name: 'New Post',
            description: 'Create a new ride broadcast',
            url: '/broadcast',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }]
          },
          {
            name: 'Messages',
            short_name: 'Messages',
            description: 'View your conversations',
            url: '/messages',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            // Cache dark map tiles so Radar can still show recently viewed areas under poor signal.
            urlPattern: /^https:\/\/[a-d]\.basemaps\.cartocdn\.com\/dark_all\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'radar-map-tile-cache',
              expiration: {
                maxEntries: 600,
                maxAgeSeconds: 60 * 60 * 24 * 14 // 14 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache Supabase Storage images (avatars, bike photos, etc.)
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-storage-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache Google Fonts
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache font files
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ],
        // Don't cache admin routes or real-time WebSocket connections
        navigateFallback: null,
        navigateFallbackDenylist: [/^\/admin/, /^\/api/, /^\/__/, /\/realtime/]
      },
      devOptions: {
        enabled: false // Disable in dev mode for faster HMR
      }
    }),
    sentryPlugin, // Source maps upload (only if SENTRY_AUTH_TOKEN is set)
  ].filter(Boolean), // Remove null/undefined plugins
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // --- Vendor chunk splitting for better caching ---

          // React core (rarely changes — very cacheable)
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }

          // React Router (loaded on every route)
          if (id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }

          // Supabase client (needed for auth, loaded early)
          if (id.includes('node_modules/@supabase/')) {
            return 'vendor-supabase';
          }

          // TanStack Query (needed for data fetching)
          if (id.includes('node_modules/@tanstack/react-query')) {
            return 'vendor-query';
          }

          // Leaflet + react-leaflet (heavy, only for map view)
          if (id.includes('node_modules/leaflet') || id.includes('node_modules/react-leaflet')) {
            return 'vendor-leaflet';
          }

          // Recharts (only used in admin/charts)
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
            return 'vendor-recharts';
          }

          // Framer Motion (animation library, moderate size)
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-framer';
          }

          // Radix UI components (shared across app)
          if (id.includes('node_modules/@radix-ui/')) {
            return 'vendor-radix';
          }

          // All admin pages in one chunk
          if (id.includes('/src/pages/admin/')) {
            return 'pages-admin';
          }
        },
      },
    },
  },
});
