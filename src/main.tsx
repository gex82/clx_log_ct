import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles.css'

/**
 * Cloudflare Pages blank-screen prevention:
 * - Vite's BASE_URL can be "./" when `base: './'` is used (common for static hosting).
 * - React Router's BrowserRouter `basename` must start with "/".
 *
 * In this demo we default to *no* basename (works for Cloudflare Pages root deploys).
 * If you deploy under a subpath, set `VITE_ROUTER_BASENAME` (e.g., "/my-subpath").
 */
function normalizeBasename(raw?: string): string | undefined {
  if (!raw) return undefined
  const trimmed = raw.trim()
  if (!trimmed || trimmed === '/' || trimmed === './' || trimmed === '.') return undefined
  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return withLeading.endsWith('/') ? withLeading.slice(0, -1) : withLeading
}

const basename = normalizeBasename((import.meta as any).env?.VITE_ROUTER_BASENAME)

;(window as any).__AUTOPILOT_BOOTED__ = true

// Helpful console breadcrumb for debugging deployments.
// (If JS never loads due to bad build settings, you won't see this in the console.)
console.log('[Autopilot Demo] boot', {
  href: window.location.href,
  pathname: window.location.pathname,
  baseUrl: (import.meta as any).env?.BASE_URL,
  routerBasename: basename ?? '(none)',
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
