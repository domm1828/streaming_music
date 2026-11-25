import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // El paquete compartido se compila a CommonJS para el API (NestJS); el web lo
  // resuelve directo desde su fuente TS para que los imports de valor (p. ej. BRAND)
  // funcionen como ESM en dev y en build.
  resolve: {
    alias: {
      '@stream-music/shared': fileURLToPath(
        new URL('../../packages/shared/src/index.ts', import.meta.url),
      ),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Stream Music',
        short_name: 'Stream',
        description: 'Descubrí artistas, armá tu biblioteca y escuchá lo que quieras.',
        theme_color: '#2d5a34',
        background_color: '#2d5a34',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        // Cachea el audio servido para reproducción offline del contenido ya escuchado.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/uploads/'),
            handler: 'CacheFirst',
            options: { cacheName: 'media', expiration: { maxEntries: 60, maxAgeSeconds: 604800 } },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    // Permite servir la fuente TS de packages/shared (fuera de apps/web) en dev.
    fs: { allow: [fileURLToPath(new URL('../../', import.meta.url))] },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // Socket.IO (notificaciones en tiempo real).
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
