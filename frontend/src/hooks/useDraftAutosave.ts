import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'

// Generic "don't lose my work" draft autosave — mirrors the pattern already
// proven on the Risk Management "New Plan" form (debounced localStorage
// writes, restored on next open, cleared on successful submit). Protects
// against session timeout, accidental tab close, or a browser crash while a
// long form is half-filled; it is NOT a replacement for the real Save button
// and never talks to the server.
export function draftKey(formName: string, contextId?: string) {
  return `compcare_draft_${formName}${contextId ? `_${contextId}` : ''}`
}

export function getDraft<T>(key: string): (T & { savedAt?: string }) | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function clearDraft(key: string) {
  try { localStorage.removeItem(key) } catch { /* ignore */ }
}

// Call with the live form state; writes a debounced snapshot to localStorage
// roughly once a minute (and shortly after each change) whenever `active` is
// true and `hasContent` says there's something worth protecting.
export function useDraftAutosave(key: string, form: unknown, active: boolean, hasContent: boolean) {
  const lastSaved = useRef(0)
  useEffect(() => {
    if (!active || !hasContent) return
    const t = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify({ ...(form as object), savedAt: new Date().toISOString() }))
        lastSaved.current = Date.now()
      } catch { /* storage unavailable — skip silently */ }
    }, 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, active, hasContent, JSON.stringify(form)])

  // Belt-and-braces periodic save even if the form value hasn't changed
  // (e.g. the debounce above never re-fires because nothing new was typed
  // in the last minute) — matches the "every 1 minute" ask literally.
  useEffect(() => {
    if (!active) return
    const interval = setInterval(() => {
      if (!hasContent) return
      try {
        localStorage.setItem(key, JSON.stringify({ ...(form as object), savedAt: new Date().toISOString() }))
        lastSaved.current = Date.now()
      } catch { /* ignore */ }
    }, 60000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, active])
}

// Call once when a form modal opens — restores a saved draft if one exists
// and is non-trivial, and tells the caller how to apply it.
export function restoreDraftOnOpen<T>(key: string, open: boolean, apply: (draft: T) => void, isMeaningful: (draft: T) => boolean) {
  useEffect(() => {
    if (!open) return
    const draft = getDraft<T>(key)
    if (draft && isMeaningful(draft)) {
      apply(draft)
      toast('Restored your unsaved draft', { icon: '📝' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
}
