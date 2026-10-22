// Detects when a new deploy has shipped while this tab is still running an
// older build, and provides full Service Worker + CacheStorage self-healing
// so mobile PWAs never get trapped on stale bundles or deleted hashed chunks.

const RECOVERY_GUARD_KEY = 'compcare_sw_recovery_ts'

function getCurrentBundleSrc(): string | null {
  const el = document.querySelector('script[type="module"][src*="/assets/index-"]')
  return el?.getAttribute('src') || null
}

export async function purgeCachesAndReload(force = false): Promise<void> {
  if (!force) {
    try {
      const last = Number(sessionStorage.getItem(RECOVERY_GUARD_KEY) || '0')
      if (last && Date.now() - last < 30_000) return
      sessionStorage.setItem(RECOVERY_GUARD_KEY, String(Date.now()))
    } catch {
      // sessionStorage unavailable in restricted mode
    }
  }
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map(r => r.unregister().catch(() => false)))
    }
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map(k => caches.delete(k).catch(() => false)))
    }
  } catch {
    // Proceed to fresh navigation regardless
  }
  const url = new URL(window.location.href)
  url.searchParams.set('_v', String(Date.now()))
  window.location.replace(url.toString())
}

export function isRecoverableBundleOrTdzError(message: unknown): boolean {
  return (
    typeof message === 'string' &&
    /Failed to fetch dynamically imported module|Loading chunk|Importing a module script failed|Cannot access .* before initialization|Unexpected token '<'/i.test(message)
  )
}

export async function hasNewVersion(): Promise<boolean> {
  const current = getCurrentBundleSrc()
  if (!current) return false
  try {
    const res = await fetch('/index.html', { cache: 'no-store' })
    if (!res.ok) return false
    const html = await res.text()
    const match = html.match(/\/assets\/index-[\w-]+\.js/)
    return !!match && match[0] !== current
  } catch {
    return false
  }
}

export async function reloadIfNewVersion(): Promise<void> {
  if (await hasNewVersion()) {
    await purgeCachesAndReload(true)
  }
}

export function installChunkErrorReload(): void {
  let reloaded = false
  const recover = () => {
    if (reloaded) return
    reloaded = true
    void purgeCachesAndReload()
  }

  window.addEventListener('error', (e) => {
    if (isRecoverableBundleOrTdzError(e.message)) recover()
  })
  window.addEventListener('unhandledrejection', (e) => {
    const message = e.reason?.message || String(e.reason || '')
    if (isRecoverableBundleOrTdzError(message)) recover()
  })

  // Resource-load errors (<script>/<link> 404s on stale hashed chunks)
  window.addEventListener('error', (e) => {
    const target = e.target as HTMLElement | null
    if (!target) return
    const src = (target as HTMLScriptElement).src || (target as HTMLLinkElement).href
    if ((target.tagName === 'SCRIPT' || target.tagName === 'LINK') && src?.includes('/assets/')) {
      recover()
    }
  }, true)
}

export function installPeriodicVersionCheck(): void {
  const CHECK_INTERVAL_MS = 5 * 60 * 1000
  let pending = false

  const check = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration()
        void reg?.update()
      }
    } catch { /* ignore */ }
    if (pending) return
    if (!(await hasNewVersion())) return
    if (document.visibilityState === 'hidden') {
      void purgeCachesAndReload(true)
    } else {
      pending = true
    }
  }

  // Also check shortly after startup and whenever a mobile PWA tab returns to foreground
  setTimeout(check, 5_000)
  setInterval(check, CHECK_INTERVAL_MS)

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && pending) {
      void purgeCachesAndReload(true)
    } else if (document.visibilityState === 'visible') {
      void check()
    }
  })
}
