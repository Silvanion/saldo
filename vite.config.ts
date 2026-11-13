import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

export default defineConfig(() => {
  return {
    cacheDir: './.vite-cache',
    // Single source of truth for the running app's version (UpdateManager,
    // bug reports) — package.json is what electron-builder stamps into the app.
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
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
          // Precache tylko powłoki aplikacji i fontów. Ciężkie, leniwe paczki (PDF, eksport, canvas) NIE są
          // pobierane w tle przy instalacji PWA (PERF-03) — trafiają do cache przy pierwszym użyciu.
          globPatterns: ['**/*.{js,css,html,ico,svg,webmanifest,woff2}', '*.png'], // '*.png' = tylko ikony w katalogu głównym (nie zrzuty pomocy)
          globIgnores: ['**/vendor-pdfjs-*', '**/vendor-jspdf-*', '**/vendor-html2canvas-*', '**/vendor-canvg-*', '**/vendor-dompurify-*', '**/vendor-fflate-*', '**/pdf.worker.min-*'],
          runtimeCaching: [
            {
              urlPattern: /\/assets\/help\/.*\.png$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'help-images-cache',
                expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 90 },
                cacheableResponse: { statuses: [0, 200] }
              }
            },
            {
              urlPattern: /\/assets\/(vendor-(pdfjs|jspdf|html2canvas|canvg|dompurify|fflate)|pdf\.worker\.min)-.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'lazy-vendor-cache',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 90 },
                cacheableResponse: { statuses: [0, 200] }
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
            if (id.includes('vite/') || id.includes('preload-helper')) {
              return 'vendor-framework';
            }
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
              if (
                id.includes('recharts') ||
                id.includes('d3-') ||
                id.includes('victory-vendor')
              ) {
                return 'vendor-charts';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('pdfjs-dist')) {
                return 'vendor-pdfjs';
              }
              if (id.includes('react') || id.includes('scheduler') || id.includes('motion')) {
                return 'vendor-framework';
              }
            }
          }
        }
      },
      chunkSizeWarningLimit: 1000
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      port: 3000,
    },
    test: {
      exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
    },
  };
});
