import React, { useEffect, useState, useCallback, useMemo } from 'react'
import api from '../api'
import { staffApi } from '../api'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import { ukDateStr } from '../utils/ukDate'
import { Spinner, Button, Modal, EmptyState } from './ui'
import { SpeechTextarea } from './ui/SpeechButton'
import { Users, Plus, ChevronDown, ChevronUp, ShieldCheck, Send, Pencil, Trash2, Search, Download, FileText, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { downloadCsv } from '../utils/exportTable'
import { buildLetterheadPage, openLetterheadPrint, printLetterheadTable, esc } from '../utils/letterheadPrint'

type MeetingType = 'resident' | 'staff' | 'management' | 'team' | 'team_briefing'

interface MeetingsSectionProps {
  meetingType: MeetingType
  /** su_id for resident meetings, staff_id for staff meetings, team_id for team meetings — omitted for management meetings */
  parentId?: string
  /** home_id — required for management meetings, otherwise ignored (server derives it) */
  homeId?: string
  /** Display label used in headings/buttons, e.g. "Resident Meeting" / "Staff Meeting" / "Management Meeting" / "Team Meeting" */
  label: string
}

const BLANK = {
  conductedBy: '', meetingDate: ukDateStr(),
  attendees: '', serviceLocation: '', notes: '', actionPlan: '', teamId: '',
}

function listUrl(meetingType: MeetingType, parentId?: string, homeId?: string) {
  if (meetingType === 'resident') return `/meetings/su/${parentId}`
  if (meetingType === 'staff') return `/meetings/staff/${parentId}`
  if (meetingType === 'team') return `/meetings/team/${parentId}`
  if (meetingType === 'team_briefing') return `/meetings/team-briefing${homeId ? `?homeId=${homeId}` : ''}`
  return `/meetings/management${homeId ? `?homeId=${homeId}` : ''}`
}

function createUrl(meetingType: MeetingType) {
  if (meetingType === 'resident') return '/meetings/su'
  if (meetingType === 'staff') return '/meetings/staff'
  if (meetingType === 'team') return '/meetings/team'
  if (meetingType === 'team_briefing') return '/meetings/team-briefing'
  return '/meetings/management'
}

export default function MeetingsSection({ meetingType, parentId, homeId, label }: MeetingsSectionProps) {
  const { user, isRole } = useAuth()
  const canManage = isRole('home_manager', 'group_admin', 'deputy_manager', 'admin', 'recruitment_admin', 'director', 'registered_manager', 'service_manager', 'senior_carer')
  const [meetings, setMeetings] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [signOffItem, setSignOffItem] = useState<any>(null)
  const [signOffForm, setSignOffForm] = useState({ signedOffBy: '', signedOffDate: '' })
  const [saving, setSaving] = useState(false)
  const [sendItem, setSendItem] = useState<any>(null)
  const [editItem, setEditItem] = useState<any>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const isBriefing = meetingType === 'team_briefing'
  const [filterTeam, setFilterTeam] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [filterText, setFilterText] = useState('')
  const [filterSpecificId, setFilterSpecificId] = useState('')
  const [filterSignOff, setFilterSignOff] = useState<'all' | 'signed' | 'unsigned'>('all')
  const [filterTeams, setFilterTeams] = useState<any[]>([])
  useEffect(() => {
    if (!isBriefing || !homeId) return
    api.get('/teams', { params: { homeId } }).then(res => setFilterTeams(res.data.data || [])).catch(() => {})
  }, [isBriefing, homeId])

  const shownMeetings = useMemo(() => {
    const q = filterText.trim().toLowerCase()
    return meetings.filter((m: any) => {
      if (filterSpecificId && String(m.id) !== filterSpecificId) return false
      if (isBriefing && filterTeam && String(m.team_id || '') !== filterTeam) return false
      if (filterSignOff === 'signed' && !m.signed_off) return false
      if (filterSignOff === 'unsigned' && m.signed_off) return false
      const d = String(m.meeting_date || '').slice(0, 10)
      if (filterFrom && d && d < filterFrom) return false
      if (filterTo && d && d > filterTo) return false
      if (q) {
        const hay = [m.notes, m.action_plan, m.conducted_by, m.attendees, m.service_location, m.team_name]
          .filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [isBriefing, meetings, filterSpecificId, filterTeam, filterSignOff, filterFrom, filterTo, filterText])

  const clearFilters = () => {
    setFilterSpecificId('')
    setFilterTeam('')
    setFilterSignOff('all')
    setFilterFrom('')
    setFilterTo('')
    setFilterText('')
  }
  const filtersActive = !!filterSpecificId || (isBriefing && !!filterTeam) || filterSignOff !== 'all' || !!filterFrom || !!filterTo || !!filterText.trim()

  const downloadMeetingPdf = (m: any) => {
    const dStr = m.meeting_date ? format(new Date(m.meeting_date), 'd MMM yyyy') : '—'
    const sections = [
      {
        title: `${label} Summary`,
        inner: `<table class="idtable">
          <tr>
            <td class="lbl">Meeting Type</td><td class="val">${esc(label)}</td>
            <td class="lbl">Date</td><td class="val">${esc(dStr)}</td>
          </tr>
          <tr>
            <td class="lbl">Conducted By</td><td class="val">${esc(m.conducted_by || '—')}</td>
            <td class="lbl">Location / Service</td><td class="val">${esc(m.service_location || m.team_name || '—')}</td>
          </tr>
          <tr>
            <td class="lbl">Attendees</td><td class="val">${esc(m.attendees || '—')}</td>
            <td class="lbl">Sign-off Status</td><td class="val">${m.signed_off ? `Signed off${m.signed_off_by ? ` by ${esc(m.signed_off_by)}` : ''}` : 'Pending sign-off'}</td>
          </tr>
        </table>`,
      },
      {
        title: 'Minutes & Discussion Notes',
        inner: `<p class="body-text">${esc(m.notes || 'No meeting notes recorded.')}</p>`,
      },
      {
        title: 'Agreed Action Plan',
        inner: `<p class="body-text">${esc(m.action_plan || 'No action plan recorded.')}</p>`,
      },
    ]
    const body = buildLetterheadPage({
      docTitle: `${label} Record`,
      docSubtitle: `Recorded on ${dStr}`,
      docRefPrefix: 'MTG',
      docRefId: String(m.id || dStr),
      residentLabel: 'Meeting / Team',
      residentName: m.team || label,
      sections,
    })
    if (!openLetterheadPrint(`${label} — ${dStr}`, body)) {
      toast.error('Please allow pop-ups for this site to print / save PDF')
    }
  }

  const canLoad = (meetingType === 'management' || meetingType === 'team_briefing') ? !!homeId : !!parentId

  const load = useCallback(async () => {
    if (!canLoad) return
    setLoading(true)
    try {
      const res = await api.get(listUrl(meetingType, parentId, homeId))
      setMeetings(res.data.data || [])
    } catch { toast.error(`Failed to load ${label.toLowerCase()} records`) }
    finally { setLoading(false) }
  }, [meetingType, parentId, homeId, canLoad, label])

  useEffect(() => { load() }, [load])

  const handleSignOff = async () => {
    if (!signOffItem) return
    if (!signOffForm.signedOffBy.trim()) { toast.error('Enter the name of the person signing off'); return }
    setSaving(true)
    try {
      await api.put(`/meetings/${signOffItem.id}/sign-off`, {
        signedOffBy: signOffForm.signedOffBy,
        signedOffDate: signOffForm.signedOffDate || ukDateStr(),
      })
      toast.success('Meeting signed off')
      setSignOffItem(null)
      setSignOffForm({ signedOffBy: '', signedOffDate: '' })
      load()
    } catch { toast.error('Failed to save sign-off') }
    finally { setSaving(false) }
  }

  const handleDelete = async (m: any) => {
    if (!window.confirm(`Delete this ${label.toLowerCase()} record? This cannot be undone.`)) return
    setDeletingId(m.id)
    try {
      await api.delete(`/meetings/${m.id}`)
      toast.success(`${label} deleted`)
      load()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to delete') }
    finally { setDeletingId(null) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            <Users className="w-5 h-5" style={{ color: '#e8b130' }} /> {label}
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">Record and review {label.toLowerCase()} minutes</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {shownMeetings.length > 0 && (
            <>
              <Button size="sm" variant="secondary" icon={<FileText className="w-3.5 h-3.5" />}
                onClick={() => {
                  const cols = [
                    { key: 'date', label: 'Date' },
                    { key: 'conducted_by', label: 'Conducted By' },
                    { key: 'location', label: 'Service / Location' },
                    { key: 'notes', label: 'Notes' },
                    { key: 'action_plan', label: 'Action Plan' },
                    { key: 'status', label: 'Sign-off' },
                  ]
                  const rows = shownMeetings.map((m: any) => ({
                    date: m.meeting_date ? format(new Date(m.meeting_date), 'd MMM yyyy') : '—',
                    conducted_by: m.conducted_by || '—',
                    location: m.service_location || m.team_name || '—',
                    notes: m.notes || '—',
                    action_plan: m.action_plan || '—',
                    status: m.signed_off ? 'Signed off' : 'Pending',
                  }))
                  if (!printLetterheadTable(`${label} Records`, cols, rows)) {
                    toast.error('Please allow pop-ups to print / save PDF')
                  }
                }}>
                Print / PDF
              </Button>
              <Button size="sm" variant="secondary" icon={<Download className="w-3.5 h-3.5" />}
                onClick={() => {
                  const cols = [
                    { key: 'date', label: 'Date' },
                    { key: 'conducted_by', label: 'Conducted By' },
                    { key: 'location', label: 'Service / Location' },
                    { key: 'notes', label: 'Notes' },
                    { key: 'action_plan', label: 'Action Plan' },
                    { key: 'status', label: 'Sign-off' },
                  ]
                  const rows = shownMeetings.map((m: any) => ({
                    date: m.meeting_date ? format(new Date(m.meeting_date), 'd MMM yyyy') : '',
                    conducted_by: m.conducted_by || '',
                    location: m.service_location || m.team_name || '',
                    notes: m.notes || '',
                    action_plan: m.action_plan || '',
                    status: m.signed_off ? 'Signed off' : 'Pending',
                  }))
                  downloadCsv(label.toLowerCase().replace(/\s+/g, '-'), cols, rows)
                }}>
                Export CSV
              </Button>
            </>
          )}
          {canLoad && (
            <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setCreateOpen(true)}>New {label}</Button>
          )}
        </div>
      </div>

      {!canLoad ? null : loading ? (
        <Spinner />
      ) : meetings.length === 0 ? (
        <EmptyState title={`No ${label.toLowerCase()} records`} description={`${label} minutes will appear here once recorded`}
          action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>New {label}</Button>} />
      ) : (
        <div className="space-y-3">
          {/* Search & Date Range Filter Bar — enabled across ALL meeting types (Management, Team, Resident, Staff) */}
          <div className="card p-4">
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input className="input pl-9 w-full text-sm" placeholder="Search notes, actions, chair, people..."
                    value={filterText} onChange={e => setFilterText(e.target.value)} />
                </div>
              </div>
              <div className="min-w-[180px]">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Select Meeting</label>
                <select className="input w-full text-sm" value={filterSpecificId} onChange={e => setFilterSpecificId(e.target.value)}>
                  <option value="">All meetings ({meetings.length})</option>
                  {meetings.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.meeting_date ? format(new Date(m.meeting_date), 'd MMM yyyy') : 'Undated'}
                      {m.conducted_by ? ` — ${m.conducted_by}` : ''}
                      {m.service_location ? ` (${m.service_location})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              {isBriefing && (
                <div className="min-w-[150px]">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Team</label>
                  <select className="input w-full text-sm" value={filterTeam} onChange={e => setFilterTeam(e.target.value)}>
                    <option value="">All teams</option>
                    {filterTeams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Date From</label>
                <input type="date" className="input text-sm" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Date To</label>
                <input type="date" className="input text-sm" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
              </div>
              <div className="min-w-[130px]">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Sign-Off</label>
                <select className="input w-full text-sm" value={filterSignOff} onChange={e => setFilterSignOff(e.target.value as any)}>
                  <option value="all">All</option>
                  <option value="signed">Signed off</option>
                  <option value="unsigned">Pending</option>
                </select>
              </div>
              {filtersActive && (
                <Button type="button" variant="secondary" size="sm" icon={<X className="w-3.5 h-3.5" />} onClick={clearFilters}>Clear</Button>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Showing <strong className="text-slate-700">{shownMeetings.length}</strong> of {meetings.length} meeting{meetings.length !== 1 ? 's' : ''}
            </p>
          </div>
          {shownMeetings.length === 0 ? (
            <EmptyState title="No meetings match" description="Try widening the date range or clearing the filters."
              action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>} />
          ) : (
          <>
          {shownMeetings.map((m: any) => {
            const expanded = expandedId === m.id
            return (
              <div key={m.id} className="card overflow-hidden">
                <button onClick={() => setExpandedId(p => p === m.id ? null : m.id)}
                  className="w-full p-4 text-left hover:bg-white/3 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold border capitalize bg-amber-500/10 border-amber-500/25 text-amber-600">
                          {m.meeting_date ? format(new Date(m.meeting_date), 'd MMM yyyy') : '—'}
                        </span>
                        {m.signed_off ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-600"><ShieldCheck className="w-3 h-3" />Signed off</span>
                        ) : (
                          <span className="text-xs text-slate-400">Not signed off</span>
                        )}
                        {meetingType === 'team_briefing' && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold border bg-blue-500/10 border-blue-500/25 text-blue-600">
                            {m.team_name || 'All staff'}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 text-xs text-slate-400 mt-1">
                        <span><span className="font-semibold text-slate-500">Conducted by:</span> {m.conducted_by}</span>
                        {m.service_location && <span><span className="font-semibold text-slate-500">Service/Location:</span> {m.service_location}</span>}
                      </div>
                      {m.notes && <p className="text-sm text-slate-600 mt-2 line-clamp-2">{m.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                    </div>
                  </div>
                </button>

                {expanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-white/5 space-y-4">
                    <MeetingView meeting={m} />
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 flex-wrap gap-2">
                      <p className="text-xs text-slate-500">
                        {m.created_by === user?.id && !canManage ? 'You created this record' : 'Meeting actions'}
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="secondary" icon={<Download className="w-3.5 h-3.5" />}
                          onClick={() => downloadMeetingPdf(m)}>
                          Download PDF
                        </Button>
                        {(canManage || m.created_by === user?.id) && (
                          <>
                            <Button size="sm" variant="outline" icon={<Pencil className="w-3.5 h-3.5" />}
                              onClick={() => setEditItem(m)}>
                              Edit
                            </Button>
                            <Button size="sm" variant="danger" loading={deletingId === m.id}
                              icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => handleDelete(m)}>
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    {meetingType === 'team_briefing' && (
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <p className="text-xs text-slate-500">Send these minutes to staff</p>
                        <Button size="sm" variant="outline" icon={<Send className="w-3.5 h-3.5" />}
                          onClick={() => setSendItem(m)}>
                          Send Minutes
                        </Button>
                      </div>
                    )}
                    {!m.signed_off && canManage && (
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <p className="text-xs text-slate-500">Not yet signed off</p>
                        <Button size="sm" variant="outline" icon={<ShieldCheck className="w-3.5 h-3.5" />}
                          onClick={() => { setSignOffItem(m); setSignOffForm({ signedOffBy: '', signedOffDate: ukDateStr() }) }}>
                          Sign Off
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          </>
          )}
        </div>
      )}

      <CreateModal open={createOpen} meetingType={meetingType} parentId={parentId} homeId={homeId} label={label}
        defaultConductedBy={user ? `${user.firstName} ${user.lastName}`.trim() : ''}
        onClose={() => setCreateOpen(false)} onSaved={() => { setCreateOpen(false); load() }} />

      <CreateModal open={!!editItem} editing={editItem} meetingType={meetingType} parentId={parentId} homeId={homeId} label={label}
        defaultConductedBy={user ? `${user.firstName} ${user.lastName}`.trim() : ''}
        onClose={() => setEditItem(null)} onSaved={() => { setEditItem(null); load() }} />

      <Modal open={!!signOffItem} onClose={() => setSignOffItem(null)} title={`Sign Off: ${label}`} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Confirm that this meeting record has been reviewed and approved.</p>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Signed off by *</label>
            <input className="input w-full" placeholder="Full name of approver"
              value={signOffForm.signedOffBy} onChange={e => setSignOffForm(p => ({ ...p, signedOffBy: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Date</label>
            <input type="date" className="input w-full"
              value={signOffForm.signedOffDate} onChange={e => setSignOffForm(p => ({ ...p, signedOffDate: e.target.value }))} />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setSignOffItem(null)}>Cancel</Button>
            <Button loading={saving} onClick={handleSignOff} icon={<ShieldCheck className="w-4 h-4" />}>Confirm Sign Off</Button>
          </div>
        </div>
      </Modal>

      <SendMinutesModal meeting={sendItem} homeId={homeId} onClose={() => setSendItem(null)} />
    </div>
  )
}

function SendMinutesModal({ meeting, homeId, onClose }: { meeting: any; homeId?: string; onClose: () => void }) {
  const [staff, setStaff] = useState<any[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!meeting) return
    setSelected([])
    setLoading(true)
    staffApi.list(homeId ? { homeId } : undefined).then(res => setStaff(res.data.data || []))
      .catch(() => toast.error('Failed to load staff list'))
      .finally(() => setLoading(false))
  }, [meeting, homeId])

  const toggle = (id: string) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  const send = async () => {
    if (!selected.length) { toast.error('Select at least one staff member'); return }
    setSending(true)
    try {
      await api.post(`/meetings/${meeting.id}/send-minutes`, { staffIds: selected })
      toast.success(`Minutes sent to ${selected.length} staff member${selected.length === 1 ? '' : 's'}`)
      onClose()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to send') }
    finally { setSending(false) }
  }

  return (
    <Modal open={!!meeting} onClose={onClose} title="Send Minutes to Staff" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-slate-500">Tick who should receive these meeting minutes. They'll get an in-app notification.</p>
        {loading ? <Spinner /> : (
          <div className="max-h-72 overflow-y-auto space-y-1 border border-slate-100 rounded-lg p-2">
            {staff.map((s: any) => (
              <label key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} className="rounded" />
                <span className="text-sm text-slate-700">{s.first_name} {s.last_name}</span>
                <span className="text-xs text-slate-400 ml-auto capitalize">{(s.role || '').replace(/_/g, ' ')}</span>
              </label>
            ))}
          </div>
        )}
        <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={sending} onClick={send} icon={<Send className="w-4 h-4" />}>Send</Button>
        </div>
      </div>
    </Modal>
  )
}

function MeetingView({ meeting: m }: { meeting: any }) {
  const fields = [
    { label: 'Meeting conducted by', value: m.conducted_by },
    { label: 'Attendees', value: m.attendees },
    { label: 'Service / Location', value: m.service_location },
    { label: 'Notes', value: m.notes },
    { label: 'Action Plan', value: m.action_plan },
    { label: 'Signed off by', value: m.signed_off ? `${m.signed_off_by}${m.signed_off_date ? ` (${format(new Date(m.signed_off_date), 'd MMM yyyy')})` : ''}` : null },
  ]
  return (
    <div className="space-y-3">
      {fields.map(f => f.value ? (
        <div key={f.label}>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">{f.label}</p>
          <p className="text-sm text-slate-700 whitespace-pre-line">{f.value}</p>
        </div>
      ) : null)}
    </div>
  )
}

function CreateModal({ open, editing, meetingType, parentId, homeId, label, defaultConductedBy, onClose, onSaved }: {
  open: boolean; editing?: any; meetingType: MeetingType; parentId?: string; homeId?: string; label: string
  defaultConductedBy: string; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState({ ...BLANK })
  const [loading, setLoading] = useState(false)
  const [teams, setTeams] = useState<any[]>([])
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  // Team briefings used to have no team linkage at all, so every briefing was
  // visible home-wide regardless of which service it was for — a
  // confidentiality breach confirmed live. Picking a team here (optional —
  // leave blank for a genuine all-staff notice) scopes the record to that
  // team on the backend.
  useEffect(() => {
    if (!open || meetingType !== 'team_briefing' || !homeId) return
    api.get('/teams', { params: { homeId } }).then(res => setTeams(res.data.data || [])).catch(() => {})
  }, [open, meetingType, homeId])

  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({
        conductedBy: editing.conducted_by || '',
        meetingDate: editing.meeting_date ? String(editing.meeting_date).slice(0, 10) : ukDateStr(),
        attendees: editing.attendees || '',
        serviceLocation: editing.service_location || '',
        notes: editing.notes || '',
        actionPlan: editing.action_plan || '',
        teamId: editing.team_id || '',
      })
    } else {
      setForm({ ...BLANK, conductedBy: defaultConductedBy, meetingDate: ukDateStr() })
    }
  }, [open, editing, defaultConductedBy])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.conductedBy.trim()) { toast.error('Meeting conducted by is required'); return }
    setLoading(true)
    try {
      const payload: any = {
        conductedBy: form.conductedBy,
        meetingDate: form.meetingDate,
        attendees: form.attendees,
        serviceLocation: form.serviceLocation,
        notes: form.notes,
        actionPlan: form.actionPlan,
      }
      if (meetingType === 'team_briefing') payload.teamId = form.teamId || null
      if (editing) {
        await api.put(`/meetings/${editing.id}`, payload)
      } else {
        if (meetingType === 'resident') payload.suId = parentId
        else if (meetingType === 'staff') payload.staffId = parentId
        else if (meetingType === 'team') payload.teamId = parentId
        else payload.homeId = homeId
        await api.post(createUrl(meetingType), payload)
      }
      toast.success(`${label} saved`)
      onSaved()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? `Edit ${label}` : `New ${label}`} size="lg">
      <form onSubmit={save} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Meeting conducted by *</label>
            <input className="input w-full" required value={form.conductedBy} onChange={e => set('conductedBy', e.target.value)} />
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input w-full" value={form.meetingDate} onChange={e => set('meetingDate', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Service / Location</label>
          <input className="input w-full" placeholder="What the meeting concerns / where it took place..." value={form.serviceLocation} onChange={e => set('serviceLocation', e.target.value)} />
        </div>
        {meetingType === 'team_briefing' && (
          <div>
            <label className="label">Team</label>
            <select className="input w-full" value={form.teamId} onChange={e => set('teamId', e.target.value)}>
              <option value="">Management only (no team selected)</option>
              {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <p className="text-xs text-slate-400 mt-1">Pick a team so only that team's staff can see these minutes. For an all-staff notice, use the Noticeboard instead — leaving this blank restricts the meeting to management.</p>
          </div>
        )}
        <SpeechTextarea label="Attendees" rows={2} value={form.attendees} onChange={v => set('attendees', v)}
          placeholder="Names of the people who attended the meeting..." />
        <SpeechTextarea label="Notes" rows={5} value={form.notes} onChange={v => set('notes', v)}
          placeholder="Minutes / notes of the meeting..." />
        <SpeechTextarea label="Action Plan" rows={4} value={form.actionPlan} onChange={v => set('actionPlan', v)}
          placeholder="Any action plan arising from the meeting..." />
        <div className="flex gap-3 justify-end pt-2 border-t border-white/10">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Save {label}</Button>
        </div>
      </form>
    </Modal>
  )
}
