import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './styles/print.css'
import { installChunkErrorReload, installPeriodicVersionCheck } from './utils/versionCheck'
// Imported first, before anything else runs, so its module-level
// beforeinstallprompt listener is attached as early as physically possible —
// see utils/installPrompt.ts for why this can't just live inside a component.
import './utils/installPrompt'

installChunkErrorReload()
installPeriodicVersionCheck()

class GlobalBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  componentDidCatch(error: any) { try { (window as any).__haReport?.(`Screen crashed: ${error?.message || String(error)}`) } catch { /* ignore */ } }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, fontFamily: 'monospace', background: '#0d1526', color: '#fff', minHeight: '100vh' }}>
          <h2 style={{ color: '#e8b130' }}>Global Render Error</h2>
          <pre style={{ color: '#f87171', whiteSpace: 'pre-wrap' }}>{this.state.error?.stack || this.state.error?.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// Report browser-side crashes to the System Health issue log, so a screen
// that breaks on someone's phone is seen without them having to describe it.
// Capped per page load so a looping error cannot flood the log.
let __reported = 0
const __reportClientError = (message: string) => {
  try {
    if (__reported >= 5 || !message) return
    // The browser failing to fetch an app update in the background (poor signal)
    // is not a fault anyone sees; the next attempt picks it up.
    if (/ServiceWorker|service worker|sw.js/i.test(message)) return
    const token = sessionStorage.getItem('ha_token') || localStorage.getItem('ha_token')
    if (!token) return
    __reported++
    fetch('/api/system/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message: String(message).slice(0, 900), page: window.location.pathname }),
      keepalive: true,
    }).catch(() => {})
  } catch { /* never let reporting cause another error */ }
}
;(window as any).__haReport = __reportClientError
window.addEventListener('error', e => __reportClientError(`${e.message || 'Script error'}${e.filename ? ` (${String(e.filename).split('/').pop()}:${e.lineno})` : ''}`))
window.addEventListener('unhandledrejection', e => {
  const r: any = (e as PromiseRejectionEvent).reason
  // Failed API calls are already recorded by the server; only report genuine code errors.
  if (r && (r.isAxiosError || r.response)) return
  __reportClientError(`Unhandled: ${r?.message || String(r)}`)
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalBoundary>
      <App />
    </GlobalBoundary>
  </React.StrictMode>
)

// Service worker: enables PWA install + offline fallback, but always checks for a
// fresh deploy and reloads automatically the moment a new version takes over —
// so the installed app never gets stuck showing an outdated build.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      // A new SW may already be waiting from a previous visit — activate it now.
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' })

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (!newWorker) return
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: 'SKIP_WAITING' })
          }
        })
      })

      // Re-check for updates whenever the tab regains focus.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update()
      })
    }).catch(() => {})
  })

  let reloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return
    reloaded = true
    window.location.reload()
  })
}
