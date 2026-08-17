/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const usePolling = process.env.CHOKIDAR_USEPOLLING === 'true'
const hmrPort = Number(process.env.VITE_HMR_CLIENT_PORT) || 5173
// Docker service name by default (see compose.yaml's `api` service); override
// for native dev where the API isn't reachable at that hostname.
const apiProxyTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://api:8080'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    watch: usePolling ? { usePolling: true, interval: 300 } : undefined,
    hmr: { clientPort: hmrPort },
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'node',
  },
})
