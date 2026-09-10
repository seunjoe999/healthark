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
}
