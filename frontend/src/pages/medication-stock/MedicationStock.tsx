import React, { useEffect, useState, useCallback } from 'react'
import api, { homesApi, suApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format, isPast, addDays, isAfter } from 'date-fns'
import { Spinner, Button } from '../../components/ui'
import {
  Pill, Plus, AlertTriangle, ChevronDown, MoreVertical,
  Pencil, Trash2, X, Check,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StockItem {
  id: string
  medication_name: string
  form: string | null
  strength: string | null
  quantity_remaining: number
  unit: string
  expiry_date: string | null
  reorder_threshold: number
  su_id: string | null
  su_name: string | null
  batch_number: string | null
  supplier: string | null
  notes: string | null
  low_stock: boolean
  expired: boolean
  expiring_soon: boolean
}

function formatQty(v: any) {
  const n = Number(v)
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

const ADJUSTMENT_TYPES = [
  { value: 'administered', label: 'Administered' },
  { value: 'received', label: 'Received (new stock)' },
  { value: 'disposed', label: 'Disposed' },
  { value: 'correction', label: 'Stock correction' },
]

const FORM_TYPES = ['tablet', 'capsule', 'liquid', 'patch', 'cream', 'injection', 'inhaler', 'drops', 'suppository', 'other']
const UNIT_TYPES = ['tablets', 'capsules', 'ml', 'patches', 'doses', 'sachets', 'units']

// ─── Helpers ──────────────────────────────────────────────────────────────────

const emptyForm = {
  medicationName: '', form: '', strength: '', quantityRemaining: '', unit: 'tablets',
  expiryDate: '', reorderThreshold: '7', batchNumber: '', supplier: '', notes: '', suId: '',
}

function ExpiryBadge({ date }: { date: string | null }) {
  if (!date) return null
  const d = new Date(date)
  if (isPast(d)) return <span className="text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">Expired</span>
  if (isAfter(addDays(new Date(), 14), d)) return <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">Expires {format(d, 'dd MMM yy')}</span>
  return <span className="text-xs text-slate-500">{format(d, 'dd MMM yy')}</span>
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" style={{ background: '#111111', border: '1px solid rgba(232,177,48,0.15)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(232,177,48,0.12)' }}>
          <h2 className="font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full rounded-xl px-3 py-2 text-sm focus:outline-none text-white placeholder-slate-600" +
  " bg-[#1a1a1a] border border-amber-500/20 focus:border-amber-500/50"

// ─── Add / Edit modal ─────────────────────────────────────────────────────────

function AddEditModal({
  sus, editItem, homeId, onClose, onSaved,
}: {
  sus: any[]; editItem: StockItem | null; homeId: string; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState(editItem ? {
    medicationName: editItem.medication_name,
    form: editItem.form || '',
    strength: editItem.strength || '',
    quantityRemaining: String(editItem.quantity_remaining),
    unit: editItem.unit,
    expiryDate: editItem.expiry_date ? editItem.expiry_date.split('T')[0] : '',
    reorderThreshold: String(editItem.reorder_threshold),
    batchNumber: editItem.batch_number || '',
    supplier: editItem.supplier || '',
    notes: editItem.notes || '',
    suId: editItem.su_id || '',
  } : { ...emptyForm })
  const [saving, setSaving] = useState(false)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    if (!form.medicationName.trim()) { toast.error('Medication name is required'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        homeId,
        quantityRemaining: parseFloat(form.quantityRemaining) || 0,
        reorderThreshold: parseFloat(form.reorderThreshold) || 7,
        suId: form.suId || null,
        expiryDate: form.expiryDate || null,
      }
      if (editItem) {
        await api.put(`/medication-stock/${editItem.id}`, payload)
        toast.success('Medication updated')
      } else {
        await api.post('/medication-stock', payload)
        toast.success('Medication added')
      }
      onSaved()
      onClose()
    } catch {
      toast.error('Failed to save medication')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={editItem ? 'Edit Medication' : 'Add Medication'} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Medication name *">
          <input className={inputCls} value={form.medicationName} onChange={set('medicationName')} placeholder="e.g. Paracetamol" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Form">
            <select className={inputCls} value={form.form} onChange={set('form')}>
              <option value="">Select form</option>
              {FORM_TYPES.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
            </select>
          </Field>
          <Field label="Strength">
            <input className={inputCls} value={form.strength} onChange={set('strength')} placeholder="e.g. 500mg" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity remaining">
            <input type="number" min="0" className={inputCls} value={form.quantityRemaining} onChange={set('quantityRemaining')} />
          </Field>
          <Field label="Unit">
            <select className={inputCls} value={form.unit} onChange={set('unit')}>
              {UNIT_TYPES.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Expiry date">
            <input type="date" className={inputCls} value={form.expiryDate} onChange={set('expiryDate')} />
          </Field>
          <Field label="Reorder threshold">
            <input type="number" min="0" className={inputCls} value={form.reorderThreshold} onChange={set('reorderThreshold')} />
          </Field>
        </div>
        <Field label="Linked resident">
          <select className={inputCls} value={form.suId} onChange={set('suId')}>
            <option value="">— General stock (no resident) —</option>
            {sus.map(su => <option key={su.id} value={su.id}>{su.first_name} {su.last_name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Batch number">
            <input className={inputCls} value={form.batchNumber} onChange={set('batchNumber')} />
          </Field>
          <Field label="Supplier">
            <input className={inputCls} value={form.supplier} onChange={set('supplier')} />
          </Field>
        </div>
        <Field label="Notes (optional)">
          <textarea className={inputCls} rows={2} value={form.notes} onChange={set('notes')} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-gold" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : (editItem ? 'Save changes' : 'Add medication')}</button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Adjust modal ─────────────────────────────────────────────────────────────

function AdjustModal({ item, onClose, onSaved }: { item: StockItem; onClose: () => void; onSaved: () => void }) {
  const [adjustmentType, setAdjustmentType] = useState('administered')
  const [quantityChange, setQuantityChange] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const isReceived = adjustmentType === 'received'

  const handleAdjust = async () => {
    const rawQty = parseFloat(quantityChange)
    if (isNaN(rawQty) || rawQty === 0) { toast.error('Enter a valid quantity'); return }
    const change = isReceived ? Math.abs(rawQty) : -Math.abs(rawQty)
    setSaving(true)
    try {
      await api.post(`/medication-stock/${item.id}/adjust`, {
        adjustmentType,
        quantityChange: change,
        notes: notes || null,
      })
      toast.success('Stock adjusted')
      onSaved()
      onClose()
    } catch {
      toast.error('Failed to adjust stock')
    } finally {
      setSaving(false)
    }
  }

  const preview = (() => {
    const raw = parseFloat(quantityChange)
    if (isNaN(raw) || raw === 0) return null
    const change = isReceived ? Math.abs(raw) : -Math.abs(raw)
    return Math.max(0, item.quantity_remaining + change)
  })()

  return (
    <Modal title={`Adjust Stock — ${item.medication_name}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-xl p-3 text-center" style={{ background: '#1a1a1a', border: '1px solid rgba(232,177,48,0.15)' }}>
          <p className="text-xs text-slate-500">Current quantity</p>
          <p className="text-3xl font-bold text-white">{formatQty(item.quantity_remaining)} <span className="text-sm font-normal text-slate-500">{item.unit}</span></p>
        </div>
        <Field label="Reason">
          <select className={inputCls} value={adjustmentType} onChange={e => setAdjustmentType(e.target.value)}>
            {ADJUSTMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label={isReceived ? 'Quantity received' : 'Quantity to deduct'}>
          <input
            type="number" min="0" step="0.5" className={inputCls}
            value={quantityChange} onChange={e => setQuantityChange(e.target.value)}
            placeholder="0"
          />
        </Field>
        {preview !== null && (
          <div className="text-center text-sm">
            New quantity will be: <span className={`font-bold ${preview <= item.reorder_threshold ? 'text-amber-600' : 'text-emerald-600'}`}>{preview} {item.unit}</span>
          </div>
        )}
        <Field label="Notes (optional)">
          <textarea className={inputCls} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Administered to patient at 09:00..." />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-gold" onClick={handleAdjust} disabled={saving}>{saving ? 'Saving...' : 'Confirm adjustment'}</button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Stock card ───────────────────────────────────────────────────────────────

function StockCard({
  item, onEdit, onDelete, onAdjust,
}: {
  item: StockItem; onEdit: () => void; onDelete: () => void; onAdjust: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const isLow = item.low_stock
  const isExpired = item.expired
  const isSoon = item.expiring_soon

  return (
    <div className="rounded-xl p-4 flex flex-col gap-3 relative" style={{
      background: '#111111',
      border: `1px solid ${isExpired ? 'rgba(239,68,68,0.4)' : isLow ? 'rgba(245,158,11,0.4)' : 'rgba(232,177,48,0.15)'}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
    }}>
      {/* Badges row */}
      <div className="flex flex-wrap gap-1.5 min-h-[20px]">
        {isExpired && <span className="badge badge-critical">Expired</span>}
        {isSoon && !isExpired && <span className="badge badge-warning">Expiring soon</span>}
        {isLow && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' }}>
            <AlertTriangle className="w-3 h-3" />LOW STOCK
          </span>
        )}
      </div>

      {/* Name & details */}
      <div>
        <p className="font-semibold text-white">{item.medication_name}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {[item.form, item.strength].filter(Boolean).join(' · ')}
        </p>
        {item.su_name && (
          <p className="text-xs text-amber-400 font-medium mt-1">{item.su_name}</p>
        )}
      </div>

      {/* Quantity */}
      <div className="flex items-end justify-between">
        <div>
          <span className={`text-2xl font-bold ${isLow ? 'text-amber-400' : 'text-white'}`}>{formatQty(item.quantity_remaining)}</span>
          <span className="text-sm text-slate-500 ml-1">{item.unit}</span>
          <p className="text-xs text-slate-500 mt-0.5">Reorder at ≤ {item.reorder_threshold}</p>
        </div>
        <button
          onClick={onAdjust}
          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg leading-none text-amber-400 hover:text-amber-300 transition-colors"
          style={{ background: 'rgba(232,177,48,0.1)', border: '1px solid rgba(232,177,48,0.2)' }}
          title="Adjust quantity"
        >
          ±
        </button>
      </div>

      {/* Expiry */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">Expiry:</span>
        <ExpiryBadge date={item.expiry_date} />
        {!item.expiry_date && <span className="text-slate-500">—</span>}
      </div>

      {/* Menu */}
      <div className="absolute top-3 right-3">
        <button onClick={() => setMenuOpen(o => !o)} className="p-1 rounded-lg hover:bg-white/5">
          <MoreVertical className="w-4 h-4 text-slate-500" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-7 z-20 rounded-xl shadow-xl w-36 py-1" style={{ background: '#1a1a1a', border: '1px solid rgba(232,177,48,0.15)' }}>
            <button className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2"
              onClick={() => { setMenuOpen(false); onEdit() }}>
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-rose-400 hover:bg-rose-500/10 flex items-center gap-2"
              onClick={() => { setMenuOpen(false); onDelete() }}>
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MedicationStock() {
  const { user } = useAuth()
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [sus, setSus] = useState<any[]>([])
  const [filterSu, setFilterSu] = useState('')
  const [items, setItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<StockItem | null>(null)
  const [adjustItem, setAdjustItem] = useState<StockItem | null>(null)

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
    }).catch(() => {})
  }, [user])

  useEffect(() => {
    if (!selectedHome) return
    suApi.list(selectedHome, { status: 'live' }).then(res => setSus(res.data.data || [])).catch(() => {})
  }, [selectedHome])

  const load = useCallback(async () => {
    if (!selectedHome) return
    setLoading(true)
    try {
      const params: any = { homeId: selectedHome }
      if (filterSu) params.suId = filterSu
      const res = await api.get('/medication-stock', { params })
      setItems(res.data.data || [])
    } catch {
      toast.error('Failed to load medication stock')
    } finally {
      setLoading(false)
    }
  }, [selectedHome, filterSu])

  useEffect(() => { load() }, [load])

  const handleDelete = async (item: StockItem) => {
    if (!window.confirm(`Delete ${item.medication_name}? This cannot be undone.`)) return
    try {
      await api.delete(`/medication-stock/${item.id}`)
      toast.success('Deleted')
      load()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const alerts = items.filter(i => i.low_stock || i.expired || i.expiring_soon)
  const lowStockItems = items.filter(i => i.low_stock)

  // Sort: low-stock items bubble to the top, then expired, then expiring soon, then normal
  const sortedItems = [...items].sort((a, b) => {
    const score = (i: StockItem) =>
      i.low_stock && i.expired ? 0 : i.low_stock ? 1 : i.expired ? 2 : i.expiring_soon ? 3 : 4
    return score(a) - score(b)
  })

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Pill className="w-6 h-6 text-amber-400" />
          <h1 className="text-2xl font-bold text-white">Medication Stock</h1>
        </div>
        <div className="flex items-center gap-2">
          {homes.length > 1 && (
            <select className="input w-auto text-sm" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
              {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
          <button className="btn-gold" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" /> Add medication
          </button>
        </div>
      </div>

      {/* Low stock red banner */}
      {lowStockItems.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)' }}>
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <p className="text-sm font-semibold text-rose-400">
            ⚠ {lowStockItems.length} medication{lowStockItems.length !== 1 ? 's are' : ' is'} at or below minimum stock levels
          </p>
        </div>
      )}

      {/* Filter by resident */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm text-slate-400 font-medium whitespace-nowrap">Filter by resident:</label>
        <select className="input w-auto text-sm max-w-xs" value={filterSu} onChange={e => setFilterSu(e.target.value)}>
          <option value="">All residents + general stock</option>
          {sus.map(su => <option key={su.id} value={su.id}>{su.first_name} {su.last_name}</option>)}
        </select>
      </div>

      {/* Alert banner (expired / expiring soon / low stock details) */}
      {alerts.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl px-4 py-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-400">Stock alerts</p>
            <ul className="text-sm text-amber-300/80 mt-1 space-y-0.5 list-disc list-inside">
              {alerts.filter(i => i.expired).length > 0 && (
                <li>{alerts.filter(i => i.expired).length} medication{alerts.filter(i => i.expired).length !== 1 ? 's have' : ' has'} expired</li>
              )}
              {alerts.filter(i => i.expiring_soon && !i.expired).length > 0 && (
                <li>{alerts.filter(i => i.expiring_soon && !i.expired).length} medication{alerts.filter(i => i.expiring_soon && !i.expired).length !== 1 ? 's are' : ' is'} expiring within 14 days</li>
              )}
              {lowStockItems.length > 0 && (
                <li>{lowStockItems.length} medication{lowStockItems.length !== 1 ? 's are' : ' is'} below reorder threshold</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Stock grid */}
      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Pill className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-white">No medication stock recorded</p>
          <p className="text-sm mt-1">Click "Add medication" to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedItems.map(item => (
            <StockCard
              key={item.id}
              item={item}
              onEdit={() => setEditItem(item)}
              onDelete={() => handleDelete(item)}
              onAdjust={() => setAdjustItem(item)}
            />
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      {(addOpen || editItem) && (
        <AddEditModal
          sus={sus}
          editItem={editItem}
          homeId={selectedHome}
          onClose={() => { setAddOpen(false); setEditItem(null) }}
          onSaved={load}
        />
      )}

      {/* Adjust modal */}
      {adjustItem && (
        <AdjustModal
          item={adjustItem}
          onClose={() => setAdjustItem(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
