import React, { useEffect, useState } from 'react'
import { homesApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Input } from '../../components/ui'
import { Package, Plus, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PPE() {
  const { user, isRole } = useAuth()
  const [items, setItems] = useState<any[]>([])
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [loading, setLoading] = useState(true)
  const [addItemOpen, setAddItemOpen] = useState(false)
  const [txItem, setTxItem] = useState<any>(null)

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
      const res = await api.get('/ppe', { params: { homeId: selectedHome } })
      setItems(res.data.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const stockLevel = (item: any) => {
    const pct = item.current_stock / item.min_stock
    if (item.current_stock === 0) return { color: 'text-red-700 bg-red-100', label: 'Out of stock' }
    if (pct <= 1) return { color: 'text-orange-700 bg-orange-100', label: 'Low stock' }
    return { color: 'text-green-700 bg-green-100', label: 'In stock' }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-purple-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-purple-600" /> PPE Stock
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{items.length} item{items.length !== 1 ? 's' : ''} tracked</p>
        </div>
        <div className="flex gap-3">
          {homes.length > 1 && <select className="input w-auto" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>{homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select>}
          {isRole('home_manager', 'group_admin', 'deputy_manager', 'admin') && <Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddItemOpen(true)}>Add item</Button>}
        </div>
      </div>

      {/* Low stock alert banner */}
      {items.some(i => i.current_stock <= i.min_stock) && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
          <p className="text-sm text-orange-700 font-medium">
            {items.filter(i => i.current_stock <= i.min_stock).length} item(s) are at or below minimum stock level — reorder required
          </p>
        </div>
      )}

      {loading ? <Spinner /> : items.length === 0 ? (
        <EmptyState title="No PPE items tracked" description="Add PPE items to start tracking stock levels"
          action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddItemOpen(true)}>Add item</Button>} />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((item: any) => {
            const level = stockLevel(item)
            return (
              <div key={item.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{item.item_name}</h3>
                    {item.item_variant && <p className="text-xs text-slate-500 mt-0.5">{item.item_variant}</p>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${level.color}`}>{level.label}</span>
                </div>
                <div className="flex items-center gap-6 mb-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-slate-900">{item.current_stock}</p>
                    <p className="text-xs text-slate-500">{item.unit}</p>
                  </div>
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all ${item.current_stock === 0 ? 'bg-red-500' : item.current_stock <= item.min_stock ? 'bg-orange-400' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(100, (item.current_stock / (item.min_stock * 3)) * 100)}%` }} />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-500">Min: {item.min_stock}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setTxItem({ ...item, txType: 'in' })}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-colors border border-green-200">
                    <TrendingUp className="w-4 h-4" /> Stock in
                  </button>
                  <button onClick={() => setTxItem({ ...item, txType: 'out' })}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors border border-red-200">
                    <TrendingDown className="w-4 h-4" /> Stock out
                  </button>
                </div>
                {item.updated_at && <p className="text-xs text-slate-400 mt-2">Last updated {format(new Date(item.updated_at), 'd MMM yyyy, HH:mm')}</p>}
              </div>
            )
          })}
        </div>
      )}

      <AddItemModal open={addItemOpen} onClose={() => setAddItemOpen(false)} homeId={selectedHome}
        onSaved={async () => { setAddItemOpen(false); await load(); toast.success('Item added') }} />

      {txItem && (
        <TransactionModal item={txItem} onClose={() => setTxItem(null)}
          onSaved={async () => { setTxItem(null); await load(); toast.success('Stock updated') }} />
      )}
    </div>
  )
}

function AddItemModal({ open, onClose, homeId, onSaved }: { open: boolean; onClose: () => void; homeId: string; onSaved: () => void }) {
  const [form, setForm] = useState({ itemName: '', itemVariant: '', currentStock: '0', minStock: '10', unit: 'units' })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try { await api.post('/ppe', { homeId, ...form, currentStock: parseInt(form.currentStock), minStock: parseInt(form.minStock) }); onSaved() }
    catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add PPE item">
      <form onSubmit={save} className="space-y-4">
        <Input label="Item name *" required value={form.itemName} onChange={e => set('itemName', e.target.value)} placeholder="e.g. Disposable gloves, Face masks..." />
        <Input label="Variant / size" value={form.itemVariant} onChange={e => set('itemVariant', e.target.value)} placeholder="e.g. Large, Medium, FFP2..." />
        <div className="grid grid-cols-3 gap-3">
          <Input label="Current stock" type="number" value={form.currentStock} onChange={e => set('currentStock', e.target.value)} />
          <Input label="Minimum stock" type="number" value={form.minStock} onChange={e => set('minStock', e.target.value)} hint="Alert threshold" />
          <Input label="Unit" value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="units, boxes..." />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Add item</Button>
        </div>
      </form>
    </Modal>
  )
}

function TransactionModal({ item, onClose, onSaved }: { item: any; onClose: () => void; onSaved: () => void }) {
  const [qty, setQty] = useState('1')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const isIn = item.txType === 'in'

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post(`/ppe/${item.id}/transaction`, { transactionType: item.txType, quantity: parseInt(qty), notes })
      onSaved()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={true} onClose={onClose} title={`${isIn ? 'Stock in' : 'Stock out'} — ${item.item_name}`} size="sm">
      <form onSubmit={save} className="space-y-4">
        <div className="text-center p-4 bg-slate-50 rounded-lg">
          <p className="text-sm text-slate-500">Current stock</p>
          <p className="text-3xl font-bold text-slate-900">{item.current_stock} {item.unit}</p>
          {!isIn && parseInt(qty) > item.current_stock && <p className="text-xs text-red-600 mt-1">⚠ Exceeds current stock</p>}
        </div>
        <Input label="Quantity" type="number" required min="1" value={qty} onChange={e => setQty(e.target.value)} />
        <div><label className="label">Notes (optional)</label><textarea className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reason, supplier, etc..." /></div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading} variant={isIn ? 'teal' : 'danger'}>{isIn ? 'Add to stock' : 'Remove from stock'}</Button>
        </div>
      </form>
    </Modal>
  )
}
