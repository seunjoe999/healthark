import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api'
import toast from 'react-hot-toast'
import { ArrowLeft, CheckCircle, Upload, Briefcase } from 'lucide-react'

const POSITIONS = [
  'Care Assistant', 'Senior Carer', 'Team Leader', 'Deputy Manager', 'Registered Manager',
  'Nurse', 'Activities Coordinator', 'Kitchen Staff', 'Housekeeping', 'Maintenance', 'Other',
]

export default function Careers() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', position: '', coverNote: '' })
  const [cvUrl, setCvUrl] = useState('')
  const [cvName, setCvName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const uploadCv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post('/upload/public-cv', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setCvUrl(res.data?.data?.fileUrl || '')
      setCvName(res.data?.data?.fileName || file.name)
      toast.success('CV uploaded')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Upload failed — please use a PDF or Word document under 8MB')
    } finally { setUploading(false) }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/recruitment/apply', { ...form, cvUrl })
      setSubmitted(true)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to submit application — please try again')
    } finally { setSubmitting(false) }
  }

  const inputClass = "w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
  const inputStyle = { background: 'white', borderColor: '#D9D0C4', color: '#1A2E1E' }

  return (
    <div className="min-h-screen" style={{ background: '#F5F0E8' }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold mb-8" style={{ color: '#1A5C3A' }}>
          <ArrowLeft size={15} /> Back to home
        </Link>

        {submitted ? (
          <div className="rounded-3xl p-10 text-center shadow-sm" style={{ background: 'white', border: '1px solid rgba(26,46,30,0.08)' }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: '#D4EDDA' }}>
              <CheckCircle size={30} style={{ color: '#1A5C3A' }} />
            </div>
            <h1 className="text-2xl font-black mb-2" style={{ fontFamily: '"DM Serif Display", serif', color: '#1A2E1E' }}>
              Application received!
            </h1>
            <p className="text-sm" style={{ color: '#6B7A6A' }}>
              Thank you for applying. Our recruitment team will review your application and be in touch soon.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2">
              <Briefcase size={18} style={{ color: '#1A5C3A' }} />
              <p className="text-xs font-black uppercase tracking-widest" style={{ color: '#1A5C3A' }}>Careers</p>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3" style={{ color: '#1A2E1E' }}>
              Join our team
            </h1>
            <p className="text-sm sm:text-base mb-8" style={{ color: '#6B7A6A' }}>
              We're always looking for compassionate, dedicated people to join our care homes. Fill in the form below and our team will be in touch.
            </p>

            <form onSubmit={submit} className="rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm" style={{ background: 'white', border: '1px solid rgba(26,46,30,0.08)' }}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#8A9A8A' }}>First name *</label>
                  <input required className={inputClass} style={inputStyle} value={form.firstName} onChange={e => set('firstName', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#8A9A8A' }}>Last name *</label>
                  <input required className={inputClass} style={inputStyle} value={form.lastName} onChange={e => set('lastName', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#8A9A8A' }}>Email *</label>
                <input required type="email" className={inputClass} style={inputStyle} value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#8A9A8A' }}>Phone</label>
                <input type="tel" className={inputClass} style={inputStyle} value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#8A9A8A' }}>Position you're applying for *</label>
                <select required className={inputClass} style={inputStyle} value={form.position} onChange={e => set('position', e.target.value)}>
                  <option value="">Select a role</option>
                  {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#8A9A8A' }}>Tell us about yourself</label>
                <textarea rows={4} className={inputClass} style={inputStyle} placeholder="Relevant experience, why you'd like to join us..."
                  value={form.coverNote} onChange={e => set('coverNote', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#8A9A8A' }}>CV / Resume (PDF or Word, optional)</label>
                <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={uploadCv} />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all disabled:opacity-60"
                  style={{ borderColor: '#D9D0C4', color: '#1A2E1E', background: 'white' }}>
                  <Upload size={15} />
                  {uploading ? 'Uploading...' : cvName ? cvName : 'Choose file'}
                </button>
              </div>
              <button type="submit" disabled={submitting}
                className="w-full mt-2 py-3.5 rounded-xl text-white font-bold text-sm transition-opacity disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #1A5C3A, #1A4A35)' }}>
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
