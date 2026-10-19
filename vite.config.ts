/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages는 하위 경로(/저장소명/)로 배포되므로 BASE_PATH로 조절한다.
// Cloudflare Pages는 루트(/)이므로 BASE_PATH 미설정 또는 '/'.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt'],
      manifest: {
        name: '조경기능사 수목감별',
        short_name: '수목감별',
        description: '조경기능사 실기 수목감별 학습 (비상업·오프라인)',
        theme_color: '#2f6b3e',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: base,
        scope: base,
        lang: 'ko',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // 앱 셸·데이터·썸네일만 미리 캐시. 원본 사진(webp)은 런타임 캐시(CacheFirst)로.
        globPatterns: ['**/*.{js,css,html,svg,png,json,woff2}', '**/*.thumb.webp'],
        globIgnores: ['**/photos/**/[0-9][0-9].webp'],
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.webp'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'tree-photos',
              expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 60 * 24 * 60 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
