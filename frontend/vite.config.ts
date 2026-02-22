import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/token': 'http://localhost:8000',
      '/api': 'http://localhost:8000',
      '/upload': 'http://localhost:8000',
      '/ws': { target: 'ws://localhost:8000', ws: true },
      '/docs': 'http://localhost:8000',
      '/super-admin': { target: 'http://localhost:8000', rewrite: (p) => p },
      '/school-admin': { target: 'http://localhost:8000', rewrite: (p) => p },
      '/teacher': { target: 'http://localhost:8000', rewrite: (p) => p },
      '/student': { target: 'http://localhost:8000', rewrite: (p) => p },
      '/auth': 'http://localhost:8000',
      '/individual': 'http://localhost:8000',
    }
  }
})

