import React, { useState, useEffect } from 'react'
import { Stethoscope, Plus, CalendarClock, CheckCircle2, Pencil } from 'lucide-react'
import { Button, Modal, Input, Select, Spinner, EmptyState, PrintButton, SpeechTextarea } from '../../components/ui'
import api from '../../api'
import clsx from 'clsx'
import { format, isPast, parseISO } from 'date-fns'
import { buildLetterheadPage, openLetterheadPrint, fmtDate, esc, type PrintSection } from '../../utils/letterheadPrint'
import toast from 'react-hot-toast'

const PROFESSIONAL_TYPES = [
  { value: 'GP', label: 'GP (General Practitioner)' },
  { value: 'District Nurse', label: 'District Nurse' },
  { value: 'Physiotherapist', label: 'Physiotherapist' },
  { value: 'Occupational Therapist', label: 'Occupational Therapist' },
  { value: 'Social Worker', label: 'Social Worker' },
  { value: 'Psychiatrist', label: 'Psychiatrist' },
  { value: 'Community Nurse', label: 'Community Nurse' },
  { value: 'Dietitian', label: 'Dietitian' },
  { value: 'Speech & Language', label: 'Speech & Language Therapist' },
  { value: 'Dentist', label: 'Dentist' },
  { value: 'Optician', label: 'Optician' },
  { value: 'Chiropodist', label: 'Chiropodist / Podiatrist' },
  { value: 'Pharmacist', label: 'Pharmacist' },
  { value: 'Palliative Care', label: 'Palliative Care' },
  { value: 'Other', label: 'Other' },
]

const TYPE_COLORS: Record<string, string> = {
  'GP': 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  'District Nurse': 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  'Physiotherapist': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  'Occupational Therapist': 'text-teal-400 bg-teal-500/10 border-teal-500/30',
  'Social Worker': 'text-amber-400 bg-amber-500/10 border-amber-500/30',
}

function typeColor(type: string) {
  return TYPE_COLORS[type] || 'text-slate-400 bg-slate-500/10 border-slate-500/30'
}

function buildVisitPrintPage(r: any): string {
  const sections: PrintSection[] = []
  sections.push({
    title: 'Visit Details',
    inner: `
      <table class="fields">
        <tr><th>Professional Type</th><td>${esc(r.professional_type)}</td></tr>
        <tr><th>Visit Date</th><td>${fmtDate(r.visit_date)}</td></tr>
        ${r.professional_name ? `<tr><th>Professional Name</th><td>${esc(r.professional_name)}</td></tr>` : ''}
        ${r.organisation ? `<tr><th>Organisation</th><td>${esc(r.organisation)}</td></tr>` : ''}
        <tr><th>Recorded By</th><td>${esc(r.recorded_by_name)}</td></tr>
      </table>
    `,
  })
  if (r.reason) sections.push({ title: 'Reason for Visit', inner: `<p class="body-text">${esc(r.reason)}</p>` })
  if (r.outcome) sections.push({ title: 'Outcome / Findings', inner: `<p class="body-text">${esc(r.outcome)}</p>` })
  if (r.instructions_left) sections.push({ title: 'Instructions Left for Care Team', inner: `<p class="body-text">${esc(r.instructions_left)}</p>` })
  if (r.follow_up_date) {
    sections.push({
      title: 'Follow-Up',
      inner: `<table class="fields"><tr><th>Follow-up Date</th><td>${fmtDate(r.follow_up_date)}</td></tr><tr class="${r.follow_up_done ? 'on' : ''}"><th>Status</th><td>${r.follow_up_done ? 'Completed' : 'Pending'}</td></tr></table>${r.follow_up_notes ? `<p class="body-text">${esc(r.follow_up_notes)}</p>` : ''}`,
    })
  }
  return buildLetterheadPage({
    docTitle: 'Professional Visit Record',
    docSubtitle: esc(r.professional_type),
    docRefPrefix: 'PV',
    docRefId: r.id,
    residentName: r.su_name || 'Unknown resident',
    sections,
  })
}

export default function ProfessionalVisits() {
  const [visits, setVisits] = useState<any[]>([])
  const [upcoming, setUpcoming] = useState<any[]>([])
  const [serviceUsers, setServiceUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedSU, setSelectedSU] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [view, setView] = useState<'log' | 'followups'>('log')
  const [editVisit, setEditVisit] = useState<any>(null)
  const [editForm, setEditForm] = useState({ outcome: '', instructionsLeft: '', followUpDate: '', followUpNotes: '' })
  const [editSubmitting, setEditSubmitting] = useState(false)

  const [form, setForm] = useState({
    suId: '', visitDate: new Date().toISOString().slice(0, 10),
    professionalType: 'GP', professionalName: '', organisation: '',
    reason: '', outcome: '', instructionsLeft: '',
    followUpDate: '', followUpNotes: '',
  })

  async function load() {
    setLoading(true)
    try {
      const [visitsRes, suRes, upcomingRes] = await Promise.all([
        api.get('/professional-visits', {
          params: {
            ...(selectedSU ? { suId: selectedSU } : {}),
            ...(selectedType ? { type: selectedType } : {}),
          }
        }),
        api.get('/service-users'),
        api.get('/professional-visits/upcoming'),
      ])
      setVisits(visitsRes.data.data || [])
      setServiceUsers(suRes.data.data || [])
      setUpcoming(upcomingRes.data.data || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [selectedSU, selectedType])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/professional-visits', form)
      setShowAdd(false)
      setForm(f => ({ ...f, suId: '', professionalName: '', organisation: '', reason: '', outcome: '', instructionsLeft: '', followUpDate: '', followUpNotes: '' }))
      load()
    } catch {}
    setSubmitting(false)
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editVisit) return
    setEditSubmitting(true)
    try {
      await api.patch(`/professional-visits/${editVisit.id}`, editForm)
      setEditVisit(null)
      load()
    } catch {}
    setEditSubmitting(false)
  }

  function openEdit(r: any) {
    setEditVisit(r)
    setEditForm({
      outcome: r.outcome || '',
      instructionsLeft: r.instructions_left || '',
      followUpDate: r.follow_up_date ? r.follow_up_date.slice(0, 10) : '',
      followUpNotes: r.follow_up_notes || '',
    })
  }

  async function markFollowUpDone(id: string) {
    try {
      await api.patch(`/professional-visits/${id}/follow-up-done`)
      load()
    } catch {}
  }

  const suOptions = serviceUsers.map((s: any) => ({ value: s.id, label: `${s.first_name} ${s.last_name}` }))

  const handlePrintVisits = () => {
    if (visits.length === 0) { toast.error('No visits to print for the current filters'); return }
    const body = visits.map(r => buildVisitPrintPage(r)).join('')
    const ok = openLetterheadPrint('Professional Visits Log', body)
    if (!ok) toast.error('Pop-up blocked — please allow pop-ups for this site and try again')
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Stethoscope className="w-6 h-6 text-amber-400" /> Professional Visits
          </h1>
          <p className="text-slate-400 text-sm mt-1">GP, OT, nursing and other professional visit records</p>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton onClick={handlePrintVisits} />
          <Button variant="gold" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>
            Log Visit
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: '#1a1a1a' }}>
        {(['log', 'followups'] as const).map(t => (
          <button key={t} onClick={() => setView(t)}
            className={clsx('px-5 py-2 rounded-lg text-sm font-medium transition-all', view === t ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-200')}
            style={view === t ? { background: 'linear-gradient(135deg, #e8b130, #d4961a)' } : {}}>
            {t === 'log' ? 'Visit Log' : `Follow-ups${upcoming.length ? ` (${upcoming.length})` : ''}`}
          </button>
        ))}
      </div>

      {view === 'log' && (
        <div className="flex gap-3 mb-4 flex-wrap">
          <select className="input w-52" value={selectedSU} onChange={e => setSelectedSU(e.target.value)}>
            <option value="">All Residents</option>
            {serviceUsers.map((s: any) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
          </select>
          <select className="input w-52" value={selectedType} onChange={e => setSelectedType(e.target.value)}>
            <option value="">All Types</option>
            {PROFESSIONAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      )}

      {loading ? <Spinner /> : (
        <>
          {view === 'followups' && (
            upcoming.length === 0 ? <EmptyState title="No pending follow-ups" description="No follow-ups due in the next 30 days" /> : (
              <div className="space-y-3">
                {upcoming.map(r => (
                  <div key={r.id} className={clsx('card p-4 border-l-4', isPast(parseISO(r.follow_up_date)) ? 'border-l-rose-500/60' : 'border-l-amber-400/60')}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium border', typeColor(r.professional_type))}>
                            {r.professional_type}
                          </span>
                          <CalendarClock className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-xs text-amber-400 font-medium">Follow-up: {format(parseISO(r.follow_up_date), 'dd MMM yyyy')}</span>
                        </div>
                        <p className="font-semibold text-white">{r.su_name}</p>
                        {r.professional_name && <p className="text-sm text-slate-400">{r.professional_name}</p>}
                        {r.follow_up_notes && <p className="text-sm text-slate-300 mt-1">{r.follow_up_notes}</p>}
                      </div>
                      <Button variant="ghost" onClick={() => markFollowUpDone(r.id)} icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}>
                        Done
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {view === 'log' && (
            visits.length === 0 ? <EmptyState title="No visits recorded" description="Use 'Log Visit' to record a professional visit" /> : (
              <div className="space-y-3">
                {visits.map(r => (
                  <div key={r.id} className="card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium border', typeColor(r.professional_type))}>
                            {r.professional_type}
                          </span>
                          {r.follow_up_date && !r.follow_up_done && (
                            <span className="flex items-center gap-1 text-xs text-amber-400">
                              <CalendarClock className="w-3 h-3" /> Follow-up {format(parseISO(r.follow_up_date), 'd MMM')}
                            </span>
                          )}
                          {r.follow_up_done && <span className="text-xs text-emerald-400">Follow-up done</span>}
                        </div>
                        <p className="font-semibold text-white">{r.su_name}</p>
                        {r.professional_name && (
                          <p className="text-sm text-slate-400">{r.professional_name}{r.organisation ? ` · ${r.organisation}` : ''}</p>
                        )}
                        {r.reason && <p className="text-sm text-slate-300 mt-1">Reason: {r.reason}</p>}
                        {r.outcome && <p className="text-sm text-amber-400/80 mt-1">Outcome: {r.outcome}</p>}
                        {r.instructions_left && <p className="text-sm text-blue-300/80 mt-1">Instructions: {r.instructions_left}</p>}
                      </div>
                      <div className="text-right text-xs text-slate-400 flex-shrink-0 flex flex-col items-end gap-2">
                        <div className="text-white font-medium">{format(parseISO(r.visit_date), 'dd MMM yyyy')}</div>
                        <div>{r.recorded_by_name}</div>
                        <button onClick={() => openEdit(r)}
                          className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors">
                          <Pencil className="w-3 h-3" /> Edit outcome
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}

      <Modal open={!!editVisit} onClose={() => setEditVisit(null)} title="Update Visit Outcome" size="md">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <SpeechTextarea label="Outcome / Findings" rows={3} value={editForm.outcome}
            onChange={v => setEditForm(f => ({ ...f, outcome: v }))}
            placeholder="What was found / decided?" />
          <SpeechTextarea label="Instructions left" rows={2} value={editForm.instructionsLeft}
            onChange={v => setEditForm(f => ({ ...f, instructionsLeft: v }))}
            placeholder="Any instructions for care team..." />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Follow-up date" type="date" value={editForm.followUpDate}
              onChange={e => setEditForm(f => ({ ...f, followUpDate: e.target.value }))} />
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Follow-up notes</label>
              <input className="input w-full" value={editForm.followUpNotes}
                onChange={e => setEditForm(f => ({ ...f, followUpNotes: e.target.value }))}
                placeholder="What needs to happen?" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setEditVisit(null)}>Cancel</Button>
            <Button type="submit" variant="gold" loading={editSubmitting}>Save</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Log Professional Visit" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Service User *" options={suOptions} placeholder="Select resident..." value={form.suId} onChange={e => setForm(f => ({ ...f, suId: e.target.value }))} required />
            <Input label="Visit Date" type="date" value={form.visitDate} onChange={e => setForm(f => ({ ...f, visitDate: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Professional Type *" options={PROFESSIONAL_TYPES} value={form.professionalType} onChange={e => setForm(f => ({ ...f, professionalType: e.target.value }))} />
            <Input label="Professional Name" value={form.professionalName} onChange={e => setForm(f => ({ ...f, professionalName: e.target.value }))} placeholder="e.g. Dr. Smith" />
          </div>
          <Input label="Organisation / Practice" value={form.organisation} onChange={e => setForm(f => ({ ...f, organisation: e.target.value }))} placeholder="e.g. Riverside Medical Practice" />
          <SpeechTextarea label="Reason for visit" rows={2} value={form.reason} onChange={v => setForm(f => ({ ...f, reason: v }))} placeholder="Why did they visit?" />
          <SpeechTextarea label="Outcome / Findings" rows={2} value={form.outcome} onChange={v => setForm(f => ({ ...f, outcome: v }))} placeholder="What was found / decided?" />
          <SpeechTextarea label="Instructions left" rows={2} value={form.instructionsLeft} onChange={v => setForm(f => ({ ...f, instructionsLeft: v }))} placeholder="Any instructions for care team..." />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Follow-up date (if needed)" type="date" value={form.followUpDate} onChange={e => setForm(f => ({ ...f, followUpDate: e.target.value }))} />
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Follow-up notes</label>
              <input className="input w-full" value={form.followUpNotes} onChange={e => setForm(f => ({ ...f, followUpNotes: e.target.value }))} placeholder="What needs to happen?" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" variant="gold" loading={submitting}>Save Record</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
