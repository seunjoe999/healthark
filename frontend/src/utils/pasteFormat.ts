import type { ClipboardEvent } from 'react'

// Cleans up text pasted into a textarea: normalizes line endings, strips
// trailing whitespace per line, and collapses runs of 3+ blank lines down to
// one — so a paste from Word/PDF/email doesn't dump cramped or inconsistently
// spaced text into a care note.
export function normalizePastedText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Handles a paste into a controlled <textarea>: intercepts the browser's
// default paste, cleans the clipboard text, splices it in at the cursor, and
// hands the result to the field's onChange — then restores cursor position.
export function handleTextareaPaste(
  e: ClipboardEvent<HTMLTextAreaElement>,
  value: string,
  onChange: (v: string) => void
) {
  const raw = e.clipboardData.getData('text/plain')
  if (!raw) return
  e.preventDefault()
  const el = e.currentTarget
  const start = el.selectionStart ?? value.length
  const end = el.selectionEnd ?? value.length
  const cleaned = normalizePastedText(raw)
  const newValue = value.slice(0, start) + cleaned + value.slice(end)
  onChange(newValue)
  requestAnimationFrame(() => {
    const pos = start + cleaned.length
    try { el.setSelectionRange(pos, pos) } catch {}
  })
}
