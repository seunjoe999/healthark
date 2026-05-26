import React, { useEffect, useMemo, useState } from 'react'
import { homesApi, suApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, Button, Select } from '../../components/ui'
import { FileText, Printer, Save, Check, Mic } from 'lucide-react'
import SignaturePad from '../../components/SignaturePad'
import SpeechInput from '../../components/SpeechInput'

const SHIFT_TIMES: Record<string, string> = {
  early: '07:00 – 14:00',
  late: '14:00 – 22:00',
  night: '22:00 – 07:00',
}

const SHIFT_LABELS: Record<string, string> = {
  early: 'Early',
  late: 'Late',
  night: 'Night',
}

function SignOffSection({ homeId, shiftDate, shiftType }: { homeId: string; shiftDate: string; shiftType: string }) {
  const { user } = useAuth()
  const [sigs, setSigs] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    if (!homeId || !shiftDate || !shiftType) return
    api.get('/signatures/handover', { params: { homeId, shiftDate, shiftType } })
      .then(res => {
        const map: Record<string, any> = {}
        for (const s of res.data.data || []) map[s.role] = s
        setSigs(map)
      }).catch(() => {})
  }, [homeId, shiftDate, shiftType])

  const saveSignature = async (role: 'outgoing' | 'incoming', dataUrl: string) => {
    setSaving(role)
    try {
      const res = await api.post('/signatures/handover', {
        homeId, shiftDate, shiftType, role, signatureData: dataUrl,
        staffId: user?.id,
      })
      setSigs(prev => ({ ...prev, [role]: res.data.data }))
    } catch (e) { console.error(e) }
    finally { setSaving(null) }
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 no-print">
      <h3 className="font-bold text-slate-800 mb-4">Handover Sign-off</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <SignaturePad
            label="Handing over (outgoing)"
            savedSignature={sigs['outgoing']?.signature_data}
            onSave={(dataUrl) => saveSignature('outgoing', dataUrl)}
            disabled={saving === 'outgoing'}
          />
          {sigs['outgoing'] && (
            <p className="text-xs text-slate-400 mt-1">
              Signed by {sigs['outgoing'].staff_name} at {format(new Date(sigs['outgoing'].signed_at), 'HH:mm, d MMM')}
            </p>
          )}
        </div>
        <div>
          <SignaturePad
            label="Taking over (incoming)"
            savedSignature={sigs['incoming']?.signature_data}
            onSave={(dataUrl) => saveSignature('incoming', dataUrl)}
            disabled={saving === 'incoming'}
          />
          {sigs['incoming'] && (
            <p className="text-xs text-slate-400 mt-1">
              Signed by {sigs['incoming'].staff_name} at {format(new Date(sigs['incoming'].signed_at), 'HH:mm, d MMM')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

interface PreviousNote {
  id: string
  su_id: string
  su_name: string
  staff_name: string | null
  shift_date: string
  shift_type: string
  notes: string
  updated_at: string
}

interface PreviousGroup {
  key: string
  date: string
  shiftType: string
  shiftLabel: string
  shiftTime: string
  staffName: string
  updatedAt: string
  entries: PreviousNote[]
}

function groupPrevious(notes: PreviousNote[]): PreviousGroup[] {
  const groups: Record<string, PreviousGroup> = {}
  for (const n of notes) {
    const key = `${n.shift_date}|${n.shift_type}|${n.staff_name || 'Staff'}`
    if (!groups[key]) {
      groups[key] = {
        key,
        date: n.shift_date,
        shiftType: n.shift_type,
        shiftLabel: SHIFT_LABELS[n.shift_type] || n.shift_type,
        shiftTime: SHIFT_TIMES[n.shift_type] || '',
        staffName: n.staff_name || 'Staff',
        updatedAt: n.updated_at,
        entries: [],
      }
    }
    groups[key].entries.push(n)
    if (new Date(n.updated_at) > new Date(groups[key].updatedAt)) {
      groups[key].updatedAt = n.updated_at
    }
  }
  return Object.values(groups).sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    const order = { night: 0, late: 1, early: 2 } as Record<string, number>
    return (order[a.shiftType] ?? 9) - (order[b.shiftType] ?? 9)
  })
}

function shiftHeaderTime(shift: string): string {
  if (shift === 'early') return '08:00'
  if (shift === 'late') return '14:00'
  if (shift === 'night') return '20:00'
  return ''
}

export default function HandoverReport() {
  const { user } = useAuth()
  const [homes, setHomes] = useState<any[]>([])
  const [sus, setSus] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [shift, setShift] = useState<'early' | 'late' | 'night'>('early')
  const [residentNotes, setResidentNotes] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<Record<string, number>>({})
  const [previous, setPrevious] = useState<PreviousNote[]>([])
  const [loadingPrev, setLoadingPrev] = useState(false)
  const today = format(new Date(), 'yyyy-MM-dd')

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
  }, [selectedHome])

  useEffect(() => {
    if (!selectedHome || !shift) return
    api.get('/reports/handover-notes', { params: { homeId: selectedHome, shiftDate: today, shiftType: shift } })
      .then(res => {
        const map: Record<string, string> = {}
        for (const n of res.data.data || []) map[n.su_id] = n.notes || ''
        setResidentNotes(map)
      }).catch(() => {})
  }, [selectedHome, shift, today])

  useEffect(() => {
    if (!selectedHome) return
    setLoadingPrev(true)
    api.get('/reports/handover-notes/recent', { params: { homeId: selectedHome, days: 7 } })
      .then(res => setPrevious(res.data.data || []))
      .catch(() => setPrevious([]))
      .finally(() => setLoadingPrev(false))
  }, [selectedHome])

  const homeName = useMemo(() => {
    const h = homes.find(x => x.id === selectedHome)
    return h?.name ? `${h.name}'s` : 'Service'
  }, [homes, selectedHome])

  const previousGroups = useMemo(() => groupPrevious(previous), [previous])

  const saveResidentNote = async (suId: string) => {
    setSavingId(suId)
    try {
      await api.put(`/reports/handover-notes/${suId}`, {
        homeId: selectedHome,
        shiftDate: today,
        shiftType: shift,
        notes: residentNotes[suId] || '',
      })
      setSavedAt(prev => ({ ...prev, [suId]: Date.now() }))
      // Refresh previous handovers
      api.get('/reports/handover-notes/recent', { params: { homeId: selectedHome, days: 7 } })
        .then(res => setPrevious(res.data.data || []))
        .catch(() => {})
    } catch {}
    finally { setSavingId(null) }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 no-print">
        <h1 className="font-display text-2xl text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-amber-400" /> Handover Report
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">{format(new Date(), 'EEEE d MMMM yyyy')}</p>
      </div>

      {/* Controls */}
      <div className="rounded-2xl border border-white/10 p-5 mb-6 no-print" style={{ background: '#1a1a1a' }}>
        <div className="flex flex-wrap gap-4 items-end">
          {homes.length > 1 && (
            <Select label="Care home" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}
              options={homes.map(h => ({ value: h.id, label: h.name }))} />
          )}
          <Select label="Shift" value={shift} onChange={e => setShift(e.target.value as any)}
            options={[
              { value: 'early', label: 'Early (07:00–14:00)' },
              { value: 'late', label: 'Late (14:00–22:00)' },
              { value: 'night', label: 'Night (22:00–07:00)' },
            ]} />
          <button onClick={() => window.print()}
            className="no-print inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
            style={{ background: '#1a1a1a', border: '1px solid rgba(232,177,48,0.3)', color: '#e8b130' }}>
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* Current Shift Entry */}
      <div className="rounded-2xl border border-white/10 p-6 mb-6 no-print" style={{ background: '#111' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bold text-lg text-white">Current Shift Handover</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {format(new Date(), 'd MMMM yyyy')} · {SHIFT_LABELS[shift]} shift · {SHIFT_TIMES[shift]}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-amber-400 font-medium" style={{ background: 'rgba(232,177,48,0.1)', border: '1px solid rgba(232,177,48,0.2)' }}>
            {user?.firstName} {user?.lastName}
          </div>
        </div>

        {sus.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No residents to write a handover for.</p>
        ) : (
          <div className="space-y-4">
            {sus.map((su) => {
              const name = `${su.first_name || su.firstName} ${su.last_name || su.lastName}`
              const value = residentNotes[su.id] || ''
              const recentlySaved = savedAt[su.id] && Date.now() - savedAt[su.id] < 3000
              return (
                <div key={su.id} className="rounded-xl p-4" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-white">{name}</h4>
                    <div className="flex items-center gap-2">
                      {recentlySaved && (
                        <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                          <Check className="w-3 h-3" /> Saved
                        </span>
                      )}
                      <button
                        onClick={() => saveResidentNote(su.id)}
                        disabled={savingId === su.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={{ background: 'rgba(232,177,48,0.15)', border: '1px solid rgba(232,177,48,0.3)', color: '#e8b130' }}>
                        <Save className="w-3 h-3" /> {savingId === su.id ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 items-start">
                    <textarea
                      className="flex-1 text-sm rounded-xl px-3 py-2.5 resize-y focus:outline-none font-mono leading-relaxed"
                      style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)', color: '#f0ece0', minHeight: '160px' }}
                      rows={10}
                      placeholder={`Shift report for ${name}:\n\n• Summary of activities\n• Physical & mental presentation\n• Personal care\n• Incidents or concerns\n• Nutrition & hydration\n• Medication adherence\n• Support level required\n• Risks & safety concerns\n• Family / professional contacts\n• Actions for next shift\n• Medication count`}
                      value={value}
                      onChange={e => setResidentNotes(prev => ({ ...prev, [su.id]: e.target.value }))}
                      onBlur={() => { if (value.trim()) saveResidentNote(su.id) }}
                    />
                    <SpeechInput
                      onTranscript={t => setResidentNotes(prev => ({ ...prev, [su.id]: (prev[su.id] || '') + (prev[su.id] ? ' ' : '') + t }))}
                      className="mt-1"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Digital Sign-off */}
      <SignOffSection homeId={selectedHome} shiftDate={today} shiftType={shift} />

      {/* Previous Handovers */}
      <div className="rounded-2xl border border-white/10 p-6 mt-6" style={{ background: '#111' }}>
        <h3 className="font-bold text-base text-white mb-4">Previous Handovers <span className="text-slate-500 font-normal text-sm">(last 7 days)</span></h3>
        {loadingPrev ? (
          <Spinner />
        ) : previousGroups.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No previous handovers.</p>
        ) : (
          <div className="space-y-4">
            {previousGroups.map(g => (
              <div key={g.key} className="rounded-xl p-4" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wide mb-3">
                  {format(new Date(g.date), 'd MMMM yyyy')} · {g.shiftLabel} shift {shiftHeaderTime(g.shiftType)} · {g.staffName}
                </p>
                <div className="space-y-3">
                  {g.entries.map(entry => (
                    <div key={entry.id} className="pl-3 border-l-2 border-white/10">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{entry.su_name}</p>
                      <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">{entry.notes}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Print-only version */}
      <div id="handover-print" className="hidden print:block bg-white p-8">
        <h2 className="font-bold text-2xl text-slate-900 mb-1">{homeName} Handover</h2>
        <p className="text-slate-600 mb-6">{format(new Date(), 'd MMMM yyyy')} · {SHIFT_LABELS[shift]} shift · {SHIFT_TIMES[shift]} · {user?.firstName} {user?.lastName}</p>
        {sus.map(su => {
          const name = `${su.first_name || su.firstName} ${su.last_name || su.lastName}`
          return (
            <div key={su.id} className="mb-8 border-b border-slate-200 pb-6">
              <h3 className="font-bold text-slate-900 mb-2">{name}</h3>
              <p className="text-sm text-slate-700 whitespace-pre-line">{residentNotes[su.id] || '—'}</p>
            </div>
          )
        })}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          #handover-print { display: block !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>
    </div>
  )
}
