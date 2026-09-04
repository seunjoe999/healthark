import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import api, { getToken } from '../../api'
import toast from 'react-hot-toast'
import {
  Lock, Users, UserSquare, Plus, X, ChevronDown, ChevronUp,
  FileText, Trash2, Eye, EyeOff, Upload, CheckCircle, Loader2,
  AlertCircle, ShieldAlert
} from 'lucide-react'
import SignaturePad from '../../components/SignaturePad'

const MANAGEMENT = ['group_admin', 'home_manager', 'deputy_manager', 'admin']

interface ConfidentialRecord {
  id: string
  subject_type: 'service_user' | 'staff'
  subject_id: string
  subject_name?: string
  title: string
  content?: string
  document_url?: string
  document_name?: string
  signature_data?: string
  signed_by?: string
  created_by_name?: string
  created_at: string
}

interface Subject { id: string; first_name: string; last_name: string }

const BLANK = {
  subjectId: '', title: '', content: '',
  documentUrl: '', documentName: '', signatureData: '', signedBy: ''
}

export default function Confidential() {
  const { user } = useAuth()
  const isMgmt = MANAGEMENT.includes(user?.role || '')
  const [tab, setTab] = useState<'service_user' | 'staff'>('service_user')

  // data
  const [records, setRecords] = useState<ConfidentialRecord[]>([])
  const [serviceUsers, setServiceUsers] = useState<Subject[]>([])
  const [staffList, setStaffList] = useState<Subject[]>([])
  const [loading, setLoading] = useState(false)

  // form
  const [showForm, setShowForm] = useState(!isMgmt) // staff always see form
  const [form, setForm] = useState(BLANK)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // view
  const [expanded, setExpanded] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const homeId = user?.homeId || ''

  useEffect(() => {
    loadSubjects()
    if (isMgmt) loadRecords()
  }, [tab])

  async function loadSubjects() {
    try {
      const [suRes, stRes] = await Promise.all([
        api.get('/service-users', { params: { homeId } }),
        isMgmt ? api.get('/staff', { params: { homeId } }) : Promise.resolve({ data: { data: [] } })
      ])
      setServiceUsers(suRes.data?.data || [])
      setStaffList(stRes.data?.data || [])
    } catch { /* ignore */ }
  }

  async function loadRecords() {
    setLoading(true)
    try {
      const res = await api.get('/confidential', { params: { homeId, subjectType: tab } })
      setRecords(res.data?.data || [])
    } catch {
      toast.error('Failed to load records')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const token = getToken()
      const res = await fetch('/api/upload/document', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd
      })
      const json = await res.json()
      setForm(f => ({ ...f, documentUrl: json.fileUrl || '', documentName: json.fileName || file.name }))
      toast.success('Document attached')
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.subjectId) { toast.error('Please select a subject'); return }
    if (!form.title) { toast.error('Please enter a title'); return }
    setSaving(true)
    try {
      const res = await api.post('/confidential', {
        homeId,
        subjectType: tab,
        subjectId: form.subjectId,
        title: form.title,
        content: form.content,
        documentUrl: form.documentUrl,
        documentName: form.documentName,
        signatureData: form.signatureData,
        signedBy: form.signedBy || `${user?.firstName} ${user?.lastName}`
      })
      toast.success('Confidential record saved securely')
      const newRec: ConfidentialRecord = res.data?.data
      if (isMgmt && newRec) {
        setRecords(prev => [newRec, ...prev])
      }
      setForm(BLANK)
      if (fileRef.current) fileRef.current.value = ''
      if (isMgmt) setShowForm(false)
    } catch {
      toast.error('Failed to save record')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Permanently delete this confidential record?')) return
    setDeleting(id)
    try {
      await api.delete(`/confidential/${id}`)
      toast.success('Record deleted')
      setRecords(r => r.filter(x => x.id !== id))
    } catch {
      toast.error('Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  const subjectList = tab === 'service_user' ? serviceUsers : staffList
  const tabRecords = records.filter(r => r.subject_type === tab)

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
          <Lock className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Confidential Information</h1>
          <p className="text-sm text-slate-500">Restricted — securely stored records</p>
        </div>
      </div>

      {/* Access notice for non-management */}
      {!isMgmt && (
        <div className="flex gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50">
          <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Write-only access</p>
            <p className="text-xs text-amber-700 mt-0.5">You can submit confidential information for service users. Once saved, only management can view or access these records.</p>
          </div>
        </div>
      )}

      {/* Tabs — management sees both, staff only see Service Users */}
      {isMgmt && (
        <div className="flex gap-1 p-1 rounded-xl bg-white/8 w-fit">
          {(['service_user', 'staff'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setShowForm(false); setExpanded(null) }}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? 'bg-white/15 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}>
              {t === 'service_user' ? (
                <span className="flex items-center gap-2"><Users className="w-4 h-4" />Service Users</span>
              ) : (
                <span className="flex items-center gap-2"><UserSquare className="w-4 h-4" />Staff</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Management: record list */}
      {isMgmt && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-300">
              {tabRecords.length} record{tabRecords.length !== 1 ? 's' : ''} — {tab === 'service_user' ? 'Service Users' : 'Staff'}
            </p>
            <button onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
              <Plus className="w-4 h-4" /> Add Record
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-purple-500 animate-spin" /></div>
          ) : tabRecords.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-white/15 rounded-2xl">
              <Lock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No confidential records yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tabRecords.map(rec => (
                <div key={rec.id} className="border border-white/12 rounded-xl overflow-hidden bg-white/5">
                  <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => setExpanded(expanded === rec.id ? null : rec.id)}>
                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{rec.title}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {rec.subject_name} · {new Date(rec.created_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })} · by {rec.created_by_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {expanded === rec.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {expanded === rec.id && (
                    <div className="border-t border-white/8 p-4 space-y-3 bg-white/3">
                      {rec.content && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 mb-1">Content</p>
                          <p className="text-sm text-slate-200 whitespace-pre-wrap">{rec.content}</p>
                        </div>
                      )}
                      {rec.document_url && (
                        <div>
                          <p className="text-xs font-semibold text-slate-400 mb-2">Attached Document</p>
                          <a href={rec.document_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-semibold hover:bg-purple-500/20 transition-colors">
                            <FileText className="w-4 h-4" /> {rec.document_name || 'View Document'} ↗
                          </a>
                        </div>
                      )}
                      {rec.signature_data && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 mb-1">Signature</p>
                          <div className="border border-emerald-500/30 rounded-xl overflow-hidden bg-white/5 w-64">
                            <img src={rec.signature_data} alt="Signature" className="w-full h-16 object-contain" />
                          </div>
                          {rec.signed_by && <p className="text-xs text-slate-500 mt-1">Signed by: {rec.signed_by}</p>}
                        </div>
                      )}
                      <div className="flex justify-end pt-2">
                        <button onClick={() => handleDelete(rec.id)} disabled={deleting === rec.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 transition-colors">
                          {deleting === rec.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Form — always visible to staff; toggled for management */}
      {showForm && (
        <div className="bg-white/5 rounded-2xl border border-white/12 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100"
            style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.06),rgba(109,40,217,0.03))' }}>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-purple-600" />
              <h2 className="font-semibold text-white text-sm">
                New {tab === 'service_user' ? 'Service User' : 'Staff'} Confidential Record
              </h2>
            </div>
            {isMgmt && (
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {/* Subject select */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                {tab === 'service_user' ? 'Service User' : 'Staff Member'} *
              </label>
              <select value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}
                className="input">
                <option value="">— Select —</option>
                {subjectList.map(s => (
                  <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Title / Type *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Safeguarding concern, Personal disclosure, Legal matter…"
                className="input" />
            </div>

            {/* Content */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Confidential Details</label>
              <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                rows={5} placeholder="Document the confidential information here…"
                className="input resize-none" />
            </div>

            {/* Document upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Attach Document (optional)</label>
              {form.documentUrl ? (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50">
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="text-sm text-emerald-800 font-medium truncate flex-1">{form.documentName}</span>
                  <button type="button" onClick={() => setForm(f => ({ ...f, documentUrl: '', documentName: '' }))}
                    className="p-1 rounded-lg hover:bg-emerald-100 transition-colors flex-shrink-0">
                    <X className="w-3.5 h-3.5 text-emerald-600" />
                  </button>
                </div>
              ) : (
                <label className={`flex items-center gap-3 p-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${uploading ? 'border-purple-400/40 bg-purple-500/8' : 'border-white/15 hover:border-purple-400/50 hover:bg-purple-500/8'}`}>
                  {uploading ? <Loader2 className="w-4 h-4 text-purple-500 animate-spin" /> : <Upload className="w-4 h-4 text-slate-400" />}
                  <span className="text-sm text-slate-500">{uploading ? 'Uploading…' : 'Click to attach a document'}</span>
                  <input ref={fileRef} type="file" className="hidden" disabled={uploading}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }} />
                </label>
              )}
            </div>

            {/* Signature */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Signature</label>
              <SignaturePad
                label=""
                onSave={dataUrl => setForm(f => ({ ...f, signatureData: dataUrl }))}
                savedSignature={form.signatureData || null}
              />
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-2">
              {isMgmt && (
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-slate-400 hover:bg-white/5 transition-colors">
                  Cancel
                </button>
              )}
              <button type="submit" disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                {saving ? 'Saving…' : 'Save Confidential Record'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
