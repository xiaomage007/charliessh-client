import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
    ],
    base: './',
    clearScreen: false,
    server: {
        port: 5173,
        strictPort: true,
        watch: {
            ignored: ["**/src-tauri/**"],
        },
        proxy: {
            '/api': {
                target: 'http://localhost:8091',
                changeOrigin: true,
                // SSE 流式请求需要长超时
                timeout: 3 * 10 * 60 * 1000, // 30 分钟
            },
        },
    },
})
