import React, { useEffect, useRef, useState } from 'react'
import api from '../../api'
import { suApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, Button } from '../../components/ui'
import toast from 'react-hot-toast'
import { Scan, Save, Printer, Trash2, X } from 'lucide-react'
import { openLetterheadPrint, buildLetterheadPage, fmtDate, esc, type PrintSection } from '../../utils/letterheadPrint'

const WOUND_TYPES = ['Pressure ulcer', 'Surgical wound', 'Leg ulcer', 'Diabetic foot ulcer', 'Skin tear', 'Bruising', 'Rash/Dermatitis', 'Burn', 'Abrasion', 'Oedema', 'Other']
const PU_GRADES = ['Grade 1 — Non-blanching redness', 'Grade 2 — Partial thickness', 'Grade 3 — Full thickness', 'Grade 4 — Deep tissue damage']
const HEALING = ['Improving', 'Stable', 'Deteriorating', 'New wound']
const BODY_ZONES = [
  { id: 'head', label: 'Head / Scalp', x: 50, y: 8 },
  { id: 'face', label: 'Face', x: 50, y: 16 },
  { id: 'neck', label: 'Neck', x: 50, y: 22 },
  { id: 'chest', label: 'Chest', x: 50, y: 31 },
  { id: 'abdomen', label: 'Abdomen', x: 50, y: 41 },
  { id: 'groin', label: 'Groin', x: 50, y: 49 },
  { id: 'shoulder_l', label: 'Left Shoulder', x: 28, y: 28 },
  { id: 'shoulder_r', label: 'Right Shoulder', x: 72, y: 28 },
  { id: 'upper_arm_l', label: 'Left Upper Arm', x: 22, y: 35 },
  { id: 'upper_arm_r', label: 'Right Upper Arm', x: 78, y: 35 },
  { id: 'elbow_l', label: 'Left Elbow', x: 18, y: 42 },
  { id: 'elbow_r', label: 'Right Elbow', x: 82, y: 42 },
  { id: 'forearm_l', label: 'Left Forearm', x: 17, y: 48 },
  { id: 'forearm_r', label: 'Right Forearm', x: 83, y: 48 },
  { id: 'hand_l', label: 'Left Hand', x: 16, y: 55 },
  { id: 'hand_r', label: 'Right Hand', x: 84, y: 55 },
  { id: 'thigh_l', label: 'Left Thigh', x: 37, y: 58 },
  { id: 'thigh_r', label: 'Right Thigh', x: 63, y: 58 },
  { id: 'knee_l', label: 'Left Knee', x: 36, y: 67 },
  { id: 'knee_r', label: 'Right Knee', x: 64, y: 67 },
  { id: 'lower_leg_l', label: 'Left Lower Leg', x: 36, y: 76 },
  { id: 'lower_leg_r', label: 'Right Lower Leg', x: 64, y: 76 },
  { id: 'ankle_l', label: 'Left Ankle', x: 36, y: 84 },
  { id: 'ankle_r', label: 'Right Ankle', x: 64, y: 84 },
  { id: 'heel_l', label: 'Left Heel', x: 36, y: 91 },
  { id: 'heel_r', label: 'Right Heel', x: 64, y: 91 },
  // Back zones
  { id: 'upper_back', label: 'Upper Back / Shoulders', x: 150, y: 28 },
  { id: 'lower_back', label: 'Lower Back', x: 150, y: 38 },
  { id: 'sacrum', label: 'Sacrum / Coccyx', x: 150, y: 46 },
  { id: 'buttocks_l', label: 'Left Buttock', x: 137, y: 52 },
  { id: 'buttocks_r', label: 'Right Buttock', x: 163, y: 52 },
  { id: 'back_thigh_l', label: 'Left Posterior Thigh', x: 137, y: 60 },
  { id: 'back_thigh_r', label: 'Right Posterior Thigh', x: 163, y: 60 },
  { id: 'back_knee_l', label: 'Left Popliteal Fossa', x: 137, y: 67 },
  { id: 'back_knee_r', label: 'Right Popliteal Fossa', x: 163, y: 67 },
]

// Colour by wound type
const WOUND_COLORS: Record<string, string> = {
  'Pressure ulcer': '#ef4444', 'Surgical wound': '#8b5cf6', 'Leg ulcer': '#f97316',
  'Diabetic foot ulcer': '#eab308', 'Skin tear': '#ec4899', 'Bruising': '#6366f1',
  'Rash/Dermatitis': '#06b6d4', 'Burn': '#dc2626', 'Abrasion': '#84cc16',
  'Oedema': '#64748b', 'Other': '#475569',
}

interface Marker { zoneId: string; woundType: string; grade?: string; size?: string; healing: string; notes: string }

export default function BodyMap() {
  const { user } = useAuth()
  const [residents, setResidents] = useState<any[]>([])
  const [selectedSu, setSelectedSu] = useState('')
  const [markers, setMarkers] = useState<Marker[]>([])
  const [selectedZone, setSelectedZone] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<Marker>>({})
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [overallNotes, setOverallNotes] = useState('')

  useEffect(() => {
    if (!user?.homeId) return
    suApi.list(user.homeId, { status: 'live' }).then(r => setResidents(r.data.data || [])).catch(() => {})
  }, [user])

  useEffect(() => {
    if (!selectedSu) return
    setLoading(true)
    api.get(`/clinical/body-map/${selectedSu}`)
      .then(r => setHistory(r.data.data || []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [selectedSu])

  const addMarker = () => {
    if (!selectedZone || !form.woundType || !form.healing) return
    setMarkers(m => [...m.filter(x => x.zoneId !== selectedZone), { zoneId: selectedZone, ...form as any }])
    setSelectedZone(null); setForm({})
  }

  const removeMarker = (zoneId: string) => setMarkers(m => m.filter(x => x.zoneId !== zoneId))

  const save = async () => {
    if (!selectedSu || markers.length === 0) return
    setSaving(true)
    try {
      await api.post('/clinical/body-map', { suId: selectedSu, homeId: user?.homeId, wounds: markers, overallNotes, staffId: user?.id })
      toast.success('Body map saved')
      const r = await api.get(`/clinical/body-map/${selectedSu}`)
      setHistory(r.data.data || [])
      setMarkers([]); setOverallNotes('')
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to save')
    } finally { setSaving(false) }
  }

  const zoneLabel = (id: string) => BODY_ZONES.find(z => z.id === id)?.label || id

  const renderDot = (zone: typeof BODY_ZONES[0], offsetX = 0) => {
    const marker = markers.find(m => m.zoneId === zone.id)
    const color = marker ? (WOUND_COLORS[marker.woundType] || '#475569') : 'transparent'
    const isSelected = selectedZone === zone.id
    return (
      <circle key={zone.id}
        cx={(zone.x - offsetX) * 3} cy={zone.y * 3}
        r={isSelected ? 8 : (marker ? 7 : 6)}
        fill={marker ? color : 'rgba(255,255,255,0.01)'}
        stroke={isSelected ? '#1e40af' : (marker ? color : '#94a3b8')}
        strokeWidth={isSelected ? 3 : 1.5}
        style={{ cursor: 'pointer', transition: 'all .15s' }}
        onClick={() => { setSelectedZone(zone.id); setForm(markers.find(m => m.zoneId === zone.id) || {}) }}
      />
    )
  }

  const handlePrint = () => {
    const resident = residents.find(r => r.id === selectedSu)
    const residentName = resident ? `${resident.first_name} ${resident.last_name}` : 'Resident'
    const sections: PrintSection[] = []

    const markerRows = (ms: any[]) => ms.map((m: any) => `
      <tr><th>${esc(zoneLabel(m.zoneId))}</th>
      <td>${esc(m.woundType)}${m.grade ? ` — ${esc(m.grade)}` : ''}${m.size ? ` · ${esc(m.size)}` : ''} · Healing: ${esc(m.healing)}${m.notes ? `<br/><em>${esc(m.notes)}</em>` : ''}</td></tr>
    `).join('')

    if (markers.length) {
      sections.push({
        title: 'Current Marked Areas',
        inner: `<table class="fields">${markerRows(markers)}</table>${overallNotes ? `<h3 class="sub">Overall Notes</h3><p class="body-text">${esc(overallNotes)}</p>` : ''}`,
      })
    }

    if (history.length) {
      const inner = history.map((h: any) => `
        <h3 class="sub">${h.recorded_at ? fmtDate(h.recorded_at) : '—'}${h.staff_name ? ` — ${esc(h.staff_name)}` : ''}</h3>
        <table class="fields">${markerRows(h.wounds || [])}</table>
        ${h.overall_notes ? `<p class="body-text">${esc(h.overall_notes)}</p>` : ''}
      `).join('')
      sections.push({ title: 'Previous Body Maps', inner })
    }

    if (!sections.length) sections.push({ title: 'Skin Integrity Body Map', inner: `<p class="body-text muted">No wound/skin integrity markers recorded yet for this resident.</p>` })

    const body = buildLetterheadPage({
      docTitle: 'Skin Integrity Body Map', docSubtitle: 'Wound and pressure area tracking',
      docRefPrefix: 'BM', docRefId: selectedSu || '—', residentName, sections,
    })
    openLetterheadPrint(`${residentName} — Body Map`, body)
  }

  const frontZones = BODY_ZONES.filter(z => !z.id.startsWith('back_') && z.id !== 'upper_back' && z.id !== 'lower_back' && z.id !== 'sacrum' && z.id !== 'buttocks_l' && z.id !== 'buttocks_r')
  const backZones = BODY_ZONES.filter(z => z.id.startsWith('back_') || z.id === 'upper_back' || z.id === 'lower_back' || z.id === 'sacrum' || z.id === 'buttocks_l' || z.id === 'buttocks_r')

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Scan className="w-6 h-6 text-teal-600" />
            Skin Integrity Body Map
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Digital body map — mark and track wounds, pressure areas, and skin conditions</p>
        </div>
        <button onClick={handlePrint} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-2 bg-white">
          <Printer className="w-4 h-4" /> Print
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5">
        <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">Service User</label>
        <select className="input w-full max-w-xs" value={selectedSu} onChange={e => setSelectedSu(e.target.value)}>
          <option value="">— Select resident —</option>
          {residents.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
        </select>
      </div>

      {selectedSu && (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-5">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Body Map — click a dot to mark a wound area</h2>
              <p className="text-xs text-slate-400 mt-0.5">Front view (left) · Back view (right). Coloured dots = active wounds.</p>
            </div>
            <div className="flex flex-col lg:flex-row gap-4 p-5">
              {/* SVG Body Map */}
              <div className="flex-1">
                <svg viewBox="0 0 450 285" className="w-full max-w-lg mx-auto" style={{ height: 320 }}>
                  {/* Front silhouette */}
                  <text x="75" y="10" textAnchor="middle" fontSize="9" fill="#94a3b8">FRONT</text>
                  <ellipse cx="150" cy="30" rx="18" ry="22" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1"/>
                  <rect x="130" y="50" width="40" height="80" rx="8" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1"/>
                  <rect x="90" y="55" width="25" height="65" rx="6" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1"/>
                  <rect x="235" y="55" width="25" height="65" rx="6" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1"/>
                  <rect x="120" y="128" width="23" height="80" rx="6" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1"/>
                  <rect x="157" y="128" width="23" height="80" rx="6" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1"/>
                  {frontZones.map(z => renderDot(z))}

                  {/* Back silhouette */}
                  <text x="300" y="10" textAnchor="middle" fontSize="9" fill="#94a3b8">BACK</text>
                  <ellipse cx="300" cy="30" rx="18" ry="22" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1"/>
                  <rect x="280" y="50" width="40" height="80" rx="8" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1"/>
                  <rect x="240" y="55" width="25" height="65" rx="6" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1"/>
                  <rect x="385" y="55" width="25" height="65" rx="6" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1"/>
                  <rect x="270" y="128" width="23" height="80" rx="6" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1"/>
                  <rect x="307" y="128" width="23" height="80" rx="6" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1"/>
                  {backZones.map(z => renderDot(z, 100))}
                </svg>
              </div>

              {/* Side panel */}
              <div className="w-full lg:w-80 space-y-3">
                {/* Legend */}
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Colour Legend</p>
                  <div className="grid grid-cols-2 gap-1">
                    {Object.entries(WOUND_COLORS).map(([type, color]) => (
                      <div key={type} className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
                        <span className="text-[10px] text-slate-600 truncate">{type}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Zone form */}
                {selectedZone ? (
                  <div className="bg-teal-50 rounded-xl p-3 border border-teal-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-teal-700">{zoneLabel(selectedZone)}</p>
                      <button onClick={() => { setSelectedZone(null); setForm({}) }}><X className="w-3.5 h-3.5 text-teal-500" /></button>
                    </div>
                    <div className="space-y-2">
                      <select className="input w-full text-xs py-1.5" value={form.woundType || ''} onChange={e => setForm(f => ({ ...f, woundType: e.target.value }))}>
                        <option value="">Wound type...</option>
                        {WOUND_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      {form.woundType === 'Pressure ulcer' && (
                        <select className="input w-full text-xs py-1.5" value={form.grade || ''} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}>
                          <option value="">Grade...</option>
                          {PU_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      )}
                      <input type="text" className="input w-full text-xs py-1.5" placeholder="Size (e.g. 3×2cm)" value={form.size || ''} onChange={e => setForm(f => ({ ...f, size: e.target.value }))} />
                      <select className="input w-full text-xs py-1.5" value={form.healing || ''} onChange={e => setForm(f => ({ ...f, healing: e.target.value }))}>
                        <option value="">Healing status...</option>
                        {HEALING.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <textarea className="input w-full text-xs py-1.5" rows={2} placeholder="Description..." value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                      <div className="flex gap-2">
                        <button onClick={addMarker} disabled={!form.woundType || !form.healing}
                          className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-teal-600 text-white disabled:opacity-40">
                          Mark area
                        </button>
                        {markers.find(m => m.zoneId === selectedZone) && (
                          <button onClick={() => { removeMarker(selectedZone); setSelectedZone(null); setForm({}) }}
                            className="px-2 py-1.5 text-xs font-bold rounded-lg bg-red-100 text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-400">Click a dot on the body map to mark a wound area</p>
                  </div>
                )}

                {/* Marked areas summary */}
                {markers.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400 px-3 py-2 bg-slate-50">Marked Areas ({markers.length})</p>
                    {markers.map(m => (
                      <div key={m.zoneId} className="px-3 py-2 border-t border-slate-50 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: WOUND_COLORS[m.woundType] || '#475569' }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700 truncate">{zoneLabel(m.zoneId)}</p>
                          <p className="text-[10px] text-slate-400 truncate">{m.woundType}{m.size ? ` · ${m.size}` : ''} · {m.healing}</p>
                        </div>
                        <button onClick={() => removeMarker(m.zoneId)}><X className="w-3 h-3 text-slate-300 hover:text-red-400" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 pb-5 space-y-3">
              <textarea className="input w-full" rows={2} placeholder="Overall skin integrity notes, dressing changes, referrals made..." value={overallNotes} onChange={e => setOverallNotes(e.target.value)} />
              <div className="flex justify-end">
                <Button icon={<Save className="w-4 h-4" />} onClick={save} loading={saving} disabled={markers.length === 0}>Save Body Map</Button>
              </div>
            </div>
          </div>

          {/* History */}
          {loading ? <div className="flex justify-center py-8"><Spinner /></div>
            : history.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100"><h2 className="font-semibold text-slate-800">Previous Maps</h2></div>
                <div className="divide-y divide-slate-50">
                  {history.map((h: any) => (
                    <div key={h.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{h.recorded_at ? format(new Date(h.recorded_at), 'd MMM yyyy, HH:mm') : ''}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{h.staff_name || ''}</p>
                        </div>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {(h.wounds || []).map((w: any, i: number) => (
                            <span key={i} className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: WOUND_COLORS[w.woundType] || '#475569' }}>
                              {w.woundType}
                            </span>
                          ))}
                        </div>
                      </div>
                      {h.overall_notes && <p className="text-xs text-slate-500 mt-2 italic">{h.overall_notes}</p>}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(h.wounds || []).map((w: any, i: number) => (
                          <div key={i} className="text-[10px] text-slate-600 bg-slate-50 rounded-lg px-2 py-1">
                            <span className="font-semibold">{zoneLabel(w.zoneId)}</span>: {w.woundType}{w.size ? ` ${w.size}` : ''} · {w.healing}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </>
      )}
    </div>
  )
}
