import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            manifest: {
                name: '災害医療訓練システム',
                short_name: '訓練システム',
                description: '災害医療訓練用モバイルアプリ',
                theme_color: '#1a202c',
                background_color: '#1a202c',
                display: 'standalone',
                orientation: 'portrait',
                icons: [
                    {
                        src: 'icon-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: 'icon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                ],
            },
        }),
    ],
    server: {
        fs: {
            allow: [
                '..', // プロジェクトルート以上も含める
                '/Users/tominaganaoki/.gemini/antigravity/brain/bf741cb1-4338-4192-8b2a-3b615d890951'
            ]
        }
    }
})
