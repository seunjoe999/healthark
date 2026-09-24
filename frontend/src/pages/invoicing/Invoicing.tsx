import React, { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api'
import { ukDateStr } from '../../utils/ukDate'
import { Spinner, EmptyState, Button, Modal, Input, Select } from '../../components/ui'
import { Plus, Download, Check, X, ChevronDown, Eye, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Invoice {
  id: string
  su_id: string
  first_name: string
  last_name: string
  month_date: string
  commissioned_hours: number
  hourly_rate: number
  invoice_amount: number
  status: 'pending' | 'approved' | 'rejected' | 'paid'
  notes?: string
  created_at: string
  sent_to?: string | null
  sent_at?: string | null
}

export default function Invoicing() {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'paid'>('all')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [detailModal, setDetailModal] = useState<Invoice | null>(null)
  const [generateModalOpen, setGenerateModalOpen] = useState(false)

  const loadInvoices = useCallback(async () => {
    if (!user?.homeId) return
    setLoading(true)
    try {
      const res = await api.get(`/invoicing?homeId=${user.homeId}&status=${filter === 'all' ? 'all' : filter}`)
      setInvoices(res.data.data || [])
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }, [user?.homeId, filter])

  useEffect(() => {
    loadInvoices()
  }, [loadInvoices])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this invoice?')) return
    try {
      await api.delete(`/invoicing/${id}`)
      toast.success('Invoice deleted')
      loadInvoices()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to delete')
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.patch(`/invoicing/${id}`, { status })
      toast.success(`Invoice marked as ${status}`)
      loadInvoices()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update')
    }
  }

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      approved: 'bg-blue-50 text-blue-700 border-blue-200',
      paid: 'bg-green-50 text-green-700 border-green-200',
      rejected: 'bg-red-50 text-red-700 border-red-200',
    }
    return colors[status] || 'bg-slate-50 text-slate-700 border-slate-200'
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Invoicing</h1>
          <p className="text-sm text-slate-500 mt-1">Manage monthly resident invoices</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setGenerateModalOpen(true)}>Generate Monthly</Button>
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setCreateModalOpen(true)}>Create Invoice</Button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex gap-2">
        {['all', 'pending', 'approved', 'paid'].map(f => (
          <button key={f} onClick={() => setFilter(f as any)} className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${ filter === f ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Spinner />
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState title="No invoices" description="No invoices found for the selected filter" action={<Button onClick={() => setCreateModalOpen(true)}>Create Invoice</Button>} />
        ) : (
          <div className="p-6 space-y-3">
            {invoices.map(inv => (
              <div key={inv.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-sm transition-shadow">
                <div className="p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50" onClick={() => setDetailModal(inv)}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-semibold text-slate-800">{inv.first_name} {inv.last_name}</p>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusColor(inv.status)}`}>{inv.status}</span>
                      {inv.sent_at && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-purple-50 text-purple-700 border-purple-200">
                          Sent {new Date(inv.sent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">Month: {new Date(inv.month_date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Hours</p>
                      <p className="font-semibold text-slate-800">{inv.commissioned_hours ? parseFloat(String(inv.commissioned_hours)).toFixed(1) : '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Amount</p>
                      <p className="font-bold text-slate-800">£{parseFloat(String(inv.invoice_amount || 0)).toFixed(2)}</p>
                    </div>
                    <select className="text-xs px-2 py-1 border border-slate-200 rounded cursor-pointer" onChange={e => { e.stopPropagation(); handleStatusChange(inv.id, e.target.value); }} value={inv.status}>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="paid">Paid</option>
                    </select>
                    <button onClick={e => { e.stopPropagation(); handleDelete(inv.id); }} className="text-slate-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <CreateInvoiceModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} homeId={user?.homeId || ''} onSaved={loadInvoices} />
      <GenerateMonthlyModal open={generateModalOpen} onClose={() => setGenerateModalOpen(false)} homeId={user?.homeId || ''} onGenerated={loadInvoices} />
      {detailModal && <InvoiceDetailModal invoice={detailModal} onClose={() => setDetailModal(null)}
        onStatusChange={(status) => { handleStatusChange(detailModal.id, status); setDetailModal(null); }}
        onSent={() => { loadInvoices(); setDetailModal(null); }} />}
    </div>
  )
}

function CreateInvoiceModal({ open, onClose, homeId, onSaved }: { open: boolean; onClose: () => void; homeId: string; onSaved: () => void }) {
  const [form, setForm] = useState({ suId: '', monthDate: '', commissionedHours: '', invoiceAmount: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<any[]>([])

  useEffect(() => {
    if (open) {
      api.get(`/service-users?homeId=${homeId}&status=live`).then(res => setUsers(res.data.data || []))
    }
  }, [open, homeId])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.suId || !form.monthDate || !form.invoiceAmount) {
      toast.error('Please fill required fields')
      return
    }
    setLoading(true)
    try {
      await api.post('/invoicing', { homeId, ...form })
      toast.success('Invoice created')
      setForm({ suId: '', monthDate: '', commissionedHours: '', invoiceAmount: '', notes: '' })
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Invoice" size="md">
      <form onSubmit={save} className="space-y-4">
        <Select label="Service User *" required value={form.suId} onChange={e => setForm(p => ({ ...p, suId: e.target.value }))} options={users.map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name}` }))} placeholder="Select resident" />
        <Input label="Month *" type="month" required value={form.monthDate} onChange={e => setForm(p => ({ ...p, monthDate: e.target.value }))} />
        <Input label="Commissioned Hours" type="number" step="0.5" value={form.commissionedHours} onChange={e => setForm(p => ({ ...p, commissionedHours: e.target.value }))} />
        <Input label="Invoice Amount £ *" type="number" required step="0.01" value={form.invoiceAmount} onChange={e => setForm(p => ({ ...p, invoiceAmount: e.target.value }))} />
        <textarea className="input" placeholder="Notes..." rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Create Invoice</Button>
        </div>
      </form>
    </Modal>
  )
}

function GenerateMonthlyModal({ open, onClose, homeId, onGenerated }: { open: boolean; onClose: () => void; homeId: string; onGenerated: () => void }) {
  const [monthDate, setMonthDate] = useState(ukDateStr())
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const res = await api.post('/invoicing/generate-monthly', { homeId, monthDate })
      toast.success(res.data.message || 'Invoices generated')
      onGenerated()
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Generate Monthly Invoices" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">Auto-generate invoices for this month based on staff shifts assigned to residents.</p>
        <Input label="Month" type="month" value={monthDate} onChange={e => setMonthDate(e.target.value)} />
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={generate}>Generate Invoices</Button>
        </div>
      </div>
    </Modal>
  )
}

function InvoiceDetailModal({ invoice, onClose, onStatusChange, onSent }: { invoice: Invoice; onClose: () => void; onStatusChange: (status: string) => void; onSent: () => void }) {
  const [sending, setSending] = useState(false)
  const [emailInput, setEmailInput] = useState(invoice.sent_to || '')
  const [showSendForm, setShowSendForm] = useState(false)

  const sendInvoice = async () => {
    const emails = emailInput.split(',').map(e => e.trim()).filter(Boolean)
    if (emails.length === 0) { toast.error('Enter at least one recipient email'); return }
    const invalid = emails.find(e => !/^\S+@\S+\.\S+$/.test(e))
    if (invalid) { toast.error(`Invalid email: ${invalid}`); return }
    setSending(true)
    try {
      const res = await api.post(`/invoicing/${invoice.id}/send`, { emails })
      toast.success(res.data.message || 'Invoice sent')
      onSent()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to send invoice')
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={`Invoice - ${invoice.first_name} ${invoice.last_name}`} size="sm">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded">
          <div>
            <p className="text-xs text-slate-500 font-semibold">Month</p>
            <p className="font-semibold text-slate-800">{new Date(invoice.month_date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold">Status</p>
            <p className="font-semibold text-slate-800">{invoice.status}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold">Hours</p>
            <p className="font-semibold text-slate-800">{invoice.commissioned_hours ? parseFloat(String(invoice.commissioned_hours)).toFixed(1) : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold">Amount</p>
            <p className="font-bold text-2xl text-slate-800">£{parseFloat(String(invoice.invoice_amount || 0)).toFixed(2)}</p>
          </div>
        </div>
        {invoice.notes && (
          <div className="p-3 bg-blue-50 rounded border border-blue-200">
            <p className="text-xs font-semibold text-blue-700 mb-1">Notes</p>
            <p className="text-sm text-blue-600">{invoice.notes}</p>
          </div>
        )}

        {/* Send invoice by email */}
        <div className="p-3 bg-purple-50 rounded border border-purple-200">
          {invoice.sent_at && !showSendForm ? (
            <p className="text-sm text-purple-700">
              Sent to <strong>{invoice.sent_to}</strong> on {new Date(invoice.sent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              <button onClick={() => setShowSendForm(true)} className="ml-2 text-xs font-semibold text-purple-700 underline">Send again</button>
            </p>
          ) : showSendForm || !invoice.sent_at ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-purple-700">Send this invoice by email</p>
              <input className="input text-sm" placeholder="funder@example.com, other@example.com"
                value={emailInput} onChange={e => setEmailInput(e.target.value)} />
              <p className="text-[11px] text-purple-500">Separate multiple recipients with a comma</p>
              <Button size="sm" loading={sending} onClick={sendInvoice} className="w-full">Send Invoice</Button>
            </div>
          ) : null}
        </div>

        <div className="flex gap-2">
          <button onClick={() => onStatusChange('approved')} className="flex-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded font-medium text-sm transition-colors">Approve</button>
          <button onClick={() => onStatusChange('paid')} className="flex-1 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded font-medium text-sm transition-colors">Mark Paid</button>
        </div>
        <div className="flex gap-3 justify-end pt-2 border-t">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  )
}
