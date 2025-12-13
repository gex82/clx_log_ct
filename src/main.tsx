import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles.css'

function normalizeBase(baseUrl: string) {
  if (!baseUrl || baseUrl === './') return '/'

  // Ensure leading slash so BrowserRouter accepts the basename in production builds.
  const withLeading = baseUrl.startsWith('/') ? baseUrl : `/${baseUrl}`
  return withLeading.endsWith('/') && withLeading !== '/' ? withLeading.slice(0, -1) : withLeading
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* Use Vite BASE_URL so routing works under subpaths (Cloudflare/GitHub Pages). */}
    <BrowserRouter basename={normalizeBase(import.meta.env.BASE_URL)}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
