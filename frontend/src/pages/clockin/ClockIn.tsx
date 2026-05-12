import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { MapPin, CheckCircle, XCircle, AlertTriangle, Loader2, LogIn, LogOut } from 'lucide-react'

type State = 'loading' | 'login_required' | 'confirming' | 'locating' | 'success' | 'error' | 'too_far'

export default function ClockIn() {
  const { token } = useParams<{ token: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [state, setState] = useState<State>('loading')
  const [suInfo, setSuInfo] = useState<any>(null)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [eventType, setEventType] = useState<'clock_in' | 'clock_out'>('clock_in')

  useEffect(() => {
    if (!token) return
    // Load SU info from QR token
    fetch(`/api/clockin/qr/${token}`)
      .then(r => r.json())
      .then(data => {
        if (!data.success) { setError(data.error || 'Invalid QR code'); setState('error'); return }
        setSuInfo(data.data)
        setState(user ? 'confirming' : 'login_required')
      })
      .catch(() => { setError('Could not load. Check your connection.'); setState('error') })
  }, [token, user])

  const doClockIn = () => {
    setState('locating')
    if (!navigator.geolocation) {
      setError('Your device does not support GPS location. Please enable location services.')
      setState('error')
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const authToken = (window as any).__HA_TOKEN__ || sessionStorage.getItem('ha_token') || localStorage.getItem('ha_token')
          const res = await fetch('/api/clockin/qr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
            body: JSON.stringify({
              suId: suInfo.suId,
              staffLat: pos.coords.latitude,
              staffLng: pos.coords.longitude,
              eventType,
            }),
          })
          const data = await res.json()
          if (data.success) {
            setResult(data.data)
            setState('success')
          } else if (res.status === 403) {
            setResult(data)
            setState('too_far')
          } else {
            setError(data.error || 'Clock-in failed')
            setState('error')
          }
        } catch {
          setError('Network error. Please try again.')
          setState('error')
        }
      },
      (err) => {
        if (err.code === 1) setError('Location access denied. Please allow location access in your browser settings and try again.')
        else if (err.code === 2) setError('Could not determine your location. Make sure you are outdoors or near a window.')
        else setError('Location timed out. Please try again.')
        setState('error')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  const bgStyle = { minHeight: '100vh', background: 'linear-gradient(135deg, #0d1526 0%, #151f35 40%, #1e2d4a 100%)' }

  return (
    <div style={bgStyle} className="flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.jpeg" alt="CompCare Hub" className="w-16 h-16 rounded-2xl object-contain mx-auto mb-3 shadow-lg" style={{ background: 'white', padding: '4px' }} />
          <h1 className="text-white font-display text-xl">CompCare Hub</h1>
        </div>

        <div className="rounded-3xl p-8" style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>

          {state === 'loading' && (
            <div className="text-center py-8">
              <Loader2 className="w-10 h-10 text-gold-400 animate-spin mx-auto mb-4" />
              <p className="text-slate-300 text-sm">Loading...</p>
            </div>
          )}

          {state === 'login_required' && (
            <div className="text-center">
              <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
              <h2 className="text-white font-display text-xl mb-2">Sign in required</h2>
              <p className="text-slate-400 text-sm mb-6">You need to be signed in to clock in for <strong className="text-white">{suInfo?.name}</strong></p>
              <button onClick={() => navigate('/login')}
                className="w-full py-3 rounded-xl font-semibold text-slate-900"
                style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)' }}>
                Sign in to continue
              </button>
            </div>
          )}

          {state === 'confirming' && suInfo && (
            <div>
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-slate-900 font-display"
                  style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)' }}>
                  {suInfo.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                </div>
                <h2 className="text-white font-display text-xl mb-1">{suInfo.name}</h2>
                <p className="text-slate-400 text-sm">{suInfo.homeName}</p>
                {suInfo.address && <p className="text-slate-500 text-xs mt-1 flex items-center justify-center gap-1"><MapPin className="w-3 h-3" />{suInfo.address}</p>}
              </div>

              {!suInfo.hasLocation && (
                <div className="p-3 rounded-xl mb-4 text-xs text-amber-300 text-center" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}>
                  ⚠ No GPS set for this location — clock-in will not be distance-checked
                </div>
              )}

              {suInfo.hasLocation && (
                <div className="p-3 rounded-xl mb-4 text-xs text-blue-300 text-center" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <MapPin className="w-3.5 h-3.5 inline mr-1" />
                  You must be within {suInfo.geofenceRadius}m of this location to clock in
                </div>
              )}

              {/* Clock in / Clock out toggle */}
              <div className="flex gap-2 mb-5">
                <button onClick={() => setEventType('clock_in')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors flex items-center justify-center gap-1.5 ${eventType === 'clock_in' ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300' : 'border-white/10 text-slate-500'}`}>
                  <LogIn className="w-4 h-4" /> Clock In
                </button>
                <button onClick={() => setEventType('clock_out')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors flex items-center justify-center gap-1.5 ${eventType === 'clock_out' ? 'border-rose-500 bg-rose-500/15 text-rose-300' : 'border-white/10 text-slate-500'}`}>
                  <LogOut className="w-4 h-4" /> Clock Out
                </button>
              </div>

              <p className="text-slate-500 text-xs text-center mb-4">Signed in as <span className="text-white font-medium">{user?.firstName} {user?.lastName}</span></p>

              <button onClick={doClockIn}
                className="w-full py-3.5 rounded-xl font-bold text-slate-900 text-base flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)' }}>
                <MapPin className="w-5 h-5" />
                {eventType === 'clock_in' ? 'Clock In Now' : 'Clock Out Now'}
              </button>
            </div>
          )}

          {state === 'locating' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(212,150,26,0.15)', border: '2px solid rgba(212,150,26,0.3)' }}>
                <MapPin className="w-8 h-8 text-gold-400 animate-pulse" />
              </div>
              <h2 className="text-white font-display text-xl mb-2">Getting your location...</h2>
              <p className="text-slate-400 text-sm">Please allow location access when prompted</p>
            </div>
          )}

          {state === 'success' && result && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-white font-display text-2xl mb-1">{result.eventType === 'clock_out' ? 'Clocked out' : 'Clocked in'}!</h2>
              <p className="text-slate-300 text-sm mb-4">{result.suName}</p>
              <div className="space-y-2 mb-6">
                {result.distanceMetres !== null && (
                  <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    {result.distanceMetres}m from location — within range ✓
                  </p>
                )}
                {result.punctuality && (
                  <p className={`text-xs font-semibold px-3 py-1 rounded-full inline-block ${result.punctuality === 'on_time' ? 'bg-emerald-500/15 text-emerald-300' : result.punctuality === 'early' ? 'bg-blue-500/15 text-blue-300' : 'bg-rose-500/15 text-rose-300'}`}>
                    {result.punctuality === 'on_time' ? '✓ On time' : result.punctuality === 'early' ? '⏰ Early' : '⚠ Late'}
                  </p>
                )}
              </div>
              <button onClick={() => setState('confirming')}
                className="w-full py-3 rounded-xl text-sm font-semibold text-slate-400 border border-white/10 hover:bg-white/5 transition-colors">
                Done
              </button>
            </div>
          )}

          {state === 'too_far' && result && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-rose-500/15 border-2 border-rose-500/30 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-rose-400" />
              </div>
              <h2 className="text-white font-display text-xl mb-2">Too far away</h2>
              <p className="text-slate-300 text-sm mb-4">{result.error}</p>
              <div className="p-4 rounded-xl mb-5" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <p className="text-rose-300 text-2xl font-bold font-display mb-1">{result.distanceMetres}m</p>
                <p className="text-rose-400 text-xs">from the service user's location</p>
                <p className="text-slate-500 text-xs mt-1">Must be within {suInfo?.geofenceRadius || 200}m</p>
              </div>
              <p className="text-slate-500 text-xs mb-4">Make sure you are physically at the care location, then try again.</p>
              <button onClick={() => setState('confirming')}
                className="w-full py-3 rounded-xl font-semibold text-slate-900"
                style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)' }}>
                Try again
              </button>
            </div>
          )}

          {state === 'error' && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-rose-500/15 border-2 border-rose-500/30 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-rose-400" />
              </div>
              <h2 className="text-white font-display text-xl mb-2">Something went wrong</h2>
              <p className="text-slate-400 text-sm mb-6">{error}</p>
              <button onClick={() => window.location.reload()}
                className="w-full py-3 rounded-xl font-semibold text-slate-900"
                style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)' }}>
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
