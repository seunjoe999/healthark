import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'compcare-theme'
export type AppTheme = 'light' | 'dark'

// Defaults to light — the dark theme is opt-in via the sidebar toggle, not the
// forced default it used to be (see index.css .app-shell.theme-dark overrides).
export function useAppTheme() {
  const [theme, setTheme] = useState<AppTheme>(() => {
    try { return (localStorage.getItem(STORAGE_KEY) as AppTheme) || 'light' } catch { return 'light' }
  })

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, theme) } catch {}
  }, [theme])

  const toggleTheme = useCallback(() => setTheme(t => (t === 'light' ? 'dark' : 'light')), [])

  return { theme, toggleTheme }
}
