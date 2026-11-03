import fs from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const serverPort = process.env.PORT || '3001'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'omit-raw-food-pack',
      apply: 'build',
      closeBundle() {
        fs.rmSync(path.resolve(__dirname, 'dist/assets/models/food_pack.glb'), { force: true })
      },
    },
  ],
  resolve: {
    alias: {
      '@cart-chaos/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/socket.io': {
        target: `http://127.0.0.1:${serverPort}`,
        ws: true,
      },
    },
  },
  optimizeDeps: {
    exclude: ['@dimforge/rapier3d-compat'],
  },
})
