import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // index.html uses %VITE_SITE_URL%; default it so builds work without a .env (e.g. CI)
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  process.env.VITE_SITE_URL = (env.VITE_SITE_URL || 'https://bndfanclub.com').replace(/\/+$/, '')
  return {
    plugins: [react()],
    server: { host: '0.0.0.0', allowedHosts: true, proxy: { '/api': 'http://localhost:3001' } },
    preview: { host: '0.0.0.0', allowedHosts: true },
  }
})
