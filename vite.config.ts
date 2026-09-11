import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    cacheDir: './.vite-cache',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'Saldo',
          short_name: 'Saldo',
          description: 'Aplikacja do zarządzania budżetem domowym i osobistym.',
          theme_color: '#137566',
          lang: 'pl-PL',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5242880, // 5MB
          navigateFallbackDenylist: [/^\/api/],
          runtimeCaching: [
            // Safe caching for external static assets like Google Fonts
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      })
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('@firebase/auth')) {
                return 'vendor-firebase-auth';
              }
              if (id.includes('@firebase/firestore')) {
                return 'vendor-firebase-firestore';
              }
              if (id.includes('@firebase/app') || id.includes('@firebase/util')) {
                return 'vendor-firebase-core';
              }
              if (id.includes('/firebase/')) {
                return 'vendor-firebase';
              }
              if (id.includes('/jspdf/')) {
                return 'vendor-jspdf';
              }
              if (id.includes('/html2canvas/')) {
                return 'vendor-html2canvas';
              }
              if (id.includes('/dompurify/') || id.includes('/purify/')) {
                return 'vendor-dompurify';
              }
              if (id.includes('/fflate/')) {
                return 'vendor-fflate';
              }
              if (id.includes('/canvg/')) {
                return 'vendor-canvg';
              }
              if (id.includes('papaparse')) {
                return 'vendor-csv';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('react') || id.includes('scheduler') || id.includes('motion')) {
                return 'vendor-framework';
              }
            }
          }
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    test: {
      exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
    },
  };
});
