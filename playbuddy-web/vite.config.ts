import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@common': path.resolve(__dirname, '../common/src'),
      '@mobile': path.resolve(__dirname, '../playbuddy-mobile'),
    },
  },
  optimizeDeps: {
    include: ['@tanstack/react-query', 'axios'],
  },
})
