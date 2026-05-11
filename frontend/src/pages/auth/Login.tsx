import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Eye, EyeOff, AlertCircle, ArrowRight, Shield, Activity, Users } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Invalid email or password')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-login-grad">
      {/* Left — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-16 relative">
        {/* Decorative circles */}
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-5" style={{ background: 'radial-gradient(circle, #e8b130, transparent)', transform: 'translate(-30%, -30%)' }} />
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-5" style={{ background: 'radial-gradient(circle, #6b7a97, transparent)', transform: 'translate(30%, 30%)' }} />

        <div className="w-full max-w-md relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-10">
            <div className="relative">
              <img src="/logo.jpeg" alt="CompCare Hub" className="w-14 h-14 rounded-2xl object-contain" style={{ background: 'white', padding: '4px' }} />
              <div className="absolute -inset-0.5 rounded-2xl opacity-30 blur-sm" style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)' }} />
            </div>
            <div>
              <h1 className="text-white font-display text-2xl leading-none">CompCare Hub</h1>
              <p className="text-slate-400 text-sm mt-1">Your Care Our Priority</p>
            </div>
          </div>

          {/* Form card */}
          <div className="glass rounded-3xl p-8" style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="text-white font-display text-2xl mb-1">Welcome back</h2>
            <p className="text-slate-400 text-sm mb-7">Sign in to your care management portal</p>

            {error && (
              <div className="flex items-center gap-3 p-4 mb-5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm animate-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email address</label>
                <input type="email" className="input-dark w-full" placeholder="your@compcarehub.co.uk"
                  value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} className="input-dark w-full pr-11"
                    placeholder="••••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full mt-2 py-3 rounded-xl font-semibold text-slate-900 flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 group"
                style={{ background: loading ? '#b87712' : 'linear-gradient(135deg, #e8b130 0%, #d4961a 100%)' }}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <>Sign in <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" /></>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-center gap-2 text-slate-500">
              <Shield className="w-3.5 h-3.5" />
              <p className="text-xs">UK GDPR compliant · Encrypted · Secure</p>
            </div>
          </div>

          <p className="text-center text-slate-600 text-xs mt-6">
            Contact your system administrator if you cannot access your account
          </p>
        </div>
      </div>

      {/* Right — branding panel (desktop only) */}
      <div className="hidden xl:flex flex-1 flex-col items-center justify-center p-16 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(212,150,26,0.08) 0%, transparent 60%)' }} />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full opacity-5" style={{ background: 'radial-gradient(circle, #e8b130, transparent)' }} />

        <div className="max-w-sm text-center relative z-10">
          <img src="/logo.jpeg" alt="Comprehensive Care" className="w-28 h-28 rounded-3xl object-contain mx-auto mb-8 shadow-2xl" style={{ background: 'white', padding: '8px' }} />
          <h2 className="text-white font-display text-4xl mb-3 leading-tight">
            Comprehensive<br />Care
          </h2>
          <p className="text-slate-400 mb-10 leading-relaxed">The complete care home management platform for UK care providers</p>

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
