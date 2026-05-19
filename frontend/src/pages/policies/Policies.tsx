import React, { useEffect, useState } from 'react'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Input } from '../../components/ui'
import { BookOpen, Plus, CheckCircle, Clock, ExternalLink, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Policies() {
  const { user, isRole } = useAuth()
  const [policies, setPolicies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/policies')
      setPolicies(res.data.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const deletePolicy = async (id: string) => {
    if (!window.confirm('Delete this policy? This cannot be undone.')) return
    try {
      await api.delete(`/policies/${id}`)
      toast.success('Policy deleted')
      await load()
    } catch { toast.error('Failed to delete policy') }
  }

  const signPolicy = async (id: string) => {
    try {
      await api.post(`/policies/${id}/sign`)
      toast.success('Policy signed off')
      await load()
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
        {isRole('home_manager', 'group_admin') && (
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>Add policy</Button>
        )}
      </div>

      {loading ? <Spinner /> : policies.length === 0 ? (
        <EmptyState title="No policies added yet" description="Add your organisation's policies and procedures"
          action={isRole('home_manager', 'group_admin') ? <Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>Add policy</Button> : undefined} />
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
                  {p.document_url && (
                    <a href={/^https?:\/\//i.test(p.document_url) ? p.document_url : `https://${p.document_url}`} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline" icon={<ExternalLink className="w-3.5 h-3.5" />}>View</Button>
                    </a>
                  )}
                  {p.requires_sign && !p.signed_by_me && (
                    <Button size="sm" icon={<CheckCircle className="w-3.5 h-3.5" />} onClick={() => signPolicy(p.id)}>Sign off</Button>
                  )}
                  {isRole('home_manager', 'group_admin') && (
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
        <Input label="Document URL (link to document)" value={form.documentUrl} onChange={e => set('documentUrl', e.target.value)} placeholder="https://..." hint="Link to your document in Google Drive, OneDrive, etc." />
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
