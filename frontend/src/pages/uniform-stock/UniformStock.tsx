import React, { useEffect, useState } from 'react'
import { homesApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button, Modal } from '../../components/ui'
import { Shirt, Plus, ArrowDownCircle, ArrowUpCircle, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import SignaturePad from '../../components/SignaturePad'
import { ukDateStr } from '../../utils/ukDate'

const BLANK = {
  staffName: '', logType: 'collection', itemDescription: '',
  logDate: ukDateStr(), logTime: '', notes: '',
  staffSignature: '', managerName: '', managerSignature: '',
}

export default function UniformStock() {
  const { user, isRole } = useAuth()
  const canManage = isRole('home_manager', 'group_admin', 'deputy_manager', 'admin')
  const [entries, setEntries] = useState<any[]>([])
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<any>(BLANK)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
    })
  }, [user])

  useEffect(() => { if (selectedHome) load() }, [selectedHome])

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/uniform-stock', { params: { homeId: selectedHome } })
      setEntries(res.data.data || [])
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.staffName.trim()) { toast.error('Staff name is required'); return }
    if (!form.staffSignature) { toast.error('Staff signature is required'); return }
    setSaving(true)
    try {
      await api.post('/uniform-stock', { ...form, homeId: selectedHome })
      toast.success('Entry recorded')
      setShowForm(false)
      setForm(BLANK)
      load()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to save') }
    finally { setSaving(false) }
  }

  const remove = async (id: string) => {
    if (!window.confirm('Delete this entry?')) return
    try {
      await api.delete(`/uniform-stock/${id}`)
      setEntries(prev => prev.filter(e => e.id !== id))
      toast.success('Deleted')
    } catch { toast.error('Failed to delete') }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shirt className="w-6 h-6" style={{ color: '#e8b130' }} /> Uniform Stock
          </h1>
          <p className="text-slate-400 text-sm mt-1">Collection and return log, with staff and manager sign-off</p>
        </div>
        <Button variant="gold" icon={<Plus className="w-4 h-4" />} onClick={() => { setForm(BLANK); setShowForm(true) }}>
          New Entry
        </Button>
      </div>

      {homes.length > 1 && (
        <select className="input max-w-xs mb-4" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
          {homes.map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
      )}

      {loading ? <Spinner /> : entries.length === 0 ? (
        <EmptyState title="No uniform entries yet"
          description="Record uniform collections and returns here, with sign-off."
          action={<Button variant="gold" onClick={() => setShowForm(true)}>New Entry</Button>} />
      ) : (
        <div className="space-y-2">
          {entries.map(en => (
            <div key={en.id} className="card p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {en.log_type === 'collection'
                  ? <ArrowDownCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  : <ArrowUpCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />}
                <div>
                  <p className="font-semibold text-slate-800">
                    {en.staff_name} — <span className="capitalize">{en.log_type}</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    {format(new Date(en.log_date), 'd MMM yyyy')}{en.log_time ? ` · ${en.log_time.slice(0, 5)}` : ''}
                    {en.item_description ? ` · ${en.item_description}` : ''}
                  </p>
                  {en.notes && <p className="text-xs text-slate-500 mt-0.5">{en.notes}</p>}
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Recorded by {en.recorded_by_name || 'Unknown'}
                    {en.manager_name ? ` · Signed off by ${en.manager_name}` : ' · Manager not yet signed'}
                  </p>
                </div>
              </div>
              {canManage && (
                <button onClick={() => remove(en.id)} className="text-slate-300 hover:text-rose-500 flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Uniform Entry" size="md">
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Staff Name *</label>
            <input className="input" required value={form.staffName} onChange={e => set('staffName', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Type</label>
              <select className="input" value={form.logType} onChange={e => set('logType', e.target.value)}>
                <option value="collection">Collection</option>
                <option value="return">Return</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Item</label>
              <input className="input" placeholder="e.g. Tunic (M) x2" value={form.itemDescription} onChange={e => set('itemDescription', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Date *</label>
              <input type="date" required className="input" value={form.logDate} onChange={e => set('logDate', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Time</label>
              <input type="time" className="input" value={form.logTime} onChange={e => set('logTime', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Note</label>
            <textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>

          <SignaturePad label="Staff signature *" onSave={dataUrl => set('staffSignature', dataUrl)} />

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Manager name (optional — sign off now if available)</label>
            <input className="input" value={form.managerName} onChange={e => set('managerName', e.target.value)} />
          </div>
          <SignaturePad label="Manager signature" onSave={dataUrl => set('managerSignature', dataUrl)} />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" variant="gold" loading={saving}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
