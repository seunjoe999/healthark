import React, { useEffect, useState } from 'react'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Input } from '../../components/ui'
import { BookOpen, Plus, CheckCircle, Clock, ExternalLink, Trash2, Eye, Users, Paperclip, Upload, FileText, Download, PenLine } from 'lucide-react'
import SignaturePad from '../../components/SignaturePad'
import toast from 'react-hot-toast'

export default function Policies() {
  const { user, isRole } = useAuth()
  const [policies, setPolicies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [viewPolicy, setViewPolicy] = useState<any>(null)
  const [signOffs, setSignOffs] = useState<any[]>([])
  const [signatureModal, setSignatureModal] = useState<any>(null)
  const [capturedSig, setCapturedSig] = useState<string | null>(null)
  const [signing, setSigning] = useState(false)
  const [signOffsLoading, setSignOffsLoading] = useState(false)
  const [attachments, setAttachments] = useState<any[]>([])
  const [attachmentsLoading, setAttachmentsLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [sendSignoffOpen, setSendSignoffOpen] = useState(false)
  const [allStaff, setAllStaff] = useState<any[]>([])
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([])
  const [sendingSignoff, setSendingSignoff] = useState(false)

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

  const signPolicy = async (id: string, signatureDataUrl?: string) => {
    setSigning(true)
    try {
      await api.post(`/policies/${id}/sign`, signatureDataUrl ? { signatureUrl: signatureDataUrl } : {})
      toast.success('Policy signed off')
      setSignatureModal(null)
      setCapturedSig(null)
      await load()
      if (viewPolicy?.id === id) {
        const res = await api.get(`/policies/${id}/sign-offs`)
        setSignOffs(res.data.data || [])
      }
    } catch { toast.error('Failed to sign policy') }
    finally { setSigning(false) }
  }

  const openSignModal = (policy: any) => {
    setCapturedSig(null)
    setSignatureModal(policy)
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
                  {p.requires_sign && (
                    <button
                      onClick={() => openDetail(p)}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                      title="View who has signed this policy"
                    >
                      <Users className="w-3 h-3" />
                      {p.signed_count ?? 0} signed
                    </button>
                  )}
                  <Button size="sm" variant="outline" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => openDetail(p)}>View</Button>
                  {p.requires_sign && !p.signed_by_me && (
                    <Button size="sm" icon={<PenLine className="w-3.5 h-3.5" />} onClick={() => openSignModal(p)}>Sign off</Button>
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
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> Sign-offs
                  </p>
                  {isRole('home_manager', 'group_admin', 'deputy_manager', 'admin') && viewPolicy?.requires_sign && (
                    <button
                      onClick={() => { setSendSignoffOpen(true); api.get('/staff').then(r => setAllStaff(r.data.data || [])) }}
                      className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      <Users className="w-3.5 h-3.5" /> Send sign-off request
                    </button>
                  )}
                </div>
                {signOffsLoading ? (
                  <p className="text-xs text-slate-400">Loading...</p>
                ) : signOffs.length === 0 ? (
                  <p className="text-xs text-slate-400">No sign-offs yet</p>
                ) : (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {signOffs.map((so: any) => (
                      <div key={so.id} className="flex items-center gap-2 text-xs text-slate-600">
                        {so.signed_at
                          ? <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                          : <Clock className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                        <span>{so.staff_name}</span>
                        <span className="text-slate-400 capitalize">{so.role?.replace(/_/g, ' ')}</span>
                        <span className="text-slate-400 ml-auto text-right">
                          {so.sent_at && <span>Sent {format(new Date(so.sent_at), 'd MMM yyyy')}</span>}
                          {so.signed_at && <span className="ml-2 text-emerald-600">Signed {format(new Date(so.signed_at), 'd MMM yyyy')}</span>}
                        </span>
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
                <Button size="sm" icon={<PenLine className="w-3.5 h-3.5" />} onClick={() => openSignModal(viewPolicy)}>Sign off</Button>
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

      {/* Send sign-off request modal */}
      {sendSignoffOpen && viewPolicy && (
        <Modal open={sendSignoffOpen} onClose={() => { setSendSignoffOpen(false); setSelectedStaffIds([]) }} title={`Send Sign-off Request: ${viewPolicy.title}`} size="md">
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Select staff members to send a sign-off request to. They will receive an inbox notification.</p>
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left"><input type="checkbox" onChange={e => setSelectedStaffIds(e.target.checked ? allStaff.map(s => s.id) : [])} checked={selectedStaffIds.length === allStaff.length && allStaff.length > 0} /></th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allStaff.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedStaffIds(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id])}>
                      <td className="px-3 py-2"><input type="checkbox" checked={selectedStaffIds.includes(s.id)} readOnly /></td>
                      <td className="px-3 py-2 font-medium text-slate-900">{s.first_name} {s.last_name}</td>
                      <td className="px-3 py-2 text-slate-500 text-xs capitalize">{(s.role || '').replace(/_/g, ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setSendSignoffOpen(false); setSelectedStaffIds([]) }}>Cancel</Button>
              <Button loading={sendingSignoff} disabled={selectedStaffIds.length === 0}
                onClick={async () => {
                  setSendingSignoff(true)
                  try {
                    await api.post(`/policies/${viewPolicy.id}/send-signoff-requests`, { staffIds: selectedStaffIds })
                    toast.success(`Sign-off requests sent to ${selectedStaffIds.length} staff member(s)`)
                    setSendSignoffOpen(false)
                    setSelectedStaffIds([])
                  } catch { toast.error('Failed to send requests') }
                  finally { setSendingSignoff(false) }
                }}>
                Send to {selectedStaffIds.length} staff
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Signature sign-off modal */}
      {signatureModal && (
        <Modal open={!!signatureModal} onClose={() => { setSignatureModal(null); setCapturedSig(null) }} title={`Sign off: ${signatureModal.title}`}>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
              <p className="font-semibold mb-1">By signing below you confirm:</p>
              <ul className="list-disc list-inside text-blue-700 space-y-0.5 text-xs">
                <li>You have read and understood this policy</li>
                <li>You will comply with its requirements in your work</li>
                <li>You understand the consequences of non-compliance</li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Draw your signature below:</p>
              <SignaturePad
                label=""
                onSave={(dataUrl) => setCapturedSig(dataUrl)}
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => { setSignatureModal(null); setCapturedSig(null) }}>Cancel</Button>
              <Button
                icon={<CheckCircle className="w-4 h-4" />}
                disabled={!capturedSig}
                loading={signing}
                onClick={() => signPolicy(signatureModal.id, capturedSig || undefined)}>
                Confirm & Sign
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function AddPolicyModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ title: '', version: '1.0', documentUrl: '', effectiveDate: new Date().toISOString().split('T')[0], reviewDate: '', requiresSign: true })
  const [loading, setLoading] = useState(false)
  const [allStaff, setAllStaff] = useState<any[]>([])
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([])
  const [attachedFile, setAttachedFile] = useState<{ url: string; name: string } | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (open) api.get('/staff').then(r => setAllStaff(r.data.data || [])).catch(() => {})
  }, [open])

  const attachFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFile(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post('/upload/document', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      const url: string = res.data.data.fileUrl
      const name: string = res.data.data.fileName || file.name
      setAttachedFile({ url, name })
      set('documentUrl', url)
      toast.success('File attached')
    } catch { toast.error('Failed to attach file') }
    finally { setUploadingFile(false); if (fileInputRef.current) fileInputRef.current.value = '' }
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload: any = { ...form }
      if (payload.documentUrl && !attachedFile && !/^https?:\/\//i.test(payload.documentUrl)) {
        payload.documentUrl = `https://${payload.documentUrl}`
      }
      const res = await api.post('/policies', payload)
      const newPolicyId = res.data?.data?.id
      if (newPolicyId && selectedStaffIds.length > 0) {
        try { await api.post(`/policies/${newPolicyId}/send-signoff-requests`, { staffIds: selectedStaffIds }) } catch { /* non-fatal */ }
      }
      onSaved()
    }
    catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add policy or procedure" size="md">
      <form onSubmit={save} className="space-y-4">
        <Input label="Policy title *" required value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Safeguarding Policy, Health & Safety..." />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Version" value={form.version} onChange={e => set('version', e.target.value)} placeholder="1.0" />
          <Input label="Effective date" type="date" value={form.effectiveDate} onChange={e => set('effectiveDate', e.target.value)} />
        </div>
        <div>
          <label className="label">Policy document</label>
          <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png" onChange={attachFile} />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60 transition-colors">
            <Paperclip className="w-3.5 h-3.5" />
            {uploadingFile ? 'Uploading...' : attachedFile ? attachedFile.name : 'Attach file (PDF, Word, image...)'}
          </button>
          {!attachedFile && (
            <Input label="Or paste a document URL (optional)" value={form.documentUrl} onChange={e => set('documentUrl', e.target.value)} placeholder="https://..." hint="Link to document in Google Drive, OneDrive, etc." />
          )}
        </div>
        <Input label="Review due date" type="date" value={form.reviewDate} onChange={e => set('reviewDate', e.target.value)} />
        <div className="flex items-center gap-2">
          <input type="checkbox" id="req" checked={form.requiresSign} onChange={e => set('requiresSign', e.target.checked)} className="rounded" />
          <label htmlFor="req" className="text-sm text-slate-700">Requires staff sign-off</label>
        </div>

        {form.requiresSign && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">Who should see this policy? (optional)</label>
              {allStaff.length > 0 && (
                <button type="button" className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  onClick={() => setSelectedStaffIds(prev => prev.length === allStaff.length ? [] : allStaff.map((s: any) => s.id))}>
                  {selectedStaffIds.length === allStaff.length ? 'Clear all' : 'Select all'}
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 mb-2">Selected staff will get this policy in their inbox to sign off. Leave empty to notify everyone later from the policy detail view.</p>
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              {allStaff.length === 0 ? (
                <p className="text-xs text-slate-400 p-3">Loading staff...</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {allStaff.map((s: any) => (
                      <tr key={s.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedStaffIds(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id])}>
                        <td className="px-3 py-1.5 w-8"><input type="checkbox" checked={selectedStaffIds.includes(s.id)} readOnly /></td>
                        <td className="px-3 py-1.5 font-medium text-slate-900">{s.first_name} {s.last_name}</td>
                        <td className="px-3 py-1.5 text-slate-500 text-xs capitalize">{(s.role || '').replace(/_/g, ' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Add policy</Button>
        </div>
      </form>
    </Modal>
  )
}
