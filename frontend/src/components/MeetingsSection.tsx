import React, { useEffect, useState, useCallback } from 'react'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, Button, Modal, EmptyState } from './ui'
import { SpeechTextarea } from './ui/SpeechButton'
import { Users, Plus, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

type MeetingType = 'resident' | 'staff' | 'management'

interface MeetingsSectionProps {
  meetingType: MeetingType
  /** su_id for resident meetings, staff_id for staff meetings — omitted for management meetings */
  parentId?: string
  /** home_id — required for management meetings, otherwise ignored (server derives it) */
  homeId?: string
  /** Display label used in headings/buttons, e.g. "Resident Meeting" / "Staff Meeting" / "Management Meeting" */
  label: string
}

const BLANK = {
  conductedBy: '', meetingDate: new Date().toISOString().split('T')[0],
  attendees: '', serviceLocation: '', notes: '', actionPlan: '',
}

function listUrl(meetingType: MeetingType, parentId?: string, homeId?: string) {
  if (meetingType === 'resident') return `/meetings/su/${parentId}`
  if (meetingType === 'staff') return `/meetings/staff/${parentId}`
  return `/meetings/management${homeId ? `?homeId=${homeId}` : ''}`
}

function createUrl(meetingType: MeetingType) {
  if (meetingType === 'resident') return '/meetings/su'
  if (meetingType === 'staff') return '/meetings/staff'
  return '/meetings/management'
}

export default function MeetingsSection({ meetingType, parentId, homeId, label }: MeetingsSectionProps) {
  const { user, isRole } = useAuth()
  const canManage = isRole('home_manager', 'group_admin', 'deputy_manager', 'admin', 'director', 'registered_manager', 'service_manager', 'senior_carer')
  const [meetings, setMeetings] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [signOffItem, setSignOffItem] = useState<any>(null)
  const [signOffForm, setSignOffForm] = useState({ signedOffBy: '', signedOffDate: '' })
  const [saving, setSaving] = useState(false)

  const canLoad = meetingType === 'management' ? !!homeId : !!parentId

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
        signedOffDate: signOffForm.signedOffDate || new Date().toISOString().split('T')[0],
      })
      toast.success('Meeting signed off')
      setSignOffItem(null)
      setSignOffForm({ signedOffBy: '', signedOffDate: '' })
      load()
    } catch { toast.error('Failed to save sign-off') }
    finally { setSaving(false) }
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
        {canLoad && (
          <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setCreateOpen(true)}>New {label}</Button>
        )}
      </div>

      {!canLoad ? null : loading ? (
        <Spinner />
      ) : meetings.length === 0 ? (
        <EmptyState title={`No ${label.toLowerCase()} records`} description={`${label} minutes will appear here once recorded`}
          action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>New {label}</Button>} />
      ) : (
        <div className="space-y-3">
          {meetings.map((m: any) => {
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
                    {!m.signed_off && canManage && (
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <p className="text-xs text-slate-500">Not yet signed off</p>
                        <Button size="sm" variant="outline" icon={<ShieldCheck className="w-3.5 h-3.5" />}
                          onClick={() => { setSignOffItem(m); setSignOffForm({ signedOffBy: '', signedOffDate: new Date().toISOString().split('T')[0] }) }}>
                          Sign Off
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <CreateModal open={createOpen} meetingType={meetingType} parentId={parentId} homeId={homeId} label={label}
        defaultConductedBy={user ? `${user.firstName} ${user.lastName}`.trim() : ''}
        onClose={() => setCreateOpen(false)} onSaved={() => { setCreateOpen(false); load() }} />

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
    </div>
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

function CreateModal({ open, meetingType, parentId, homeId, label, defaultConductedBy, onClose, onSaved }: {
  open: boolean; meetingType: MeetingType; parentId?: string; homeId?: string; label: string
  defaultConductedBy: string; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState({ ...BLANK })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (open) setForm({ ...BLANK, conductedBy: defaultConductedBy, meetingDate: new Date().toISOString().split('T')[0] })
  }, [open, defaultConductedBy])

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
      if (meetingType === 'resident') payload.suId = parentId
      else if (meetingType === 'staff') payload.staffId = parentId
      else payload.homeId = homeId
      await api.post(createUrl(meetingType), payload)
      toast.success(`${label} saved`)
      onSaved()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={`New ${label}`} size="lg">
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
