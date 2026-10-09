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

// Sign-in rule: password for the first sign-in of the day, then the PIN unlocks
// the app whenever it locks for inactivity, until the day is over. The next day
// starts with the password again.
const LOCK_AFTER_MS = 10 * 60 * 1000
function ukDay(): string {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date()) } catch { return new Date().toISOString().slice(0, 10) }
}
function lsGet(k: string): string | null { try { return localStorage.getItem(k) } catch { return null } }
function lsSet(k: string, v: string) { try { localStorage.setItem(k, v) } catch {} }
function lsDel(k: string) { try { localStorage.removeItem(k) } catch {} }
// The day the password was last used on this device. Sessions from before this
// rule existed have no record; they count as today so nobody is thrown out mid-task.
function signInDayIsOver(): boolean {
  const d = lsGet('ha_login_day')
  if (!d) { lsSet('ha_login_day', ukDay()); return false }
  return d !== ukDay()
}
function idleTooLong(): boolean {
  const t = Number(lsGet('ha_last_active') || 0)
  return t > 0 && Date.now() - t > LOCK_AFTER_MS
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
  lsDel('ha_login_day'); lsDel('ha_last_active'); lsDel('ha_locked')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const u = loadSession().user
    // Opened again on a later day: the password is needed first.
    if (u && signInDayIsOver()) { clearSession(); return null }
    return u
  })
  // Set instead of a full logout on inactivity, for care staff / team leaders
  // (see the timeout effect below): the session survives behind this overlay
  // and a PIN entry resumes it, instead of dumping the app back to the login
  // screen and losing whatever was on screen.
  // Starts locked if the app was closed or reloaded while locked, or has been
  // left longer than the limit — closing and reopening must not skip the PIN.
  const [pinUnlock, setPinUnlockState] = useState(() => !!loadSession().user && (lsGet('ha_locked') === '1' || idleTooLong()))
  const setPinUnlock = (v: boolean) => { if (v) lsSet('ha_locked', '1'); else { lsDel('ha_locked'); lsSet('ha_last_active', String(Date.now())) }; setPinUnlockState(v) }
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

  // Inactivity lock, for everyone: after LOCK_AFTER_MS with no interaction the
  // app locks behind a PIN screen. The session is kept, so entering the PIN
  // carries on exactly where they left off. Once the day is over the lock
  // becomes a full sign-out, and the next sign-in is with the password.
  // The day is only checked at the moment of locking or reopening — never in
  // the middle of someone typing a record just after midnight.
  useEffect(() => {
    if (!user) { setPinUnlockState(false); return }
    if (pinUnlock) return // locked: activity must not count until the PIN is entered
    let timer: ReturnType<typeof setTimeout>
    let lastWrite = 0
    const lock = () => {
      if (signInDayIsOver()) { clearSession(); setUser(null); return }
      setPinUnlockError('')
      setPinUnlock(true)
    }
    const reset = () => {
      const now = Date.now()
      if (now - lastWrite > 15000) { lastWrite = now; lsSet('ha_last_active', String(now)) }
      clearTimeout(timer)
      timer = setTimeout(lock, LOCK_AFTER_MS)
    }
    // Phones pause timers while the screen is off, so check the clock again
    // whenever the app comes back to the front. Also covers a token that ran
    // out while the app sat open.
    const check = () => {
      if (document.visibilityState !== 'visible') return
      const { token } = loadSession()
      if (idleTooLong() || !token) lock()
    }
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll']
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    document.addEventListener('visibilitychange', check)
    const poll = setInterval(check, 60000)
    lsSet('ha_last_active', String(Date.now()))
    reset()
    return () => {
      clearTimeout(timer)
      clearInterval(poll)
      events.forEach(e => window.removeEventListener(e, reset))
      document.removeEventListener('visibilitychange', check)
    }
  }, [!!user, pinUnlock])

  const login = async (email: string, password: string, pin?: string) => {
    const res = await authApi.login(email, password, pin)
    const { accessToken, staff } = res.data.data
    const authUser = parseUser(staff as Record<string, unknown>)
    saveSession(accessToken, authUser)
    lsSet('ha_login_day', ukDay())
    setPinUnlock(false)
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
    // The server only accepts the PIN once the password has been used today.
    lsSet('ha_login_day', ukDay())
    setPinUnlock(false)
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
      // A new day has started: back to the sign-in page for the password.
      if (err?.response?.data?.code === 'password_required') { logout(); return }
      setPinUnlockError(err?.response?.data?.error || 'Incorrect PIN')
    }
  }

  // Everyone unlocks the app with a PIN after inactivity. That only works once
  // they HAVE a PIN, so anyone without one (new starter, or after a manager
  // reset the PINs) is made to create it straight after signing in.
  const [needPinSetup, setNeedPinSetup] = useState(false)
  const [pinSetupError, setPinSetupError] = useState('')
  const [pinSetupSaving, setPinSetupSaving] = useState(false)
  useEffect(() => {
    if (!user) { setNeedPinSetup(false); return }
    let cancelled = false
    authApi.pinStatus()
      .then(res => { if (!cancelled) setNeedPinSetup(res.data?.data?.hasPin === false) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [user?.id, user?.role])

  const savePinSetup = async (pin: string, confirm: string) => {
    if (!/^[0-9]{4,8}$/.test(pin)) { setPinSetupError('Your PIN must be 4 to 8 digits.'); return }
    if (pin !== confirm) { setPinSetupError('The two PINs do not match.'); return }
    setPinSetupSaving(true)
    try {
      await authApi.setPin(pin)
      setNeedPinSetup(false)
      setPinSetupError('')
    } catch (err: any) {
      setPinSetupError(err?.response?.data?.error || 'Could not save your PIN. Try again.')
    } finally { setPinSetupSaving(false) }
  }

  const isRole = (...roles: string[]) => !!user && roles.includes(user.role)

  return (
    <AuthContext.Provider value={{ user, login, loginWithPin, logout, isRole }}>
      {children}
      {needPinSetup && user && !pinUnlock && (
        <div className="fixed inset-0 z-[119] flex items-center justify-center p-6" style={{ background: 'rgba(8,12,24,0.92)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-sm rounded-3xl p-7" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <h2 className="text-white text-xl font-semibold mb-1">Create your PIN</h2>
            <p className="text-slate-400 text-sm mb-5">
              {user.firstName}, choose a PIN. You sign in with your password once a day; after that your PIN unlocks the app when it locks. Choose 4 to 8 digits.
            </p>
            <form onSubmit={(e) => {
              e.preventDefault()
              const els = e.currentTarget.elements
              savePinSetup((els.namedItem('newPin') as HTMLInputElement).value, (els.namedItem('confirmPin') as HTMLInputElement).value)
            }}>
              <input name="newPin" type="password" inputMode="numeric" pattern="[0-9]*" maxLength={8} autoFocus placeholder="New PIN"
                className="w-full px-3.5 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-center tracking-[0.4em] text-lg outline-none focus:border-amber-400/60 mb-3"
                onChange={() => setPinSetupError('')} />
              <input name="confirmPin" type="password" inputMode="numeric" pattern="[0-9]*" maxLength={8} placeholder="Confirm PIN"
                className="w-full px-3.5 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-center tracking-[0.4em] text-lg outline-none focus:border-amber-400/60 mb-3"
                onChange={() => setPinSetupError('')} />
              {pinSetupError && <p className="text-rose-300 text-sm mb-3">{pinSetupError}</p>}
              <button type="submit" disabled={pinSetupSaving} className="w-full py-3 rounded-xl font-semibold text-slate-900 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)' }}>
                {pinSetupSaving ? 'Saving…' : 'Save PIN'}
              </button>
            </form>
            <button onClick={logout} className="w-full mt-3 text-xs text-slate-400 hover:text-white transition-colors">
              Sign out
            </button>
          </div>
        </div>
      )}
      {pinUnlock && user && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6" style={{ background: 'rgba(8,12,24,0.92)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-sm rounded-3xl p-7" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <h2 className="text-white text-xl font-semibold mb-1">Locked</h2>
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
