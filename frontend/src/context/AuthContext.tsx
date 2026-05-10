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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    const { accessToken, staff } = res.data.data
    const authUser = parseUser(staff as Record<string, unknown>)
    ;(window as any).__HA_TOKEN__ = accessToken
    ;(window as any).__HA_USER__ = authUser
    setUser(authUser)
  }

  const logout = () => {
    try { authApi.logout() } catch {}
    ;(window as any).__HA_TOKEN__ = null
    ;(window as any).__HA_USER__ = null
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
