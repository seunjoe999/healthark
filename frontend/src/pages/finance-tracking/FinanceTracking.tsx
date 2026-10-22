import React, { useEffect, useState, useMemo } from 'react'
import { homesApi, suApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Select } from '../../components/ui'
import { Banknote, Plus, Trash2, Search, X, Download, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { ukDateStr } from '../../utils/ukDate'
import { downloadCsv } from '../../utils/exportTable'
import { printLetterheadTable } from '../../utils/letterheadPrint'

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
  const canManage = isRole('home_manager', 'group_admin', 'deputy_manager', 'admin', 'recruitment_admin', 'director', 'registered_manager', 'service_manager', 'super_admin')
  const [entries, setEntries] = useState<any[]>([])
  const [sus, setSus] = useState<any[]>([])
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<any>(BLANK)
  const [saving, setSaving] = useState(false)

  // Search & Filter bar state (Service User, Date From, Date To, Payment Type, Keyword Search)
  const [filterSuId, setFilterSuId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterPaymentType, setFilterPaymentType] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

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
    } catch { toast.error('Failed to load finance entries') }
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

  const filteredEntries = useMemo(() => {
    return entries.filter(en => {
      const pDate = en.payment_date ? String(en.payment_date).slice(0, 10) : ''
      if (filterSuId) {
        if (filterSuId === 'general') {
          if (en.su_id) return false
        } else if (en.su_id !== filterSuId) {
          return false
        }
      }
      if (filterPaymentType !== 'all' && en.payment_type !== filterPaymentType) return false
      if (dateFrom && pDate && pDate < dateFrom) return false
      if (dateTo && pDate && pDate > dateTo) return false
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        const hay = `${en.su_name || 'General'} ${(en.payment_type || '').replace(/_/g, ' ')} ${en.staff_on_shift || ''} ${en.notes || ''} ${en.amount || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [entries, filterSuId, filterPaymentType, dateFrom, dateTo, searchQuery])

  const hasFilters = Boolean(filterSuId || dateFrom || dateTo || filterPaymentType !== 'all' || searchQuery.trim())

  const clearFilters = () => {
    setFilterSuId('')
    setDateFrom('')
    setDateTo('')
    setFilterPaymentType('all')
    setSearchQuery('')
  }

  const filteredTotal = filteredEntries.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)

  const exportCols = [
    { key: 'service_user', label: 'Service User' },
    { key: 'payment_type', label: 'Payment Type' },
    { key: 'payment_date', label: 'Payment Date' },
    { key: 'week_of_payment', label: 'Week of Payment' },
    { key: 'amount', label: 'Amount (£)' },
    { key: 'staff_on_shift', label: 'Staff on Shift' },
    { key: 'notes', label: 'Notes' },
  ]
  const exportRows = filteredEntries.map(en => ({
    service_user: en.su_name || 'General',
    payment_type: (en.payment_type || '').replace(/_/g, ' '),
    payment_date: en.payment_date ? format(new Date(en.payment_date), 'd MMM yyyy') : '—',
    week_of_payment: en.week_of_payment ? format(new Date(en.week_of_payment), 'd MMM yyyy') : '—',
    amount: `£${parseFloat(en.amount || 0).toFixed(2)}`,
    staff_on_shift: en.staff_on_shift || '—',
    notes: en.notes || '—',
  }))

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Banknote className="w-6 h-6" style={{ color: '#e8b130' }} /> Finance Tracking
          </h1>
          <p className="text-slate-400 text-sm mt-1">Resident rent, service charge, and other payments</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {homes.length > 1 && (
            <select className="input w-auto text-sm" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
              {homes.map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
          {filteredEntries.length > 0 && (
            <>
              <Button size="sm" variant="secondary" icon={<FileText className="w-3.5 h-3.5" />}
                onClick={() => {
                  const sub = dateFrom || dateTo ? `Period: ${dateFrom || 'Start'} to ${dateTo || 'Present'} · Total £${filteredTotal.toFixed(2)}` : `Total £${filteredTotal.toFixed(2)}`
                  if (!printLetterheadTable('Finance Tracking Report', exportCols, exportRows, sub)) {
                    toast.error('Please allow pop-ups to print / save PDF')
                  }
                }}>
                Print / PDF
              </Button>
              <Button size="sm" variant="secondary" icon={<Download className="w-3.5 h-3.5" />}
                onClick={() => downloadCsv('finance-tracking', exportCols, exportRows)}>
                Export CSV
              </Button>
            </>
          )}
          <Button variant="gold" icon={<Plus className="w-4 h-4" />} onClick={() => { setForm(BLANK); setShowForm(true) }}>
            New Payment
          </Button>
        </div>
      </div>

      {/* Search & Date Range Filter Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">Service User</label>
            <select className="input text-sm w-full" value={filterSuId} onChange={e => setFilterSuId(e.target.value)}>
              <option value="">All Service Users</option>
              <option value="general">General / Non-Resident</option>
              {sus.map(s => <option key={s.id} value={s.id}>{getName(s)}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">Date From</label>
            <input type="date" className="input text-sm w-full" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">Date To</label>
            <input type="date" className="input text-sm w-full" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">Payment Type</label>
            <select className="input text-sm w-full" value={filterPaymentType} onChange={e => setFilterPaymentType(e.target.value)}>
              <option value="all">All Payment Types</option>
              {PAYMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                className="input pl-9 text-sm w-full"
                placeholder="Resident, staff, notes…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <p className="text-xs text-slate-500">
            Showing <strong className="text-slate-800">{filteredEntries.length}</strong> of {entries.length} payment{entries.length !== 1 ? 's' : ''}
            {' · '}Total: <strong className="text-emerald-700">£{filteredTotal.toFixed(2)}</strong>
          </p>
          {hasFilters && (
            <button type="button" onClick={clearFilters}
              className="text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Clear filters
            </button>
          )}
        </div>
      </div>

      {loading ? <Spinner /> : entries.length === 0 ? (
        <EmptyState title="No payments recorded yet"
          description="Record rent, service charge, and other resident payments here."
          action={<Button variant="gold" onClick={() => setShowForm(true)}>New Payment</Button>} />
      ) : filteredEntries.length === 0 ? (
        <EmptyState title="No payments match your filters"
          description="Adjust the Service User, Date From / Date To, or keyword search above."
          action={<Button variant="outline" onClick={clearFilters}>Clear Filters</Button>} />
      ) : (
        <div className="space-y-2">
          {filteredEntries.map(en => (
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
                {canManage && (
                  <button onClick={() => remove(en.id)} className="text-slate-300 hover:text-rose-500" title="Delete payment">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
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
