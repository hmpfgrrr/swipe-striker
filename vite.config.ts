import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const base = process.env.GITHUB_ACTIONS === 'true' ? '/swipe-striker/' : '/';

export default defineConfig({
  base,
  plugins: [
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      workbox: {
        skipWaiting: false,
        clientsClaim: false,
      },
      manifest: {
        name: 'Swipe Striker',
        short_name: 'Swipe Striker',
        description: 'A tiny touch football challenge.',
        theme_color: '#0b1720',
        background_color: '#0b1720',
        display: 'standalone',
        start_url: base,
        scope: base,
        orientation: 'portrait',
        icons: [
          { src: `${base}icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: `${base}icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: `${base}icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
