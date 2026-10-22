import React, { useEffect, useState, useMemo } from 'react'
import { homesApi, suApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Select } from '../../components/ui'
import { ClipboardCheck, Plus, Trash2, Pencil, Download, Search, X, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { ukDateStr } from '../../utils/ukDate'
import { downloadCsv } from '../../utils/exportTable'
import { buildLetterheadPage, openLetterheadPrint, printLetterheadTable, esc } from '../../utils/letterheadPrint'

const MEETING_TYPES = [
  { value: 'service_user', label: 'Service User Meeting' },
  { value: 'staff', label: 'Staff Meeting' },
  { value: 'team', label: 'Team Meeting' },
  { value: 'management', label: 'Management Meeting' },
  { value: 'mdt', label: 'Multi-Disciplinary (MDT)' },
  { value: 'family', label: 'Family Meeting' },
  { value: 'other', label: 'Other' },
]

const STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'closed', label: 'Closed' },
]

const BLANK = {
  meetingDate: ukDateStr(),
  meetingType: 'team',
  minutesTaker: '',
  followUp: '',
  actionPlan: '',
  status: 'open',
  notes: '',
}

function getTypeLabel(v?: string) {
  return MEETING_TYPES.find(t => t.value === v)?.label || (v || 'Meeting').replace(/_/g, ' ')
}

export default function MeetingTracker() {
  const { user, isRole } = useAuth()
  const canDelete = isRole('home_manager', 'group_admin', 'admin', 'recruitment_admin', 'super_admin')
  const [items, setItems] = useState<any[]>([])
  const [homes, setHomes] = useState<any[]>([])
  const [sus, setSus] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [loading, setLoading] = useState(true)

  // Modal state for Create / Edit / View
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<any | null>(null)
  const [viewingItem, setViewingItem] = useState<any | null>(null)
  const [form, setForm] = useState<any>(BLANK)
  const [saving, setSaving] = useState(false)

  // Search & Date Range Filter bar state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSuName, setFilterSuName] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
    })
  }, [user])

  useEffect(() => {
    if (!selectedHome) return
    suApi.list(selectedHome, { status: 'live' }).then(res => setSus(res.data.data || [])).catch(() => {})
    load()
  }, [selectedHome])

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/meeting-tracker', { params: { homeId: selectedHome } })
      setItems(res.data.data || [])
    } catch {
      toast.error('Failed to load meeting records')
    } finally {
      setLoading(false)
    }
  }

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }))

  const openNewModal = () => {
    setEditingItem(null)
    setForm({ ...BLANK, meetingDate: ukDateStr() })
    setShowForm(true)
  }

  const openEditModal = (it: any) => {
    setEditingItem(it)
    setForm({
      meetingDate: it.meeting_date ? String(it.meeting_date).slice(0, 10) : ukDateStr(),
      meetingType: it.meeting_type || 'team',
      minutesTaker: it.minutes_taker || '',
      followUp: it.follow_up || '',
      actionPlan: it.action_plan || '',
      status: it.status || 'open',
      notes: it.notes || '',
    })
    setShowForm(true)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.meetingDate) {
      toast.error('Meeting date is required')
      return
    }
    setSaving(true)
    try {
      if (editingItem?.id) {
        await api.patch(`/meeting-tracker/${editingItem.id}`, form)
        toast.success('Meeting updated')
      } else {
        await api.post('/meeting-tracker', { ...form, homeId: selectedHome })
        toast.success('Meeting recorded')
      }
      setShowForm(false)
      setEditingItem(null)
      setForm(BLANK)
      await load()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save meeting')
    } finally {
      setSaving(false)
    }
  }

  const setStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/meeting-tracker/${id}`, { status })
      setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i))
      toast.success('Status updated')
    } catch {
      toast.error('Failed to update status')
    }
  }

  const remove = async (id: string) => {
    if (!window.confirm('Delete this meeting record?')) return
    try {
      await api.delete(`/meeting-tracker/${id}`)
      setItems(prev => prev.filter(i => i.id !== id))
      if (viewingItem?.id === id) setViewingItem(null)
      toast.success('Meeting deleted')
    } catch {
      toast.error('Failed to delete meeting')
    }
  }

  const downloadSingleMeetingPdf = (it: any) => {
    const dateStr = it.meeting_date ? format(new Date(it.meeting_date), 'd MMM yyyy') : '—'
    const typeLabel = getTypeLabel(it.meeting_type)
    const statusLabel = (STATUSES.find(s => s.value === it.status)?.label || it.status || 'Open')
    const sections = [
      {
        title: 'Meeting Details',
        inner: `<table class="idtable">
          <tr>
            <td class="lbl">Meeting Type</td><td class="val">${esc(typeLabel)}</td>
            <td class="lbl">Date of Meeting</td><td class="val">${esc(dateStr)}</td>
          </tr>
          <tr>
            <td class="lbl">Minutes Taker</td><td class="val">${esc(it.minutes_taker || '—')}</td>
            <td class="lbl">Status</td><td class="val">${esc(statusLabel)}</td>
          </tr>
        </table>`,
      },
      {
        title: 'Meeting Notes & Minutes',
        inner: `<p class="body-text">${esc(it.notes || 'No meeting notes recorded.')}</p>`,
      },
      {
        title: 'Action Plan',
        inner: `<p class="body-text">${esc(it.action_plan || 'No action plan recorded.')}</p>`,
      },
      {
        title: 'Follow-Up Actions',
        inner: `<p class="body-text">${esc(it.follow_up || 'No follow-up recorded.')}</p>`,
      },
    ]
    const body = buildLetterheadPage({
      docTitle: `${typeLabel} — Meeting Record`,
      docSubtitle: `Recorded meeting minutes, action plan & follow-up (${dateStr})`,
      docRefPrefix: 'MTG',
      docRefId: String(it.id || dateStr),
      residentLabel: it.su_name ? 'Service User' : 'Meeting Type',
      residentName: it.su_name || typeLabel,
      sections,
    })
    if (!openLetterheadPrint(`${typeLabel} — ${dateStr}`, body)) {
      toast.error('Please allow pop-ups for this site to print or save as PDF')
    }
  }

  const downloadSingleMeetingCsv = (it: any) => {
    const cols = [
      { key: 'date', label: 'Date of Meeting' },
      { key: 'type', label: 'Meeting Type' },
      { key: 'minutes_taker', label: 'Minutes Taker' },
      { key: 'status', label: 'Status' },
      { key: 'notes', label: 'Notes' },
      { key: 'action_plan', label: 'Action Plan' },
      { key: 'follow_up', label: 'Follow Up' },
    ]
    downloadCsv(`meeting-${String(it.meeting_date || 'record').slice(0, 10)}`, cols, [{
      date: it.meeting_date ? format(new Date(it.meeting_date), 'dd/MM/yyyy') : '',
      type: getTypeLabel(it.meeting_type),
      minutes_taker: it.minutes_taker || '',
      status: (it.status || 'open').replace(/_/g, ' '),
      notes: it.notes || '',
      action_plan: it.action_plan || '',
      follow_up: it.follow_up || '',
    }])
  }

  const filteredItems = useMemo(() => {
    return items.filter(it => {
      const mDate = it.meeting_date ? String(it.meeting_date).slice(0, 10) : ''
      if (filterType !== 'all' && it.meeting_type !== filterType) return false
      if (filterStatus !== 'all' && it.status !== filterStatus) return false
      if (dateFrom && mDate && mDate < dateFrom) return false
      if (dateTo && mDate && mDate > dateTo) return false
      const combined = `${getTypeLabel(it.meeting_type)} ${it.minutes_taker || ''} ${it.notes || ''} ${it.action_plan || ''} ${it.follow_up || ''} ${it.created_by_name || ''}`.toLowerCase()
      if (filterSuName && !combined.includes(filterSuName.toLowerCase())) return false
      if (searchQuery.trim() && !combined.includes(searchQuery.trim().toLowerCase())) return false
      return true
    })
  }, [items, filterType, filterStatus, filterSuName, dateFrom, dateTo, searchQuery])

  const hasFilters = Boolean(searchQuery.trim() || filterType !== 'all' || filterStatus !== 'all' || filterSuName || dateFrom || dateTo)

  const clearFilters = () => {
    setSearchQuery('')
    setFilterType('all')
    setFilterStatus('all')
    setFilterSuName('')
    setDateFrom('')
    setDateTo('')
  }

  const exportCols = [
    { key: 'date', label: 'Date' },
    { key: 'type', label: 'Meeting Type' },
    { key: 'minutes_taker', label: 'Minutes Taker' },
    { key: 'status', label: 'Status' },
    { key: 'notes', label: 'Notes' },
    { key: 'action_plan', label: 'Action Plan' },
    { key: 'follow_up', label: 'Follow Up' },
  ]
  const exportRows = filteredItems.map(it => ({
    date: it.meeting_date ? format(new Date(it.meeting_date), 'd MMM yyyy') : '—',
    type: getTypeLabel(it.meeting_type),
    minutes_taker: it.minutes_taker || '—',
    status: (it.status || 'open').replace(/_/g, ' '),
    notes: it.notes || '—',
    action_plan: it.action_plan || '—',
    follow_up: it.follow_up || '—',
  }))

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6" style={{ color: '#e8b130' }} /> Meeting Tracker
          </h1>
          <p className="text-slate-400 text-sm mt-1">Track meetings, minutes, action plans, and follow-up actions</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {homes.length > 1 && (
            <select className="input w-auto text-sm" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
              {homes.map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
          {filteredItems.length > 0 && (
            <>
              <Button size="sm" variant="secondary" icon={<FileText className="w-3.5 h-3.5" />}
                onClick={() => {
                  const sub = dateFrom || dateTo ? `Filtered: ${dateFrom || 'Start'} to ${dateTo || 'Present'}` : undefined
                  if (!printLetterheadTable('Meeting Tracker Report', exportCols, exportRows, sub)) {
                    toast.error('Please allow pop-ups to print / save PDF')
                  }
                }}>
                Print / PDF
              </Button>
              <Button size="sm" variant="secondary" icon={<Download className="w-3.5 h-3.5" />}
                onClick={() => downloadCsv('meeting-tracker', exportCols, exportRows)}>
                Export CSV
              </Button>
            </>
          )}
          <Button variant="gold" icon={<Plus className="w-4 h-4" />} onClick={openNewModal}>
            New Meeting
          </Button>
        </div>
      </div>

      {/* Search & Date Range Filter Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2">
            <label className="text-xs font-semibold text-slate-500 block mb-1">Search Meetings</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                className="input pl-9 text-sm w-full"
                placeholder="Search notes, minutes taker, follow-up, action plan…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">Meeting Type</label>
            <select className="input text-sm w-full" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">All Meeting Types</option>
              {MEETING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
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
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500">Service User:</label>
              <select className="input text-xs py-1.5 w-48" value={filterSuName} onChange={e => setFilterSuName(e.target.value)}>
                <option value="">All Service Users</option>
                {sus.map((s: any) => {
                  const full = `${s.first_name || s.firstName || ''} ${s.last_name || s.lastName || ''}`.trim()
                  return <option key={s.id} value={full}>{full}</option>
                })}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500">Status:</label>
              <select className="input text-xs py-1.5 w-36" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="all">All Statuses</option>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-medium">
              Showing <strong className="text-slate-800">{filteredItems.length}</strong> of {items.length} meeting{items.length !== 1 ? 's' : ''}
            </span>
            {hasFilters && (
              <button type="button" onClick={clearFilters}
                className="text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? <Spinner /> : items.length === 0 ? (
        <EmptyState
          title="No meetings tracked yet"
          description="Record team, staff, management, MDT, and service user meetings with action plans here."
          action={<Button variant="gold" onClick={openNewModal}>New Meeting</Button>}
        />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title="No meetings match your filters"
          description="Adjust or clear your search / date range filters above to see all recorded meetings."
          action={<Button variant="outline" onClick={clearFilters}>Clear Filters</Button>}
        />
      ) : (
        <div className="space-y-3">
          {filteredItems.map(it => (
            <div key={it.id} className="card p-5 space-y-3 hover:border-amber-300/60 transition-colors">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="cursor-pointer flex-1 min-w-[200px]" onClick={() => setViewingItem(it)}>
                  <p className="font-semibold text-slate-800 text-base">
                    {getTypeLabel(it.meeting_type)}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {it.meeting_date ? format(new Date(it.meeting_date), 'd MMM yyyy') : '—'}
                    {it.minutes_taker ? ` · Minutes by ${it.minutes_taker}` : ''}
                    {it.created_by_name ? ` · Logged by ${it.created_by_name}` : ''}
                  </p>
                </div>

                {/* Action buttons: Status selector + Edit + Download (PDF & CSV) + Delete */}
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    className="input py-1 px-2.5 text-xs w-auto"
                    value={it.status || 'open'}
                    onChange={e => setStatus(it.id, e.target.value)}
                  >
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>

                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Pencil className="w-3.5 h-3.5" />}
                    onClick={() => openEditModal(it)}
                  >
                    Edit
                  </Button>

                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Download className="w-3.5 h-3.5" />}
                    onClick={() => downloadSingleMeetingPdf(it)}
                    title="Download / Save Meeting as Letterhead PDF"
                  >
                    Download PDF
                  </Button>

                  <button
                    type="button"
                    onClick={() => downloadSingleMeetingCsv(it)}
                    title="Download CSV"
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    CSV
                  </button>

                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => remove(it.id)}
                      title="Delete meeting"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {it.notes && <p className="text-sm text-slate-700 whitespace-pre-wrap">{it.notes}</p>}
              {it.action_plan && (
                <div className="bg-amber-50/70 rounded-xl p-3 border border-amber-100">
                  <p className="text-xs font-semibold text-amber-800 mb-0.5">Action Plan</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{it.action_plan}</p>
                </div>
              )}
              {it.follow_up && (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-600 mb-0.5">Follow Up</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{it.follow_up}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Meeting Modal */}
      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setEditingItem(null) }}
        title={editingItem ? 'Edit Meeting Record' : 'New Meeting'}
        size="md"
      >
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Date of Meeting *</label>
              <input type="date" required className="input" value={form.meetingDate} onChange={e => set('meetingDate', e.target.value)} />
            </div>
            <Select label="Type of Meeting" options={MEETING_TYPES} value={form.meetingType} onChange={e => set('meetingType', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Minutes Taker</label>
              <input className="input" placeholder="Staff member name" value={form.minutesTaker} onChange={e => set('minutesTaker', e.target.value)} />
            </div>
            <Select label="Status" options={STATUSES} value={form.status} onChange={e => set('status', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Notes</label>
            <textarea className="input" rows={3} placeholder="Minutes and discussion notes…" value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Action Plan</label>
            <textarea className="input" rows={3} placeholder="Agreed action points and owners…" value={form.actionPlan} onChange={e => set('actionPlan', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Follow Up</label>
            <textarea className="input" rows={2} placeholder="Follow-up dates / review notes…" value={form.followUp} onChange={e => set('followUp', e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setEditingItem(null) }}>Cancel</Button>
            <Button type="submit" variant="gold" loading={saving}>
              {editingItem ? 'Save Changes' : 'Save Meeting'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Full Read-Only View Modal */}
      {viewingItem && (
        <Modal
          open={true}
          onClose={() => setViewingItem(null)}
          title={`${getTypeLabel(viewingItem.meeting_type)} — ${viewingItem.meeting_date ? format(new Date(viewingItem.meeting_date), 'd MMM yyyy') : ''}`}
          size="md"
        >
          <div className="space-y-4 text-slate-800">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div><span className="text-slate-500 font-semibold">Date:</span> <strong className="text-slate-900">{viewingItem.meeting_date ? format(new Date(viewingItem.meeting_date), 'd MMM yyyy') : '—'}</strong></div>
              <div><span className="text-slate-500 font-semibold">Status:</span> <strong className="text-slate-900 capitalize">{(viewingItem.status || 'open').replace(/_/g, ' ')}</strong></div>
              <div><span className="text-slate-500 font-semibold">Minutes Taker:</span> <strong className="text-slate-900">{viewingItem.minutes_taker || '—'}</strong></div>
              <div><span className="text-slate-500 font-semibold">Logged By:</span> <strong className="text-slate-900">{viewingItem.created_by_name || '—'}</strong></div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-purple-800 mb-1">Meeting Notes</p>
              <p className="text-sm text-slate-800 whitespace-pre-wrap bg-slate-50 rounded-xl p-3 border border-slate-100">{viewingItem.notes || 'No notes recorded.'}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-1">Action Plan</p>
              <p className="text-sm text-slate-800 whitespace-pre-wrap bg-amber-50/60 rounded-xl p-3 border border-amber-100">{viewingItem.action_plan || 'No action plan recorded.'}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1">Follow Up</p>
              <p className="text-sm text-slate-800 whitespace-pre-wrap bg-slate-50 rounded-xl p-3 border border-slate-100">{viewingItem.follow_up || 'No follow-up recorded.'}</p>
            </div>
            <div className="flex justify-between gap-2 pt-2">
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" icon={<Pencil className="w-3.5 h-3.5" />}
                  onClick={() => { const cur = viewingItem; setViewingItem(null); openEditModal(cur) }}>
                  Edit
                </Button>
                <Button size="sm" variant="secondary" icon={<Download className="w-3.5 h-3.5" />}
                  onClick={() => downloadSingleMeetingPdf(viewingItem)}>
                  Download PDF
                </Button>
              </div>
              <Button size="sm" variant="outline" onClick={() => setViewingItem(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
