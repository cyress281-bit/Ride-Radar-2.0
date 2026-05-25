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
  define: {
    __SW_VERSION__: JSON.stringify(Date.now().toString()),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      cleanupOutdatedCaches: true,
      includeAssets: ['favicon-32.png', 'apple-touch-icon.png', 'icon-1024.png', 'icon-192.png', 'icon-512.png', 'maskable-icon-512.png', 'motorcycle-icon.svg'],
      manifest: {
        name: 'Ride Radar',
        short_name: 'Ride Radar',
        description: 'Ride Radar is a motorcycle radar and community app for real-time rider awareness, safety signals, meetups, and messaging.',
        id: '/',
        theme_color: '#39FF14',
        background_color: '#050508',
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
          },
          {
            src: '/icon-1024.png',
            sizes: '1024x1024',
            type: 'image/png',
            purpose: 'any'
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
        cleanupOutdatedCaches: true,
        cacheId: 'rr-v2.1', // Bust caches on deploy — increment when changing runtimeCaching or CSP
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            // Cache vector map tiles for MapLibre (Carto dark-matter).
            // Matches tiles-a.basemaps.cartocdn.com through tiles-d.basemaps.cartocdn.com
            urlPattern: /^https:\/\/tiles-[a-d]\.basemaps\.cartocdn\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'radar-map-tile-cache',
              expiration: {
                maxEntries: 1000,
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
          },
          {
            // Cache Supabase REST API reads for offline resilience.
            // Only GET requests are cached; auth and storage writes are excluded.
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-rest-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 4 // 4 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              matchOptions: {
                ignoreSearch: false
              }
            },
            method: 'GET'
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
    // Warn when any chunk exceeds 500KB (gzipped chunks above this hurt TTI)
    chunkSizeWarningLimit: 500,
    // Use Terser instead of esbuild minify so we can keep class/function names
    // for maplibre-gl's Web Worker (aggressive mangling breaks worker constructors).
    minify: 'terser',
    terserOptions: {
      keep_classnames: true,
      keep_fnames: true,
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          // --- Vendor chunk splitting for better caching ---

          // React core (rarely changes — very cacheable)
          // Kept separate from react-router so a router version bump doesn't bust
          // the React cache entry (React itself almost never changes).
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }

          // React Router — separated from React core so router upgrades don't
          // invalidate the more-stable React chunk.
          if (id.includes('node_modules/react-router')) {
            return 'vendor-router';
          }

          // Supabase client (needed for auth, loaded early)
          if (id.includes('node_modules/@supabase/')) {
            return 'vendor-supabase';
          }

          // TanStack Query (needed for data fetching)
          if (id.includes('node_modules/@tanstack/react-query')) {
            return 'vendor-query';
          }

          // TanStack Virtual (list virtualization — smaller, loaded only on demand)
          if (id.includes('node_modules/@tanstack/react-virtual')) {
            return 'vendor-virtual';
          }

          // Leaflet + react-leaflet (heavy, only for map view)
          if (id.includes('node_modules/leaflet') || id.includes('node_modules/react-leaflet')) {
            return 'vendor-leaflet';
          }

          // MapLibre GL JS + React Map GL (future map engine)
          if (id.includes('node_modules/maplibre-gl') || id.includes('node_modules/react-map-gl')) {
            return 'vendor-maplibre';
          }

          // Note: recharts was removed as a dead dependency.
          // If charts are re-added, restore this chunk:
          // if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
          //   return 'vendor-recharts';
          // }

          // Framer Motion (animation library, moderate size — isolated so it is
          // only loaded when a page that uses motion is visited)
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-framer';
          }

          // Radix UI components (shared across app)
          if (id.includes('node_modules/@radix-ui/')) {
            return 'vendor-radix';
          }

          // Form validation stack: react-hook-form + zod + @hookform/resolvers.
          // These are shared by LoginForm, OnboardingPage, ProfileEditForm, and
          // BroadcastForm. Giving them an explicit chunk name produces a stable
          // cache entry and avoids Rollup's auto-named "types-*" hash chunk.
          if (
            id.includes('node_modules/react-hook-form') ||
            id.includes('node_modules/zod') ||
            id.includes('node_modules/@hookform/')
          ) {
            return 'vendor-forms';
          }

          // Lucide icons — large icon set, isolate for better cache granularity
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }

          // Sonner toast notifications — small but isolating avoids it landing
          // in the main index chunk
          if (id.includes('node_modules/sonner')) {
            return 'vendor-toast';
          }

          // Utility libraries (clsx, tailwind-merge, class-variance-authority)
          if (
            id.includes('node_modules/clsx') ||
            id.includes('node_modules/tailwind-merge') ||
            id.includes('node_modules/class-variance-authority')
          ) {
            return 'vendor-utils';
          }

          // Admin pages are lazy-loaded via React.lazy() in App.jsx.
          // Removing the manualChunks rule lets Rollup split them into
          // per-page chunks, avoiding a single 300 KB bundle that Vite
          // eagerly preloads for all users (including non-admins).
          // Shared admin components/hooks naturally deduplicate into the
          // smallest chunk that needs them.
        },
      },
    },
  },
  // Prevent Vite from pre-bundling maplibre-gl through esbuild — let Rollup handle it
  // so the package's internal class names and worker code are preserved.
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  // Target es2020 to avoid down-leveling class syntax (MapLibre relies on native classes)
  esbuild: {
    target: 'es2020',
  },
});
