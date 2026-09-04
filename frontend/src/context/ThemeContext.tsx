import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

export type AppTheme = 'light' | 'dark'
const STORAGE_KEY = 'compcare-theme'

interface ThemeContextValue { theme: AppTheme; toggleTheme: () => void }

// Defaults to light — dark is opt-in via the sidebar toggle (see index.css
// .app-shell.theme-dark overrides and the shared Button/Modal components).
const ThemeContext = createContext<ThemeContextValue>({ theme: 'light', toggleTheme: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<AppTheme>(() => {
    try { return (localStorage.getItem(STORAGE_KEY) as AppTheme) || 'light' } catch { return 'light' }
  })

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, theme) } catch {}
  }, [theme])

  const toggleTheme = useCallback(() => setTheme(t => (t === 'light' ? 'dark' : 'light')), [])

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
