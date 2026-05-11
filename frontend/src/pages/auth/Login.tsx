import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Eye, EyeOff, AlertTriangle } from 'lucide-react'

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
      setError(err?.response?.data?.error || err?.message || 'Invalid email or password')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #3b0764 0%, #4C1D95 50%, #6d28d9 100%)' }}>
      {/* Left — login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo and name */}
          <div className="flex items-center gap-4 mb-8">
            <img src="/logo.jpeg" alt="CompCare Hub" className="w-16 h-16 rounded-xl object-contain bg-white p-1 shadow-lg" />
            <div>
              <h1 className="text-white text-2xl font-bold leading-tight">CompCare Hub</h1>
              <p className="text-purple-300 text-sm">Your Care Our Priority</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-purple-900 mb-1">Welcome back</h2>
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
                <input type="email" className="input" placeholder="your@email.co.uk"
                  value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} className="input pr-10"
                    placeholder="Your password" value={password}
                    onChange={e => setPassword(e.target.value)} required />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 mt-2 font-medium rounded-lg text-white transition-colors disabled:opacity-50"
                style={{ background: loading ? '#6d28d9' : 'linear-gradient(135deg, #4C1D95, #7c3aed)' }}>
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">UK GDPR compliant · Data stored securely in the UK</p>
            </div>
          </div>

          <p className="text-center text-purple-300 text-xs mt-6">
            Contact your administrator if you cannot access your account
          </p>
        </div>
      </div>

      {/* Right — branding panel */}
      <div className="hidden xl:flex flex-1 flex-col items-center justify-center p-16" style={{ background: 'rgba(0,0,0,0.2)' }}>
        <div className="max-w-md text-center">
          <img src="/logo.jpeg" alt="Comprehensive Care" className="w-40 h-40 rounded-2xl object-contain bg-white p-3 shadow-2xl mx-auto mb-8" />
          <h2 className="text-white text-3xl font-bold mb-3">Comprehensive Care</h2>
          <p className="text-purple-200 text-lg mb-8">Your Care Our Priority</p>
          <div className="grid grid-cols-3 gap-3">
            {['Daily Records','Care Plans','Risk Assessments','Staff Management','AI Auditing','Safeguarding','MAR Charts','Reports','Alerts'].map(f => (
              <div key={f} className="rounded-xl p-3 text-xs font-medium text-center text-purple-200" style={{ background: 'rgba(255,255,255,0.08)' }}>{f}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
