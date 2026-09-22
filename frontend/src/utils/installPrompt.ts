// beforeinstallprompt fires once per page load, typically within the first
// few seconds. Two separate components (the popup banner and the dedicated
// /install page) each listening for it independently meant whichever one
// wasn't mounted yet at that moment missed the event forever — since SPA
// client-side navigation to /install happens well after the event already
// fired during initial app load. This module attaches ONE listener as early
// as possible (imported from main.tsx, before React even renders) and lets
// every component share the same captured event via a tiny pub-sub.

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let capturedEvent: BeforeInstallPromptEvent | null = null
let installedFlag = false
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach(fn => fn())
}

window.addEventListener('beforeinstallprompt', (e: Event) => {
  e.preventDefault()
  capturedEvent = e as BeforeInstallPromptEvent
  notify()
})

window.addEventListener('appinstalled', () => {
  installedFlag = true
  capturedEvent = null
  notify()
})

export function getInstallPrompt(): BeforeInstallPromptEvent | null {
  return capturedEvent
}

export function isAppInstalledEvent(): boolean {
  return installedFlag
}

export function subscribeInstallPrompt(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// Throws (rather than swallowing) so the caller can surface *why* it failed —
// a silent failure here previously looked identical to "nothing happened" to
// the user, with no way to tell us what actually went wrong on their device.
export async function triggerInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!capturedEvent) return 'unavailable'
  const event = capturedEvent
  try {
    await event.prompt()
    const { outcome } = await event.userChoice
    capturedEvent = null
    notify()
    return outcome
  } catch (err) {
    // The captured event can go stale (e.g. already consumed once, or the
    // browser invalidated it) — treat it as gone so the UI falls back to
    // manual instructions instead of offering a button that will fail again.
    capturedEvent = null
    notify()
    throw err
  }
}
