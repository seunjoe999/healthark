import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { authApi } from '../api'
import { AuthUser } from '../types'
import { reloadIfNewVersion } from '../utils/versionCheck'

interface AuthContextType {
  user: AuthUser | null
  login: (email: string, password: string, pin?: string) => Promise<void>
  loginWithPin: (email: string, pin: string) => Promise<void>
  logout: () => void
  isRole: (...roles: string[]) => boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

// Forces the service worker to check for a new deploy right at login, so an
// installed PWA never keeps serving stale files across a login session — the
// registration/skip-waiting/reload wiring already lives in main.tsx and picks
// this up automatically once the update check finds something newer.
function checkForAppUpdate() {
  if (!('serviceWorker' in navigator)) return
  navigator.serviceWorker.getRegistration().then(reg => {
    if (!reg) return
    reg.update().catch(() => {})
    if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' })
  }).catch(() => {})
}

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
    featureFlags: ((staff.feature_flags || staff.featureFlags || {}) as Record<string, boolean>),
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
  // Set instead of a full logout on inactivity, for care staff / team leaders
  // (see the timeout effect below): the session survives behind this overlay
  // and a PIN entry resumes it, instead of dumping the app back to the login
  // screen and losing whatever was on screen.
  const [pinUnlock, setPinUnlock] = useState(false)
  const [pinUnlockError, setPinUnlockError] = useState('')

  // Refresh user profile (incl. merged role access rights) from DB.
  // Called on mount and whenever the window regains focus so access right
  // changes made by an admin take effect immediately without requiring re-login.
  const refreshUser = useCallback(() => {
    const { token } = loadSession()
    if (!token) return
    authApi.me().then(res => {
      const fresh = parseUser(res.data.data as Record<string, unknown>)
      saveSession(token, fresh)
      setUser(fresh)
    }).catch(() => {})
  }, [])

  useEffect(() => { refreshUser() }, [])

  // Re-fetch on window focus or tab becoming visible
  useEffect(() => {
    const onFocus = () => refreshUser()
    const onVisible = () => { if (document.visibilityState === 'visible') refreshUser() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refreshUser])

  // SSE — server pushes 'access-refresh' the instant an admin changes role rights
  useEffect(() => {
    if (!user) return
    const { token } = loadSession()
    if (!token) return
    let es: EventSource | null = null
    let retryTimer: ReturnType<typeof setTimeout>

    const connect = () => {
      es = new EventSource(`/api/auth/events?token=${encodeURIComponent(token)}`)
      es.addEventListener('access-refresh', () => refreshUser())
      es.onerror = () => {
        es?.close()
        retryTimer = setTimeout(connect, 5000)
      }
    }
    connect()
    return () => { es?.close(); clearTimeout(retryTimer) }
  }, [!!user, refreshUser])

  // Listen for 401 events dispatched by the axios interceptor
  useEffect(() => {
    const handle = () => { clearSession(); setUser(null) }
    window.addEventListener('ha:unauthorized', handle)
    return () => window.removeEventListener('ha:unauthorized', handle)
  }, [])

  // Inactivity timeout — log out after 30 minutes of no interaction. Care
  // staff and team leaders instead get a PIN unlock (owner directive): the
  // session is kept, an overlay asks for their PIN, and entering it resumes
  // exactly where they left off — no full re-login with password. Everyone
  // else keeps the full logout, as before.
  useEffect(() => {
    if (!user) { setPinUnlock(false); return }
    const TIMEOUT_MS = 30 * 60 * 1000
    const pinRoles = ['care_staff', 'team_leader']
    let timer: ReturnType<typeof setTimeout>
    const reset = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        if (pinRoles.includes(user.role)) {
          setPinUnlockError('')
          setPinUnlock(true)
        } else {
          clearSession(); setUser(null)
        }
      }, TIMEOUT_MS)
    }
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll']
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset()
    return () => {
      clearTimeout(timer)
      events.forEach(e => window.removeEventListener(e, reset))
    }
  }, [!!user, user?.role])

  const login = async (email: string, password: string, pin?: string) => {
    const res = await authApi.login(email, password, pin)
    const { accessToken, staff } = res.data.data
    const authUser = parseUser(staff as Record<string, unknown>)
    saveSession(accessToken, authUser)
    setUser(authUser)
    checkForAppUpdate()
    // A fresh login is always a safe moment to reload — there's nothing
    // in-progress to lose — so it's the one place an update applies silently
    // and automatically rather than just prompting.
    reloadIfNewVersion()
  }

  const loginWithPin = async (email: string, pin: string) => {
    const res = await authApi.pinLogin(email, pin)
    const { accessToken, staff } = res.data.data
    const authUser = parseUser(staff as Record<string, unknown>)
    saveSession(accessToken, authUser)
    setUser(authUser)
    checkForAppUpdate()
    reloadIfNewVersion()
  }

  const logout = () => {
    try { authApi.logout() } catch {}
    clearSession()
    setUser(null)
    setPinUnlock(false)
    setPinUnlockError('')
  }

  // Resume a timed-out session with a PIN — issues a fresh token for the same
  // account and drops the overlay, leaving the app exactly where it was.
  const resumeWithPin = async (pin: string) => {
    if (!user?.email) { logout(); return }
    try {
      const res = await authApi.pinLogin(user.email, pin)
      const { accessToken, staff } = res.data.data
      const authUser = parseUser(staff as Record<string, unknown>)
      saveSession(accessToken, authUser)
      setUser(authUser)
      setPinUnlock(false)
      setPinUnlockError('')
      refreshUser()
    } catch (err: any) {
      setPinUnlockError(err?.response?.data?.error || 'Incorrect PIN')
    }
  }

  const isRole = (...roles: string[]) => !!user && roles.includes(user.role)

  return (
    <AuthContext.Provider value={{ user, login, loginWithPin, logout, isRole }}>
      {children}
      {pinUnlock && user && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6" style={{ background: 'rgba(8,12,24,0.92)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-sm rounded-3xl p-7" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <h2 className="text-white text-xl font-semibold mb-1">Session timed out</h2>
            <p className="text-slate-400 text-sm mb-5">
              {user.firstName}, enter your PIN to carry on where you left off.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); const v = (e.currentTarget.elements.namedItem('unlockPin') as HTMLInputElement).value; if (v) resumeWithPin(v) }}>
              <input
                name="unlockPin" type="password" inputMode="numeric" pattern="[0-9]*" maxLength={8} autoFocus
                placeholder="••••"
                className="w-full px-3.5 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-center tracking-[0.5em] text-lg outline-none focus:border-amber-400/60 mb-3"
                onChange={() => setPinUnlockError('')} />
              {pinUnlockError && <p className="text-rose-300 text-sm mb-3">{pinUnlockError}</p>}
              <button type="submit" className="w-full py-3 rounded-xl font-semibold text-slate-900 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)' }}>
                Unlock
              </button>
            </form>
            <button onClick={logout} className="w-full mt-3 text-xs text-slate-400 hover:text-white transition-colors">
              Sign in with password instead
            </button>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
