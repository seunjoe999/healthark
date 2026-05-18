import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authApi } from '../api'
import { AuthUser } from '../types'

interface AuthContextType {
  user: AuthUser | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isRole: (...roles: string[]) => boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

function parseUser(staff: Record<string, unknown>): AuthUser {
  return {
    id: staff.id as string,
    email: staff.email as string,
    firstName: (staff.first_name || staff.firstName) as string,
    lastName: (staff.last_name || staff.lastName) as string,
    role: staff.role as AuthUser['role'],
    homeId: (staff.home_id || staff.homeId || null) as string | null,
    organisationId: (staff.organisation_id || staff.organisationId) as string,
    photoUrl: (staff.photo_url || staff.photoUrl || null) as string | null,
  }
}

function setCookie(name: string, value: string, days: number) {
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString()
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Strict`
  } catch {}
}

function getCookie(name: string): string | null {
  try {
    const match = document.cookie.split(';').find(c => c.trim().startsWith(name + '='))
    return match ? decodeURIComponent(match.trim().slice(name.length + 1)) : null
  } catch { return null }
}

function deleteCookie(name: string) {
  try { document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Strict` } catch {}
}

function saveSession(token: string, user: AuthUser) {
  ;(window as any).__HA_TOKEN__ = token
  ;(window as any).__HA_USER__ = user
  try { sessionStorage.setItem('ha_token', token); sessionStorage.setItem('ha_user', JSON.stringify(user)) } catch {}
  try { localStorage.setItem('ha_token', token); localStorage.setItem('ha_user', JSON.stringify(user)) } catch {}
  setCookie('ha_token', token, 1)
  setCookie('ha_user', JSON.stringify(user), 1)
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()
  } catch { return true }
}

function loadSession(): { token: string | null; user: AuthUser | null } {
  const candidates: Array<() => { token: string | null; user: AuthUser | null }> = [
    // 1. Memory
    () => {
      const t = (window as any).__HA_TOKEN__
      const u = (window as any).__HA_USER__
      return t && u ? { token: t, user: u } : { token: null, user: null }
    },
    // 2. sessionStorage
    () => {
      const t = sessionStorage.getItem('ha_token')
      const u = sessionStorage.getItem('ha_user')
      if (t && u) return { token: t, user: JSON.parse(u) }
      return { token: null, user: null }
    },
    // 3. localStorage
    () => {
      const t = localStorage.getItem('ha_token')
      const u = localStorage.getItem('ha_user')
      if (t && u) return { token: t, user: JSON.parse(u) }
      return { token: null, user: null }
    },
    // 4. Cookies
    () => {
      const t = getCookie('ha_token')
      const u = getCookie('ha_user')
      if (t && u) return { token: t, user: JSON.parse(u) }
      return { token: null, user: null }
    },
  ]

  for (const fn of candidates) {
    try {
      const { token, user } = fn()
      if (!token || !user) continue
      if (isTokenExpired(token)) {
        // Stale token — wipe everything and bail
        clearSession()
        return { token: null, user: null }
      }
      ;(window as any).__HA_TOKEN__ = token
      ;(window as any).__HA_USER__ = user
      return { token, user }
    } catch {}
  }
  return { token: null, user: null }
}

function clearSession() {
  ;(window as any).__HA_TOKEN__ = null
  ;(window as any).__HA_USER__ = null
  try { sessionStorage.removeItem('ha_token'); sessionStorage.removeItem('ha_user') } catch {}
  try { localStorage.removeItem('ha_token'); localStorage.removeItem('ha_user') } catch {}
  deleteCookie('ha_token')
  deleteCookie('ha_user')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => loadSession().user)

  // Listen for 401 events dispatched by the axios interceptor
  useEffect(() => {
    const handle = () => { clearSession(); setUser(null) }
    window.addEventListener('ha:unauthorized', handle)
    return () => window.removeEventListener('ha:unauthorized', handle)
  }, [])

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    const { accessToken, staff } = res.data.data
    const authUser = parseUser(staff as Record<string, unknown>)
    saveSession(accessToken, authUser)
    setUser(authUser)
  }

  const logout = () => {
    try { authApi.logout() } catch {}
    clearSession()
    setUser(null)
  }

  const isRole = (...roles: string[]) => !!user && roles.includes(user.role)

  return (
    <AuthContext.Provider value={{ user, login, logout, isRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
