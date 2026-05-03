import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const rootElement = document.getElementById('root')

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderBootError(error) {
  const message = error instanceof Error ? error.message : String(error || 'Unknown startup error')
  const stack = error instanceof Error && error.stack ? error.stack : ''

  if (!rootElement) {
    return
  }

  const safeMessage = escapeHtml(message)
  const safeStack = stack ? escapeHtml(stack) : ''

  rootElement.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#070b16;color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px;">
      <div style="width:min(680px,100%);border:1px solid rgba(248,250,252,.18);border-radius:28px;background:rgba(15,23,42,.92);box-shadow:0 24px 70px rgba(0,0,0,.38);padding:28px;">
        <p style="margin:0 0 10px;color:#fbbf24;font-weight:800;letter-spacing:.08em;text-transform:uppercase;font-size:12px;">Sirius startup error</p>
        <h1 style="margin:0 0 14px;font-size:28px;line-height:1.15;">The app could not start.</h1>
        <p style="margin:0 0 18px;color:#cbd5e1;line-height:1.55;">Refresh is safe. If this appears in the mobile app, send this message to debug the native build.</p>
        <pre style="white-space:pre-wrap;overflow:auto;max-height:280px;background:#020617;border:1px solid rgba(148,163,184,.2);border-radius:18px;padding:16px;color:#fecaca;font-size:13px;line-height:1.5;">${safeMessage}${safeStack ? `\n\n${safeStack}` : ''}</pre>
      </div>
    </div>
  `
}

window.addEventListener('error', (event) => {
  if (event?.error) {
    renderBootError(event.error)
  }
})

window.addEventListener('unhandledrejection', (event) => {
  if (event?.reason) {
    renderBootError(event.reason)
  }
})

try {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (error) {
  renderBootError(error)
  throw error
}
