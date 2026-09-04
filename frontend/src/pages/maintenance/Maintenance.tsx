import React, { useState, useEffect } from 'react'
import { Wrench, Plus, Search, Phone, Mail, User, Trash2, PhoneCall } from 'lucide-react'
import { Button, Modal, Input, Select, Textarea, Spinner, EmptyState, PrintButton, SpeechTextarea } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import api, { homesApi } from '../../api'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { LETTERHEAD_PRINT_CSS, fmtDate, esc, nl } from '../../utils/letterheadPrint'

const LOG_TABLE_CSS = `
  table.log{width:100%;border-collapse:collapse;margin-bottom:14px;font-family:Arial,sans-serif;font-size:10px;page-break-inside:auto}
  table.log th{text-align:left;background:#132a4f;color:#fff;border:1px solid #132a4f;padding:6px 8px;font-weight:700;font-size:8.5px;text-transform:uppercase;letter-spacing:.04em}
  table.log td{border:1px solid #999;padding:6px 8px;vertical-align:top;font-size:10px}
  table.log tr:nth-child(even) td{background:#f7f7f5}
`

function buildMaintenancePrintHtml(tab: 'log' | 'contacts', items: any[], contacts: any[]): string {
  const rows = tab === 'log'
    ? items.map(i => `
        <tr>
          <td>${esc(i.title)}</td>
          <td style="text-transform:capitalize">${esc(i.category)}</td>
          <td style="text-transform:capitalize">${esc(i.priority)}</td>
          <td style="text-transform:capitalize">${esc(i.status?.replace(/_/g, ' '))}</td>
          <td>${esc(i.location)}</td>
          <td>${nl(i.description)}</td>
          <td>${esc(i.reported_by_name)}</td>
          <td>${fmtDate(i.created_at)}</td>
        </tr>
      `).join('')
    : contacts.map(c => `
        <tr>
          <td>${esc(c.name)}</td>
          <td>${esc(c.role)}</td>
          <td>${esc(c.company)}</td>
          <td>${esc(c.phone)}</td>
          <td>${esc(c.email)}</td>
          <td>${nl(c.notes)}</td>
        </tr>
      `).join('')

  const headerRow = tab === 'log'
    ? '<tr><th>Title</th><th>Category</th><th>Priority</th><th>Status</th><th>Location</th><th>Description</th><th>Reported By</th><th>Date</th></tr>'
    : '<tr><th>Name</th><th>Role</th><th>Company</th><th>Phone</th><th>Email</th><th>Notes</th></tr>'
  const colCount = tab === 'log' ? 8 : 6

  const body = `
    <div class="page">
      <div class="letterhead">
        <div>
          <div class="org-name">Comprehensive Care Ltd</div>
          <div class="org-addr">Ivy Business Centre, Office 3-13 Crown Street, Failsworth, Manchester, M35 9BG</div>
        </div>
        <div class="doc-meta">
          <div>Document ref: MAINT-${fmtDate(new Date().toISOString())}</div>
          <div>Printed: <strong>${fmtDate(new Date().toISOString())}</strong></div>
        </div>
      </div>

      <div class="doc-title">Maintenance</div>
      <div class="doc-subtitle">${tab === 'log' ? 'Issue Log' : 'Maintenance Contacts'}</div>

      <table class="idtable">
        <tr><td class="lbl">Records</td><td class="val">${tab === 'log' ? items.length : contacts.length}</td></tr>
      </table>

      <h2 class="sec"><span class="num">1.</span>${tab === 'log' ? 'Issues' : 'Contacts'}</h2>
      <table class="log">
        ${headerRow}
        ${rows || `<tr><td colspan="${colCount}" style="text-align:center;color:#888">No records</td></tr>`}
      </table>

      <div class="footer">
        <span class="confid">CONFIDENTIAL — Facility record</span>
        <span>Printed ${fmtDate(new Date().toISOString())}</span>
      </div>
    </div>
  `

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Maintenance</title><style>${LETTERHEAD_PRINT_CSS}${LOG_TABLE_CSS}</style></head><body>${body}</body></html>`
}

const CATEGORIES = [
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'heating', label: 'Heating / HVAC' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'decoration', label: 'Decoration' },
  { value: 'security', label: 'Security' },
  { value: 'garden', label: 'Garden / Outdoor' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'it', label: 'IT / Technology' },
  { value: 'other', label: 'Other' },
]

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

const STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

const priorityColors: Record<string, string> = {
  urgent: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  high:   'bg-orange-500/15 text-orange-400 border-orange-500/30',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  low:    'bg-slate-500/15 text-slate-400 border-slate-500/30',
}

const statusColors: Record<string, string> = {
  open:        'bg-blue-500/15 text-blue-400 border-blue-500/30',
  in_progress: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  resolved:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  closed:      'bg-slate-500/15 text-slate-400 border-slate-500/30',
}

export default function Maintenance() {
  const { isRole, user } = useAuth()
  const [items, setItems] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showDetail, setShowDetail] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')

  const [form, setForm] = useState({ title: '', description: '', category: 'other', priority: 'medium', location: '' })
  const [updateForm, setUpdateForm] = useState({ status: '', resolutionNotes: '' })
  const [tab, setTab] = useState<'log' | 'contacts'>('log')
  const [contacts, setContacts] = useState<any[]>([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [showNewContact, setShowNewContact] = useState(false)
  const [contactForm, setContactForm] = useState({ name: '', role: '', company: '', email: '', phone: '', notes: '' })
  const [savingContact, setSavingContact] = useState(false)

  const canManage = isRole('home_manager', 'group_admin', 'senior_carer', 'deputy_manager', 'admin')
  const canManageContacts = isRole('home_manager', 'group_admin', 'deputy_manager', 'admin')

  useEffect(() => {
    if (isRole('group_admin')) {
      homesApi.list().then(res => {
        const h = res.data.data || []
        setHomes(h)
        if (h.length > 0 && !selectedHome) setSelectedHome(h[0].id)
      }).catch(() => {})
    }
  }, [user, isRole])

  async function load() {
    setLoading(true)
    try {
      const params: any = { status: filterStatus || undefined, priority: filterPriority || undefined }
      if (isRole('group_admin') && selectedHome) params.homeId = selectedHome

      const [dataRes, statsRes] = await Promise.all([
        api.get('/maintenance', { params }),
        api.get('/maintenance/stats', { params: isRole('group_admin') && selectedHome ? { homeId: selectedHome } : {} }),
      ])
      setItems(dataRes.data.data)
      setStats(statsRes.data.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [filterStatus, filterPriority, selectedHome])

  const loadContacts = async () => {
    setContactsLoading(true)
    try {
      const params: any = {}
      if (isRole('group_admin') && selectedHome) params.homeId = selectedHome
      const res = await api.get('/maintenance/contacts', { params })
      setContacts(res.data.data || [])
    } catch {}
    setContactsLoading(false)
  }

  useEffect(() => { if (tab === 'contacts') loadContacts() }, [tab, selectedHome])

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contactForm.name.trim()) { toast.error('Name is required'); return }
    setSavingContact(true)
    try {
      await api.post('/maintenance/contacts', {
        ...contactForm,
        homeId: isRole('group_admin') ? selectedHome : undefined,
      })
      setShowNewContact(false)
      setContactForm({ name: '', role: '', company: '', email: '', phone: '', notes: '' })
      loadContacts()
      toast.success('Contact added')
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setSavingContact(false) }
  }

  const deleteContact = async (id: string) => {
    if (!window.confirm('Remove this contact?')) return
    try {
      await api.delete(`/maintenance/contacts/${id}`)
      setContacts(c => c.filter(x => x.id !== id))
      toast.success('Contact removed')
    } catch { toast.error('Failed to remove') }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/maintenance', { ...form, homeId: isRole('group_admin') ? selectedHome : undefined })
      setShowNew(false)
      setForm({ title: '', description: '', category: 'other', priority: 'medium', location: '' })
      load()
    } catch {}
    setSubmitting(false)
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!showDetail) return
    setSubmitting(true)
    try {
      await api.patch(`/maintenance/${showDetail.id}`, updateForm)
      setShowDetail(null)
      load()
    } catch {}
    setSubmitting(false)
  }

  const filtered = items.filter(i =>
    !search || i.title.toLowerCase().includes(search.toLowerCase()) || (i.location || '').toLowerCase().includes(search.toLowerCase())
  )

  function handlePrint() {
    const html = buildMaintenancePrintHtml(tab, filtered, contacts)
    const w = window.open('', '_blank')
    if (!w) { toast.error('Pop-up blocked — please allow pop-ups for this site and try again'); return }
    w.document.write(html)
    w.document.close()
    w.focus()
    w.print()
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Wrench className="w-6 h-6 text-amber-400" /> Maintenance
          </h1>
          <p className="text-slate-400 text-sm mt-1">Track facility issues and maintenance contacts</p>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton onClick={handlePrint} />
          {tab === 'log' && (
            <Button variant="gold" icon={<Plus className="w-4 h-4" />} onClick={() => setShowNew(true)}>
              Report Issue
            </Button>
          )}
          {tab === 'contacts' && canManageContacts && (
            <Button variant="gold" icon={<Plus className="w-4 h-4" />} onClick={() => setShowNewContact(true)}>
              Add Contact
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-6 w-fit">
        {[{ id: 'log', label: 'Issue Log' }, { id: 'contacts', label: 'Maintenance Contacts' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t.id ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'contacts' ? (
        <ContactsSection
          contacts={contacts}
          loading={contactsLoading}
          canManage={canManageContacts}
          onDelete={deleteContact}
        />
      ) : (<>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Open', value: stats.open_count, color: 'text-blue-400' },
            { label: 'In Progress', value: stats.in_progress_count, color: 'text-amber-400' },
            { label: 'Resolved', value: stats.resolved_count, color: 'text-emerald-400' },
            { label: 'Urgent', value: stats.urgent_count, color: 'text-rose-400' },
          ].map(s => (
            <div key={s.label} className="card p-4 text-center">
              <div className={clsx('text-2xl font-bold', s.color)}>{s.value}</div>
              <div className="text-xs text-slate-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search issues..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-40" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select className="input w-40" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? <Spinner /> : filtered.length === 0 ? (
        <EmptyState title="No maintenance issues" description="Report a facility issue to get started" />
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <div key={item.id} className="card p-4 cursor-pointer hover:border-amber-500/30 transition-all"
              onClick={() => { setShowDetail(item); setUpdateForm({ status: item.status, resolutionNotes: item.resolution_notes || '' }) }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={clsx('badge border text-xs', priorityColors[item.priority])}>{item.priority}</span>
                    <span className={clsx('badge border text-xs', statusColors[item.status])}>{item.status.replace('_', ' ')}</span>
                    <span className="text-xs text-slate-500 capitalize">{item.category}</span>
                  </div>
                  <h3 className="font-semibold text-white">{item.title}</h3>
                  {item.location && <p className="text-xs text-slate-400 mt-0.5">ðŸ“ {item.location}</p>}
                  {item.description && <p className="text-sm text-slate-400 mt-1 line-clamp-2">{item.description}</p>}
                </div>
                <div className="text-right text-xs text-slate-500 flex-shrink-0">
                  <div>{item.reported_by_name || 'Unknown'}</div>
                  <div>{new Date(item.created_at).toLocaleDateString()}</div>
                  {item.assigned_to_name && <div className="text-amber-400 mt-1">â†’ {item.assigned_to_name}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      </>)} {/* end log tab */}

      {/* New Issue Modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Report Maintenance Issue">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" options={CATEGORIES} value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
            <Select label="Priority" options={PRIORITIES} value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} />
          </div>
          <Input label="Location (optional)" placeholder="e.g. Room 4, Kitchen" value={form.location}
            onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
          <Textarea label="Description" value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button type="submit" variant="gold" loading={submitting}>Submit Issue</Button>
          </div>
        </form>
      </Modal>

      {/* Add Contact Modal */}
      <Modal open={showNewContact} onClose={() => setShowNewContact(false)} title="Add Maintenance Contact">
        <form onSubmit={handleAddContact} className="space-y-4">
          <Input label="Name *" required value={contactForm.name} onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. John Smith" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Role / Speciality" value={contactForm.role} onChange={e => setContactForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g. Electrician, Plumber" />
            <Input label="Company" value={contactForm.company} onChange={e => setContactForm(f => ({ ...f, company: e.target.value }))} placeholder="e.g. ABC Repairs Ltd" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Phone" type="tel" value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} placeholder="e.g. 07700 900000" />
            <Input label="Email" type="email" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} placeholder="e.g. john@repairs.com" />
          </div>
          <SpeechTextarea label="Notes" rows={2} value={contactForm.notes} onChange={v => setContactForm(f => ({ ...f, notes: v }))} placeholder="Any additional info..." />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowNewContact(false)}>Cancel</Button>
            <Button type="submit" variant="gold" loading={savingContact}>Add Contact</Button>
          </div>
        </form>
      </Modal>

      {/* Detail / Update Modal */}
      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title="Update Issue" size="lg">
        {showDetail && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl" style={{ background: '#1a1a1a', border: '1px solid rgba(232,177,48,0.15)' }}>
              <div className="flex gap-2 mb-2 flex-wrap">
                <span className={clsx('badge border text-xs', priorityColors[showDetail.priority])}>{showDetail.priority}</span>
                <span className="text-xs text-slate-500 capitalize">{showDetail.category}</span>
              </div>
              <h3 className="font-bold text-white text-lg">{showDetail.title}</h3>
              {showDetail.location && <p className="text-sm text-slate-400 mt-1">ðŸ“ {showDetail.location}</p>}
              {showDetail.description && <p className="text-sm text-slate-300 mt-2">{showDetail.description}</p>}
              <p className="text-xs text-slate-500 mt-3">Reported by {showDetail.reported_by_name} Â· {new Date(showDetail.created_at).toLocaleDateString()}</p>
            </div>
            {canManage && (
              <form onSubmit={handleUpdate} className="space-y-4">
                <Select label="Update Status" options={STATUSES} value={updateForm.status}
                  onChange={e => setUpdateForm(f => ({ ...f, status: e.target.value }))} />
                <Textarea label="Resolution Notes" value={updateForm.resolutionNotes}
                  onChange={e => setUpdateForm(f => ({ ...f, resolutionNotes: e.target.value }))} rows={3} />
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="ghost" onClick={() => setShowDetail(null)}>Close</Button>
                  <Button type="submit" variant="gold" loading={submitting}>Update Issue</Button>
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

function ContactsSection({ contacts, loading, canManage, onDelete }: {
  contacts: any[]; loading: boolean; canManage: boolean; onDelete: (id: string) => void
}) {
  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>
  if (!contacts.length) return (
    <EmptyState title="No maintenance contacts" description="Add contact details for plumbers, electricians, and other maintenance professionals so staff know who to call" />
  )
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {contacts.map(c => (
        <div key={c.id} className="card p-5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">{c.name}</h3>
                {c.role && <p className="text-xs text-amber-400">{c.role}</p>}
                {c.company && <p className="text-xs text-slate-400">{c.company}</p>}
              </div>
            </div>
            {canManage && (
              <button onClick={() => onDelete(c.id)}
                className="text-slate-500 hover:text-rose-400 transition-colors flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            {c.phone && (
              <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-sm text-slate-300 hover:text-amber-400 transition-colors">
                <Phone className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                {c.phone}
              </a>
            )}
            {c.email && (
              <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-sm text-slate-300 hover:text-amber-400 transition-colors">
                <Mail className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                {c.email}
              </a>
            )}
            {c.notes && <p className="text-xs text-slate-400 pt-1">{c.notes}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}
