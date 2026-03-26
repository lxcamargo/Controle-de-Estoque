import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    include: ['xlsx'],  // adiciona aqui para o Vite pré-bundlar o xlsx
  },
  build: {
    outDir: 'dist',
  },
})
