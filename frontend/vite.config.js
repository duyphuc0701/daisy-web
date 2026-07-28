import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env variables for this mode (development / production)
  const env = loadEnv(mode, process.cwd(), '')

  const apiTarget = env.VITE_API_TARGET || 'http://localhost:5000'
  const devPort   = Number(env.VITE_PORT) || 3000

  return {
    plugins: [react()],
    server: {
      port: devPort,
      proxy: {
        // Forward all /api calls to the backend server
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          // Forward cookies so session-based auth works
          cookieDomainRewrite: '',
        },
      },
    },
  }
})
