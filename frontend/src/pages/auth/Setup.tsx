import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api'
import toast from 'react-hot-toast'
import { Building2, User, Lock, ArrowRight, CheckCircle } from 'lucide-react'

export default function Setup() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({
    orgName: '',
    homeName: '',
    homeAddress: '',
    homeCity: '',
    homePostcode: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    api.get('/auth/setup-status').then(res => {
      if (!res.data.data?.needsSetup) navigate('/login', { replace: true })
      else setChecking(false)
    }).catch(() => setChecking(false))
  }, [navigate])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/setup', form)
      setDone(true)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Setup failed')
    } finally {
      setLoading(false)
    }
  }

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full" />
    </div>
  )

  if (done) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
        <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Setup complete!</h1>
        <p className="text-slate-500 mb-6">Your organisation has been created. You can now log in with your admin account.</p>
        <button onClick={() => navigate('/login')}
          className="w-full bg-purple-600 text-white font-semibold py-3 rounded-xl hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
          Go to Login <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-purple-600 rounded-2xl mb-4">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome to CompCare Hub</h1>
          <p className="text-slate-500 mt-1 text-sm">Set up your organisation to get started</p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          {/* Organisation */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Organisation Details
            </p>
            <div className="space-y-3">
              <input required className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="Organisation / Company name *" value={form.orgName} onChange={e => set('orgName', e.target.value)} />
              <input required className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="Care home name *" value={form.homeName} onChange={e => set('homeName', e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <input className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="Address" value={form.homeAddress} onChange={e => set('homeAddress', e.target.value)} />
                <input className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="City" value={form.homeCity} onChange={e => set('homeCity', e.target.value)} />
              </div>
              <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="Postcode" value={form.homePostcode} onChange={e => set('homePostcode', e.target.value)} />
            </div>
          </div>

          {/* Admin account */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Admin Account
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input required className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="First name *" value={form.firstName} onChange={e => set('firstName', e.target.value)} />
                <input required className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="Last name *" value={form.lastName} onChange={e => set('lastName', e.target.value)} />
              </div>
              <input required type="email" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="Email address *" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
          </div>

          {/* Password */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Password
            </p>
            <div className="space-y-3">
              <input required type="password" minLength={8}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="Password (min 8 characters) *" value={form.password} onChange={e => set('password', e.target.value)} />
              <input required type="password"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="Confirm password *" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-purple-600 text-white font-semibold py-3 rounded-xl hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {loading ? 'Setting up…' : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  )
}
