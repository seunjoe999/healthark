import React, { useEffect, useState } from 'react'
import { homesApi, suApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Select } from '../../components/ui'
import { Banknote, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { ukDateStr } from '../../utils/ukDate'

function getName(p: any) {
  return `${p?.first_name || p?.firstName || ''} ${p?.last_name || p?.lastName || ''}`.trim()
}

const PAYMENT_TYPES = [
  { value: 'rent', label: 'Rent' },
  { value: 'service_charge', label: 'Service Charge' },
  { value: 'other', label: 'Other' },
]

const BLANK = {
  suId: '', weekOfPayment: '', paymentType: 'rent', amount: '', paymentDate: ukDateStr(),
  staffOnShift: '', notes: '',
}

export default function FinanceTracking() {
  const { user, isRole } = useAuth()
  const canManage = isRole('home_manager', 'group_admin', 'deputy_manager', 'admin', 'director', 'registered_manager', 'service_manager')
  const [entries, setEntries] = useState<any[]>([])
  const [sus, setSus] = useState<any[]>([])
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

  useEffect(() => {
    if (!selectedHome) return
    suApi.list(selectedHome, { status: 'live' }).then(res => setSus(res.data.data || []))
    load()
  }, [selectedHome])

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/finance-tracking', { params: { homeId: selectedHome } })
      setEntries(res.data.data || [])
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.amount || !form.paymentDate) { toast.error('Amount and payment date are required'); return }
    setSaving(true)
    try {
      await api.post('/finance-tracking', { ...form, homeId: selectedHome })
      toast.success('Payment recorded')
      setShowForm(false)
      setForm(BLANK)
      load()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to save') }
    finally { setSaving(false) }
  }

  const remove = async (id: string) => {
    if (!window.confirm('Delete this payment record?')) return
    try {
      await api.delete(`/finance-tracking/${id}`)
      setEntries(prev => prev.filter(e => e.id !== id))
      toast.success('Deleted')
    } catch { toast.error('Failed to delete') }
  }

  const total = entries.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)

  if (!canManage) return <div className="p-8"><EmptyState title="Not available" description="This page is only available to management." /></div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Banknote className="w-6 h-6" style={{ color: '#e8b130' }} /> Finance Tracking
          </h1>
          <p className="text-slate-400 text-sm mt-1">Resident rent, service charge, and other payments</p>
        </div>
        <Button variant="gold" icon={<Plus className="w-4 h-4" />} onClick={() => { setForm(BLANK); setShowForm(true) }}>
          New Payment
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        {homes.length > 1 && (
          <select className="input max-w-xs" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
            {homes.map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        )}
        {entries.length > 0 && (
          <p className="text-sm text-slate-500">Total: <strong className="text-slate-800">£{total.toFixed(2)}</strong> across {entries.length} payment{entries.length !== 1 ? 's' : ''}</p>
        )}
      </div>

      {loading ? <Spinner /> : entries.length === 0 ? (
        <EmptyState title="No payments recorded yet"
          description="Record rent, service charge, and other resident payments here."
          action={<Button variant="gold" onClick={() => setShowForm(true)}>New Payment</Button>} />
      ) : (
        <div className="space-y-2">
          {entries.map(en => (
            <div key={en.id} className="card p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-800">
                  {en.su_name || 'General'} — <span className="capitalize">{(en.payment_type || '').replace(/_/g, ' ')}</span>
                </p>
                <p className="text-xs text-slate-400">
                  Paid {format(new Date(en.payment_date), 'd MMM yyyy')}
                  {en.week_of_payment ? ` · Week of ${format(new Date(en.week_of_payment), 'd MMM yyyy')}` : ''}
                  {en.staff_on_shift ? ` · Staff on shift: ${en.staff_on_shift}` : ''}
                </p>
                {en.notes && <p className="text-xs text-slate-500 mt-0.5">{en.notes}</p>}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <p className="font-bold text-emerald-600">£{parseFloat(en.amount || 0).toFixed(2)}</p>
                <button onClick={() => remove(en.id)} className="text-slate-300 hover:text-rose-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Payment" size="md">
        <form onSubmit={save} className="space-y-4">
          <Select label="Service User (optional)" options={sus.map(s => ({ value: s.id, label: getName(s) }))}
            placeholder="General / not resident-specific" value={form.suId} onChange={e => set('suId', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Week of Payment</label>
              <input type="date" className="input" value={form.weekOfPayment} onChange={e => set('weekOfPayment', e.target.value)} />
            </div>
            <Select label="Type of Payment" options={PAYMENT_TYPES} value={form.paymentType} onChange={e => set('paymentType', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Amount (£) *</label>
              <input type="number" step="0.01" min="0" required className="input" value={form.amount} onChange={e => set('amount', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Payment Date *</label>
              <input type="date" required className="input" value={form.paymentDate} onChange={e => set('paymentDate', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Staff on Shift</label>
            <input className="input" value={form.staffOnShift} onChange={e => set('staffOnShift', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" variant="gold" loading={saving}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
