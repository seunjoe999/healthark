import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import api, { getToken } from '../../api'
import toast from 'react-hot-toast'
import {
  Lock, Plus, ChevronDown, ChevronUp,
  FileText, Trash2, Upload, Loader2,
  ShieldAlert
} from 'lucide-react'
import SignaturePad, { SignatureImage } from '../../components/SignaturePad'

const MANAGEMENT = ['group_admin', 'home_manager', 'deputy_manager', 'admin', 'super_admin', 'director', 'registered_manager', 'service_manager']

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
  const [tab] = useState<'service_user' | 'staff'>('service_user')

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

      {/* Management: record list — Service Users only */}
      {isMgmt && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-600">
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
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
              <Lock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No confidential records yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tabRecords.map(rec => (
                <div key={rec.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setExpanded(expanded === rec.id ? null : rec.id)}>
                    <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-base truncate">{rec.title}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        <span className="font-semibold text-slate-700">{rec.subject_name}</span>
                        {' · '}
                        {new Date(rec.created_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}
                        {rec.created_by_name ? ` · by ${rec.created_by_name}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {expanded === rec.id ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                    </div>
                  </div>

                  {expanded === rec.id && (
                    <div className="border-t border-slate-100 p-5 space-y-5 bg-slate-50/40">
                      {rec.content && (
                        <div>
                          <p className="doc-section-heading">Confidential Notes / Details</p>
                          <div className="bg-white border border-slate-200 rounded-xl p-4">
                            <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{rec.content}</p>
                          </div>
                        </div>
                      )}
                      {rec.document_url && (
                        <div>
                          <p className="doc-section-heading">Attached Document</p>
                          <a href={rec.document_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 text-xs font-semibold hover:bg-purple-100 transition-colors">
                            <FileText className="w-4 h-4" /> {rec.document_name || 'View Document'} ↗
                          </a>
                        </div>
                      )}
                      {rec.signature_data && (
                        <div>
                          <p className="doc-section-heading">Signature</p>
                          <div className="border-2 border-emerald-500/30 rounded-xl overflow-hidden bg-white p-2 w-72 shadow-sm">
                            <SignatureImage src={rec.signature_data} alt="Signature" className="w-full h-20 object-contain" />
                          </div>
                          {rec.signed_by && <p className="text-xs font-medium text-slate-600 mt-1.5">Signed by: <strong className="text-slate-900">{rec.signed_by}</strong></p>}
                        </div>
                      )}
                      <div className="flex justify-end pt-2 border-t border-slate-100">
                        <button onClick={() => handleDelete(rec.id)} disabled={deleting === rec.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40">
                          <Trash2 className="w-3.5 h-3.5" /> {deleting === rec.id ? 'Deleting…' : 'Delete Record'}
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

      {/* Form — shown for all staff, and for management when toggled */}
      {(showForm || !isMgmt) && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-bold text-slate-900 text-base">
              New Confidential Record — Service User
            </h2>
            {isMgmt && (
              <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700 text-sm font-semibold">
                Cancel
              </button>
            )}
          </div>

          {/* Subject selector */}
          <div>
            <label className="label">Service User *</label>
            <select value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}
              className="input w-full" required>
              <option value="">Select {tab === 'service_user' ? 'service user' : 'staff member'}…</option>
              {subjectList.map(s => (
                <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="label">Record Title / Category *</label>
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Escort Notes, Safeguarding Disclosure, Court Order, Financial Power of Attorney…"
              className="input w-full" required />
          </div>

          {/* Content */}
          <div>
            <label className="label">Confidential Notes / Details</label>
            <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              rows={5} placeholder="Enter confidential information here…"
              className="input w-full resize-none" />
          </div>

          {/* Document upload */}
          <div>
            <label className="label">Attach Document (optional)</label>
            {form.documentUrl ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <FileText className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span className="text-sm text-emerald-800 font-medium flex-1 truncate">{form.documentName}</span>
                <button type="button" onClick={() => setForm(f => ({ ...f, documentUrl: '', documentName: '' }))}
                  className="text-slate-500 hover:text-rose-600 text-xs underline">Remove</button>
              </div>
            ) : (
              <div>
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
                  className="hidden" id="conf-doc-upload" />
                <label htmlFor="conf-doc-upload"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-300 text-slate-600 hover:border-purple-400 hover:text-purple-700 cursor-pointer text-sm transition-colors w-fit bg-slate-50">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? 'Uploading…' : 'Upload PDF / Document / Image'}
                </label>
              </div>
            )}
          </div>

          {/* Signed by name */}
          <div>
            <label className="label">Signed By (Full Name)</label>
            <input type="text" value={form.signedBy} onChange={e => setForm(f => ({ ...f, signedBy: e.target.value }))}
              placeholder={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Full name'}
              className="input w-full" />
          </div>

          {/* Signature pad */}
          <SignaturePad
            label="Signature (confirm authenticity)"
            onSave={dataUrl => setForm(f => ({ ...f, signatureData: dataUrl }))}
            savedSignature={form.signatureData || null}
          />

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            {isMgmt && (
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50">
                Cancel
              </button>
            )}
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save Confidential Record'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
