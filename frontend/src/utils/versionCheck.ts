// Detects when a new deploy has shipped while this tab is still running the
// old build. The service worker (see main.tsx/public/sw.js) only refreshes
// automatically on a *fresh* page load — an already-open tab keeps executing
// the old JS in memory, so navigating to a lazy-loaded route can 404 fetching
// a chunk file that no longer exists on the server after a deploy (seen in
// production logs). This compares the currently-loaded build's main bundle
// filename against what the server is serving right now, without needing any
// backend changes — Vite content-hashes the bundle filename on every build.

function getCurrentBundleSrc(): string | null {
  const el = document.querySelector('script[type="module"][src*="/assets/index-"]')
  return el?.getAttribute('src') || null
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

// Safe to call anytime — reloads unconditionally, so only call this where
// losing in-progress work isn't a concern (e.g. right after login, or after
// a chunk-load error where the navigation already failed).
export async function reloadIfNewVersion(): Promise<void> {
  if (await hasNewVersion()) window.location.reload()
}

// A dynamic import() failing with "Failed to fetch dynamically imported
// module" (or the browser-specific equivalents) almost always means the
// chunk file was deleted by a newer deploy since this tab last loaded — the
// only fix is a full reload, and it's always safe here because the
// navigation the user just attempted already failed, so there's nothing
// in-progress to lose.
export function installChunkErrorReload(): void {
  let reloaded = false
  const isChunkError = (message: unknown) =>
    typeof message === 'string' &&
    /Failed to fetch dynamically imported module|Loading chunk|Importing a module script failed/i.test(message)

  window.addEventListener('error', (e) => {
    if (reloaded) return
    if (isChunkError(e.message)) { reloaded = true; window.location.reload() }
  })
  window.addEventListener('unhandledrejection', (e) => {
    if (reloaded) return
    const message = e.reason?.message || String(e.reason || '')
    if (isChunkError(message)) { reloaded = true; window.location.reload() }
  })

  // Resource-load errors (a <script>/<link> tag 404ing) don't produce a
  // message the two listeners above can see and don't bubble, so they need
  // their own capturing listener — otherwise a lazy-loaded route chunk that
  // 404s silently leaves the page half-broken until the 30-minute periodic
  // check or the user manually reloads (seen in production logs: a page
  // stuck on a 404'd chunk for ~90 seconds before self-healing).
  window.addEventListener('error', (e) => {
    if (reloaded) return
    const target = e.target as HTMLElement | null
    if (!target) return
    const src = (target as HTMLScriptElement).src || (target as HTMLLinkElement).href
    if ((target.tagName === 'SCRIPT' || target.tagName === 'LINK') && src?.includes('/assets/')) {
      reloaded = true
      window.location.reload()
    }
  }, true)
}

// Covers long-running sessions (installed PWA left open for hours/days
// without a fresh login) that the login-time check and chunk-error fallback
// don't reach. Polls every 30 minutes; only actually reloads while the tab
// is backgrounded, so it never interrupts someone mid-task — by the time
// they come back the page is already current.
export function installPeriodicVersionCheck(): void {
  const CHECK_INTERVAL_MS = 30 * 60 * 1000
  let pending = false

  const check = async () => {
    if (pending) return
    if (!(await hasNewVersion())) return
    if (document.visibilityState === 'hidden') {
      window.location.reload()
    } else {
      pending = true
    }
  }

  setInterval(check, CHECK_INTERVAL_MS)

  document.addEventListener('visibilitychange', () => {
    if (pending && document.visibilityState === 'hidden') window.location.reload()
  })
}
