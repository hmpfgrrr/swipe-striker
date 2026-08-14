import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({ plugins: [VitePWA({ registerType: 'autoUpdate', manifest: { name: 'Swipe Striker', short_name: 'Swipe Striker', description: 'A tiny touch football challenge.', theme_color: '#0b1720', background_color: '#0b1720', display: 'standalone', orientation: 'portrait', icons: [{ src: '/icon.svg', sizes: '192x192', type: 'image/svg+xml' }, { src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml' }] } })] });
