import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, CheckCircle, ArrowRight, ArrowLeft, Shield, Info } from 'lucide-react'
import api from '../../api'
import toast from 'react-hot-toast'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', phone: '', registrationCode: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      const res = await api.post('/auth/register', {
        firstName: form.firstName, lastName: form.lastName,
        email: form.email, password: form.password,
        phone: form.phone, registrationCode: form.registrationCode,
      })
      setSuccess(res.data.message)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Registration failed')
    } finally { setLoading(false) }
  }

  if (success) return (
    <div className="min-h-screen flex items-center justify-center bg-login-grad p-8">
      <div className="w-full max-w-md">
        <div className="glass rounded-3xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-white font-display text-2xl mb-3">Registration submitted</h2>
          <p className="text-slate-300 text-sm leading-relaxed mb-6">{success}</p>
          <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-slate-900 transition-all"
            style={{ background: 'linear-gradient(135deg, #e8b130 0%, #d4961a 100%)' }}>
            <ArrowLeft className="w-4 h-4" /> Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-login-grad">
      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-16 relative">
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-5" style={{ background: 'radial-gradient(circle, #e8b130, transparent)', transform: 'translate(-30%, -30%)' }} />

        <div className="w-full max-w-md relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <img src="/logo.jpeg" alt="CompCare Hub" className="w-12 h-12 rounded-xl object-contain" style={{ background: 'white', padding: '3px' }} />
            <div>
              <h1 className="text-white font-display text-xl leading-none">CompCare Hub</h1>
              <p className="text-slate-400 text-xs mt-0.5">Your Care Our Priority</p>
            </div>
          </div>

          <div className="glass rounded-3xl p-8" style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="text-white font-display text-2xl mb-1">Create your account</h2>
            <p className="text-slate-400 text-sm mb-6">Register as a care staff member</p>

            {/* Info banner */}
            <div className="flex items-start gap-3 p-3 mb-5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>You'll need the <strong>registration code</strong> from your manager. Your account will be activated by your manager before you can log in.</p>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 mb-5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">First name *</label>
                  <input className="input-dark w-full" required value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="First name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Last name *</label>
                  <input className="input-dark w-full" required value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Last name" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email address *</label>
                <input type="email" className="input-dark w-full" required value={form.email} onChange={e => set('email', e.target.value)} placeholder="your@email.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Phone number</label>
                <input className="input-dark w-full" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="07700 000000" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password * (min 8 characters)</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} className="input-dark w-full pr-11" required value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Confirm password *</label>
                <input type="password" className="input-dark w-full" required value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Registration code * (from your manager)</label>
                <input className="input-dark w-full font-mono" required value={form.registrationCode} onChange={e => set('registrationCode', e.target.value)} placeholder="Enter the code your manager gave you" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full mt-2 py-3 rounded-xl font-semibold text-slate-900 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #e8b130 0%, #d4961a 100%)' }}>
                {loading ? <span className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" /> : <>Create account <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>

            <div className="mt-5 pt-5 border-t border-white/10 text-center">
              <p className="text-slate-500 text-sm">Already have an account?{' '}
                <Link to="/login" className="text-gold-400 hover:text-gold-300 font-medium">Sign in</Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden xl:flex flex-1 flex-col items-center justify-center p-16 relative overflow-hidden">
        <div className="max-w-sm text-center relative z-10">
          <img src="/logo.jpeg" alt="" className="w-24 h-24 rounded-2xl object-contain mx-auto mb-6 shadow-2xl" style={{ background: 'white', padding: '6px' }} />
          <h2 className="text-white font-display text-3xl mb-3">Join your care team</h2>
          <p className="text-slate-400 mb-8 text-sm leading-relaxed">Register using the code from your manager. Your account will be reviewed and activated before your first shift.</p>
          <div className="space-y-3 text-left">
            {['1. Enter your details and registration code', '2. Your manager reviews and activates your account', '3. Log in and start supporting residents'].map((step, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-slate-300"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {step}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
