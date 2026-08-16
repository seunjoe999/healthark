import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './styles/print.css'

class GlobalBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
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
