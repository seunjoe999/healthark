import React from 'react'

interface State { error: Error | null; recovering: boolean }

const HEAL_GUARD_KEY = 'compcare_boundary_heal_ts'

function isRecoverableBundleError(message?: string): boolean {
  if (!message) return false
  return /before initialization|ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed|Unable to preload CSS/i.test(message)
}

async function hardPurgeAndReload(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map(r => r.unregister()))
    }
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map(k => caches.delete(k)))
    }
  } catch {
    // Ignore storage cleanup errors and force network navigation anyway
  }
  const url = new URL(window.location.href)
  url.searchParams.set('_cb', String(Date.now()))
  window.location.replace(url.toString())
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null, recovering: false }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
    if (isRecoverableBundleError(error?.message)) {
      try {
        const last = parseInt(sessionStorage.getItem(HEAL_GUARD_KEY) || '0', 10)
        if (Date.now() - last > 15000) {
          sessionStorage.setItem(HEAL_GUARD_KEY, String(Date.now()))
          this.setState({ recovering: true })
          void hardPurgeAndReload()
        }
      } catch {
        this.setState({ recovering: true })
        void hardPurgeAndReload()
      }
    }
  }

  render() {
    if (this.state.recovering) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#0a0a0a' }}>
          <div style={{ maxWidth: 420, width: '100%', background: '#ffffff', color: '#0f172a', borderRadius: 16, padding: 28, textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.25)' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Updating CompCare Hub…</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Refreshing your app to the latest version automatically.</p>
          </div>
        </div>
      )
    }

    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#f8fafc' }}>
          <div style={{ maxWidth: 520, width: '100%', background: '#fff', color: '#0f172a', border: '1px solid #fecaca', borderRadius: 16, padding: 28, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#991b1b' }}>Something went wrong loading this view</h2>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: '#475569' }}>
              Tap <strong>Update &amp; Reload App</strong> below to clear any cached mobile app files and load the latest version cleanly.
            </p>
            <p style={{ margin: '0 0 12px', fontSize: 12, color: '#64748b', fontFamily: 'monospace', wordBreak: 'break-word', background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              {this.state.error.message}
            </p>
            <button
              onClick={() => { void hardPurgeAndReload() }}
              style={{ marginTop: 12, padding: '10px 20px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%' }}
            >
              Update &amp; Reload App
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
