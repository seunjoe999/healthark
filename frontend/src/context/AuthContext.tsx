import React, { createContext, useContext, useState, ReactNode } from 'react'
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

function saveSession(token: string, user: AuthUser) {
  ;(window as any).__HA_TOKEN__ = token
  ;(window as any).__HA_USER__ = user
  try { sessionStorage.setItem('ha_token', token); sessionStorage.setItem('ha_user', JSON.stringify(user)) } catch {}
  try { localStorage.setItem('ha_token', token); localStorage.setItem('ha_user', JSON.stringify(user)) } catch {}
}

function loadSession(): { token: string | null; user: AuthUser | null } {
  // 1. Memory (survives tab navigation, not full reload)
  if ((window as any).__HA_TOKEN__ && (window as any).__HA_USER__) {
    return { token: (window as any).__HA_TOKEN__, user: (window as any).__HA_USER__ }
  }
  // 2. sessionStorage (survives page refresh within same tab)
  try {
    const t = sessionStorage.getItem('ha_token')
    const u = sessionStorage.getItem('ha_user')
    if (t && u) {
      const user = JSON.parse(u)
      ;(window as any).__HA_TOKEN__ = t
      ;(window as any).__HA_USER__ = user
      return { token: t, user }
    }
  } catch {}
  // 3. localStorage (survives closing and reopening)
  try {
    const t = localStorage.getItem('ha_token')
    const u = localStorage.getItem('ha_user')
    if (t && u) {
      const user = JSON.parse(u)
      ;(window as any).__HA_TOKEN__ = t
      ;(window as any).__HA_USER__ = user
      return { token: t, user }
    }
  } catch {}
  return { token: null, user: null }
}

function clearSession() {
  ;(window as any).__HA_TOKEN__ = null
  ;(window as any).__HA_USER__ = null
  try { sessionStorage.removeItem('ha_token'); sessionStorage.removeItem('ha_user') } catch {}
  try { localStorage.removeItem('ha_token'); localStorage.removeItem('ha_user') } catch {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => loadSession().user)

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
