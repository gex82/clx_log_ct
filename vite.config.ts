import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Cloudflare Pages serves SPA fallbacks at the requested path (e.g., /inventory),
  // so assets must be referenced from the site root or they will 404 on deep links.
  base: '/',
})
