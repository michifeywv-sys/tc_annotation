import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    headers: {
      "Access-Control-Allow-Origin": "*"
    },
    proxy: {
      '/oauth': {
        target: 'https://id.trimble.com',
        changeOrigin: true,
        secure: false
      },
      '/projectsight-api': {
        target: 'https://us-east.api.trimble.com/projectsightapi/us1/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/projectsight-api/, ''),
        secure: false
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      },
      '/login': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      },
      '/callback': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
