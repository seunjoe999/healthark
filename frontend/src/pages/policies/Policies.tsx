import React, { useEffect, useState } from 'react'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Input } from '../../components/ui'
import { BookOpen, Plus, CheckCircle, Clock, ExternalLink, Trash2, Eye, Users, Paperclip, Upload, FileText, Download } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Policies() {
  const { user, isRole } = useAuth()
  const [policies, setPolicies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [viewPolicy, setViewPolicy] = useState<any>(null)
  const [signOffs, setSignOffs] = useState<any[]>([])
  const [signOffsLoading, setSignOffsLoading] = useState(false)
  const [attachments, setAttachments] = useState<any[]>([])
  const [attachmentsLoading, setAttachmentsLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/policies')
      setPolicies(res.data.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const openDetail = async (p: any) => {
    setViewPolicy(p)
    setSignOffs([])
    setAttachments([])
    setSignOffsLoading(true)
    setAttachmentsLoading(true)
    try {
      const [soRes, attRes] = await Promise.allSettled([
        api.get(`/policies/${p.id}/sign-offs`),
        api.get(`/policies/${p.id}/attachments`),
      ])
      if (soRes.status === 'fulfilled') setSignOffs(soRes.value.data.data || [])
      if (attRes.status === 'fulfilled') setAttachments(attRes.value.data.data || [])
    } finally { setSignOffsLoading(false); setAttachmentsLoading(false) }
  }

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !viewPolicy) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post(`/upload/policy-doc/${viewPolicy.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setAttachments(prev => [res.data.data.attachment, ...prev])
      toast.success('File uploaded')
    } catch { toast.error('Upload failed') }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = '' }
  }

  const deletePolicy = async (id: string) => {
    if (!window.confirm('Delete this policy? This cannot be undone.')) return
    try {
      await api.delete(`/policies/${id}`)
      toast.success('Policy deleted')
      setViewPolicy(null)
      await load()
    } catch { toast.error('Failed to delete policy') }
  }

  const signPolicy = async (id: string) => {
    try {
      await api.post(`/policies/${id}/sign`)
      toast.success('Policy signed off')
      await load()
      if (viewPolicy?.id === id) {
        const res = await api.get(`/policies/${id}/sign-offs`)
        setSignOffs(res.data.data || [])
      }
    } catch { toast.error('Failed to sign policy') }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-purple-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-purple-600" /> Policies & Procedures
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{policies.length} polic{policies.length !== 1 ? 'ies' : 'y'} on file</p>
        </div>
        {isRole('home_manager', 'group_admin', 'deputy_manager', 'admin') && (
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>Add policy</Button>
        )}
      </div>

      {loading ? <Spinner /> : policies.length === 0 ? (
        <EmptyState title="No policies added yet" description="Add your organisation's policies and procedures"
          action={isRole('home_manager', 'group_admin', 'deputy_manager', 'admin') ? <Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>Add policy</Button> : undefined} />
      ) : (
        <div className="space-y-3">
          {policies.map((p: any) => (
            <div key={p.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <BookOpen className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    <h3 className="font-semibold text-slate-900">{p.title}</h3>
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">v{p.version}</span>
                    {p.signed_by_me && <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" />Signed</span>}
                    {p.requires_sign && !p.signed_by_me && <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full flex items-center gap-1"><Clock className="w-3 h-3" />Sign-off required</span>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                    <span>Added by {p.uploaded_by_name || 'System'}</span>
                    <span>Effective {p.effective_date ? format(new Date(p.effective_date), 'd MMM yyyy') : '—'}</span>
                    {p.review_date && <span>Review due {format(new Date(p.review_date), 'd MMM yyyy')}</span>}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0 items-center">
                  <Button size="sm" variant="outline" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => openDetail(p)}>View</Button>
                  {p.requires_sign && !p.signed_by_me && (
                    <Button size="sm" icon={<CheckCircle className="w-3.5 h-3.5" />} onClick={() => signPolicy(p.id)}>Sign off</Button>
                  )}
                  {isRole('home_manager', 'group_admin', 'deputy_manager', 'admin') && (
                    <button onClick={() => deletePolicy(p.id)} className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Policy detail modal */}
      {viewPolicy && (
        <Modal open={!!viewPolicy} onClose={() => setViewPolicy(null)} title="Policy details" size="md">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Title</p>
              <p className="text-base font-semibold text-slate-900">{viewPolicy.title}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Version</p>
                <p className="text-sm text-slate-700">v{viewPolicy.version}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Effective date</p>
                <p className="text-sm text-slate-700">{viewPolicy.effective_date ? format(new Date(viewPolicy.effective_date), 'd MMM yyyy') : '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Review due</p>
                <p className="text-sm text-slate-700">{viewPolicy.review_date ? format(new Date(viewPolicy.review_date), 'd MMM yyyy') : '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Added by</p>
                <p className="text-sm text-slate-700">{viewPolicy.uploaded_by_name || 'System'}</p>
              </div>
            </div>

            {viewPolicy.requires_sign && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> Sign-offs
                </p>
                {signOffsLoading ? (
                  <p className="text-xs text-slate-400">Loading...</p>
                ) : signOffs.length === 0 ? (
                  <p className="text-xs text-slate-400">No sign-offs yet</p>
                ) : (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {signOffs.map((so: any) => (
                      <div key={so.id} className="flex items-center gap-2 text-xs text-slate-600">
                        <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                        <span>{so.staff_name}</span>
                        <span className="text-slate-400 capitalize">{so.role?.replace(/_/g, ' ')}</span>
                        {so.signed_at && <span className="text-slate-400 ml-auto">{format(new Date(so.signed_at), 'd MMM yyyy')}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Attachments */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Paperclip className="w-3.5 h-3.5" /> Attachments
                </p>
                {isRole('home_manager', 'group_admin', 'deputy_manager', 'admin') && (
                  <>
                    <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png" onChange={uploadFile} />
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                      className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50">
                      <Upload className="w-3 h-3" /> {uploading ? 'Uploading...' : 'Upload file'}
                    </button>
                  </>
                )}
              </div>
              {attachmentsLoading ? (
                <p className="text-xs text-slate-400">Loading...</p>
              ) : attachments.length === 0 ? (
                <p className="text-xs text-slate-400">No files attached</p>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {attachments.map((att: any) => (
                    <a key={att.id} href={att.file_url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 text-xs text-slate-700 hover:text-blue-600 bg-slate-50 rounded-lg px-3 py-1.5 group">
                      <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="flex-1 truncate">{att.file_name}</span>
                      <Download className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2 border-t border-slate-100">
              {viewPolicy.requires_sign && !viewPolicy.signed_by_me && (
                <Button size="sm" icon={<CheckCircle className="w-3.5 h-3.5" />} onClick={() => signPolicy(viewPolicy.id)}>Sign off</Button>
              )}
              {viewPolicy.document_url && (
                <a href={/^https?:\/\//i.test(viewPolicy.document_url) ? viewPolicy.document_url : `https://${viewPolicy.document_url}`} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline" icon={<ExternalLink className="w-3.5 h-3.5" />}>Open document</Button>
                </a>
              )}
              {isRole('home_manager', 'group_admin', 'deputy_manager', 'admin') && (
                <button onClick={() => deletePolicy(viewPolicy.id)}
                  className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" /> Delete policy
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      <AddPolicyModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={async () => { setAddOpen(false); await load(); toast.success('Policy added') }} />
    </div>
  )
}

function AddPolicyModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ title: '', version: '1.0', documentUrl: '', effectiveDate: new Date().toISOString().split('T')[0], reviewDate: '', requiresSign: true })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = { ...form }
      if (payload.documentUrl && !/^https?:\/\//i.test(payload.documentUrl)) {
        payload.documentUrl = `https://${payload.documentUrl}`
      }
      await api.post('/policies', payload); onSaved()
    }
    catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add policy or procedure">
      <form onSubmit={save} className="space-y-4">
        <Input label="Policy title *" required value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Safeguarding Policy, Health & Safety..." />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Version" value={form.version} onChange={e => set('version', e.target.value)} placeholder="1.0" />
          <Input label="Effective date" type="date" value={form.effectiveDate} onChange={e => set('effectiveDate', e.target.value)} />
        </div>
        <Input label="Document URL (optional)" value={form.documentUrl} onChange={e => set('documentUrl', e.target.value)} placeholder="https://..." hint="Link to document in Google Drive, OneDrive, etc." />
        <Input label="Review due date" type="date" value={form.reviewDate} onChange={e => set('reviewDate', e.target.value)} />
        <div className="flex items-center gap-2">
          <input type="checkbox" id="req" checked={form.requiresSign} onChange={e => set('requiresSign', e.target.checked)} className="rounded" />
          <label htmlFor="req" className="text-sm text-slate-700">Requires staff sign-off</label>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Add policy</Button>
        </div>
      </form>
    </Modal>
  )
}
