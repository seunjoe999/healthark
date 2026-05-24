import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Eye, EyeOff, AlertCircle, ArrowRight, Shield, Activity, Users, CheckCircle } from 'lucide-react'
import api from '../../api'

type Mode = 'login' | 'register' | 'register_success'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successData, setSuccessData] = useState<any>(null)

  // Login state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)

  // Redirect to setup page if no organisation exists yet
  useEffect(() => {
    api.get('/auth/setup-status').then(res => {
      if (res.data.data?.needsSetup) navigate('/setup', { replace: true })
    }).catch(() => {})
  }, [navigate])

  // Register state
  const [reg, setReg] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', phone: '', registrationCode: '' })
  const setR = (k: string, v: string) => setReg(p => ({ ...p, [k]: v }))

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/messages', { replace: true })
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Invalid email or password')
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (reg.password !== reg.confirmPassword) { setError('Passwords do not match'); return }
    if (reg.password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reg),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Registration failed')
      setSuccessData(data.data)
      setMode('register_success')
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    } finally { setLoading(false) }
  }

  const inputClass = "w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder:text-white/40 outline-none focus:bg-white/15 focus:border-gold-400/60 transition-all"

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #0d1526 0%, #151f35 35%, #1e2d4a 70%, #27334d 100%)' }}>
      {/* Left — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-16 relative">
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-5" style={{ background: 'radial-gradient(circle, #e8b130, transparent)', transform: 'translate(-30%,-30%)' }} />

        <div className="w-full max-w-md relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-8">
            <img src="/logo.jpeg" alt="CompCare Hub" className="w-14 h-14 rounded-2xl object-contain shadow-lg" style={{ background: 'white', padding: '4px' }} />
            <div>
              <h1 className="text-white font-display text-2xl leading-none">CompCare Hub</h1>
              <p className="text-slate-400 text-sm mt-1">Your Care Our Priority</p>
            </div>
          </div>

          {/* Card */}
          <div className="rounded-3xl p-8" style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>

            {mode === 'register_success' ? (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-white font-display text-2xl mb-2">Registration submitted</h2>
                <p className="text-slate-300 text-sm mb-2">Welcome, <strong>{successData?.name}</strong></p>
                <p className="text-slate-400 text-sm mb-6">Your account at <strong className="text-white">{successData?.homeName}</strong> is pending approval. Your manager will activate your account and you'll be able to log in.</p>
                <button onClick={() => setMode('login')}
                  className="w-full py-3 rounded-xl font-semibold text-slate-900"
                  style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)' }}>
                  Back to sign in
                </button>
              </div>
            ) : mode === 'login' ? (
              <>
                <h2 className="text-white font-display text-2xl mb-1">Welcome back</h2>
                <p className="text-slate-400 text-sm mb-7">Sign in to your care management portal</p>

                {error && (
                  <div className="flex items-center gap-3 p-4 mb-5 rounded-xl text-rose-300 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email address</label>
                    <input type="email" className={inputClass} placeholder="your@compcarehub.co.uk"
                      value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
                    <div className="relative">
                      <input type={showPw ? 'text' : 'password'} className={inputClass + ' pr-11'}
                        placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full mt-2 py-3 rounded-xl font-semibold text-slate-900 flex items-center justify-center gap-2 disabled:opacity-50 group"
                    style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)' }}>
                    {loading ? <span className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" /> : <>Sign in <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></>}
                  </button>
                </form>

                <div className="mt-6 pt-5 border-t border-white/10 text-center">
                  <p className="text-slate-500 text-sm">New staff member?{' '}
                    <button onClick={() => { setMode('register'); setError('') }} className="text-gold-400 hover:text-gold-300 font-semibold transition-colors">
                      Create account
                    </button>
                  </p>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-white font-display text-2xl mb-1">Create account</h2>
                <p className="text-slate-400 text-sm mb-7">Register as a new care staff member</p>

                {error && (
                  <div className="flex items-center gap-3 p-4 mb-5 rounded-xl text-rose-300 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                  </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">First name *</label>
                      <input className={inputClass} placeholder="First name" required value={reg.firstName} onChange={e => setR('firstName', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Last name *</label>
                      <input className={inputClass} placeholder="Last name" required value={reg.lastName} onChange={e => setR('lastName', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email address *</label>
                    <input type="email" className={inputClass} placeholder="your@email.co.uk" required value={reg.email} onChange={e => setR('email', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Phone number</label>
                    <input type="tel" className={inputClass} placeholder="07xxx xxxxxx" value={reg.phone} onChange={e => setR('phone', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password *</label>
                    <input type="password" className={inputClass} placeholder="Min. 8 characters" required value={reg.password} onChange={e => setR('password', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Confirm password *</label>
                    <input type="password" className={inputClass} placeholder="Repeat password" required value={reg.confirmPassword} onChange={e => setR('confirmPassword', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Registration code *</label>
                    <input className={inputClass} placeholder="Ask your manager for this code" required value={reg.registrationCode} onChange={e => setR('registrationCode', e.target.value)} />
                    <p className="text-xs text-slate-500 mt-1.5">Your manager will give you a unique registration code for your care home</p>
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full mt-2 py-3 rounded-xl font-semibold text-slate-900 flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)' }}>
                    {loading ? <span className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" /> : 'Submit registration'}
                  </button>
                </form>

                <div className="mt-6 pt-5 border-t border-white/10 text-center">
                  <button onClick={() => { setMode('login'); setError('') }} className="text-slate-400 hover:text-white text-sm transition-colors">
                    ← Back to sign in
                  </button>
                </div>
              </>
            )}

            <div className="mt-5 flex items-center justify-center gap-2 text-slate-600">
              <Shield className="w-3.5 h-3.5" />
              <p className="text-xs">UK GDPR compliant · Encrypted · Secure</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="hidden xl:flex flex-1 flex-col items-center justify-center p-16 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(212,150,26,0.08) 0%, transparent 60%)' }} />
        <div className="max-w-sm text-center relative z-10">
          <img src="/logo.jpeg" alt="Comprehensive Care" className="w-28 h-28 rounded-3xl object-contain mx-auto mb-8 shadow-2xl" style={{ background: 'white', padding: '8px' }} />
          <h2 className="text-white font-display text-4xl mb-3 leading-tight">Comprehensive<br />Care</h2>
          <p className="text-slate-400 mb-10">The complete care home management platform for UK care providers</p>
          <div className="space-y-3">
            {[
              { icon: <Activity className="w-4 h-4" />, label: 'AI-powered audit engine' },
              { icon: <Users className="w-4 h-4" />, label: 'Full resident & staff management' },
              { icon: <Shield className="w-4 h-4" />, label: 'CQC compliance ready' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 px-5 py-3 rounded-xl text-left"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="text-gold-400">{item.icon}</span>
                <span className="text-sm text-slate-300 font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
