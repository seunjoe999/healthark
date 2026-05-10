import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Activity, Eye, EyeOff, AlertTriangle } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
      const msg = err?.response?.data?.error || err?.message || 'Invalid email or password'
      setError(msg)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-900 flex">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white text-2xl font-bold leading-none">HealthArk</h1>
              <p className="text-blue-300 text-sm">Care Home Management Platform</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-navy-900 mb-1">Welcome back</h2>
            <p className="text-gray-500 text-sm mb-6">Sign in to your account</p>

            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email address</label>
                <input
                  type="email" className="input" placeholder="your@email.co.uk"
                  value={email} onChange={e => setEmail(e.target.value)} required autoFocus
                />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'} className="input pr-10"
                    placeholder="Your password" value={password}
                    onChange={e => setPassword(e.target.value)} required
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-2">
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">UK GDPR compliant · Data stored securely in UK</p>
            </div>
          </div>
        </div>
      </div>
      <div className="hidden xl:flex flex-1 flex-col items-center justify-center p-16" style={{background:'#0a1f46'}}>
        <div className="max-w-md text-center">
          <div className="grid grid-cols-3 gap-3 mb-12">
            {['Daily Records','Care Plans','Risk Assessments','Staff Management','AI Auditing','Safeguarding','MAR Charts','Reports','Alerts'].map(f => (
              <div key={f} className="rounded-xl p-3 text-xs font-medium text-center text-blue-200" style={{background:'rgba(255,255,255,0.05)'}}>{f}</div>
            ))}
          </div>
          <h2 className="text-white text-3xl font-bold mb-4">Care management, reimagined</h2>
          <p className="text-blue-300 leading-relaxed">HealthArk brings together every aspect of care home management — powered by AI that monitors your records 24/7.</p>
        </div>
      </div>
    </div>
  )
}
