import React, { useEffect, useState, useMemo } from 'react'
import api from '../../api'
import { homesApi, suApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { Spinner, EmptyState, Button, PrintButton, Modal, SpeechTextarea } from '../../components/ui'
import { AlertTriangle, ChevronDown, ChevronUp, Search, Filter, Trash2, Sparkles, X, Plus, Pencil, CheckCircle, MessageSquarePlus } from 'lucide-react'
import toast from 'react-hot-toast'

// ── Emotion picker ─────────────────────────────────────────────────

const EMOTIONS = [
  { value: 'distressed', emoji: '😢', label: 'Distressed', color: 'bg-red-500' },
  { value: 'neutral',    emoji: '😐', label: 'Neutral',    color: 'bg-yellow-400' },
  { value: 'settled',    emoji: '😊', label: 'Settled',    color: 'bg-emerald-500' },
] as const

function EmotionPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Emotion / Mood</p>
      <div className="flex gap-6">
        {EMOTIONS.map(e => (
          <button key={e.value} type="button" onClick={() => onChange(e.value)}
            className="flex flex-col items-center gap-1 group">
            <span className={`text-3xl transition-transform ${value === e.value ? 'scale-125' : 'opacity-50 group-hover:opacity-80'}`}>
              {e.emoji}
            </span>
            <div className={`w-10 h-1 rounded-full transition-colors ${value === e.value ? e.color : 'bg-slate-200'}`} />
            <span className={`text-xs font-medium ${value === e.value ? 'text-slate-800' : 'text-slate-400'}`}>{e.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function EmotionDisplay({ value }: { value?: string }) {
  if (!value) return null
  const e = EMOTIONS.find(x => x.value === value)
  if (!e) return null
  return (
    <div className="flex items-center gap-2">
      <span className="text-xl">{e.emoji}</span>
      <span className="text-sm font-medium text-slate-700">{e.label}</span>
    </div>
  )
}

// ── Incident Analysis Card ────────────────────────────────────────

interface AnalysisData {
  riskRating?: string
  summary?: string
  rootCause?: string
  contributingFactors?: string[]
  immediateActionsReview?: string
  followUpActions?: string[]
  preventionStrategies?: string[]
  systemicRisk?: string
}

function IncidentAnalysisCard({ raw, onDismiss }: { raw: string; onDismiss: () => void }) {
  let data: AnalysisData | null = null
  try { data = JSON.parse(raw) } catch {
    try {
      const cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim()
      const m = cleaned.match(/\{[\s\S]*\}/)
      if (m) data = JSON.parse(m[0])
    } catch { /* plain text fallback */ }
  }

  const riskLevel = data?.riskRating?.toLowerCase()
  const riskBg = riskLevel === 'high' || riskLevel === 'critical'
    ? 'bg-red-50 border-red-200 text-red-700'
    : riskLevel === 'medium'
    ? 'bg-amber-50 border-amber-200 text-amber-700'
    : 'bg-emerald-50 border-emerald-200 text-emerald-700'

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">Incident Review — AI Assisted</span>
          {data?.riskRating && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${riskBg}`}>
              {data.riskRating} Risk
            </span>
          )}
        </div>
        <button onClick={onDismiss} className="text-slate-400 hover:text-slate-600 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {data ? (
        <div className="px-4 py-3 space-y-3 text-sm text-slate-700">
          {data.summary && (
            <p className="leading-relaxed text-slate-800">{data.summary}</p>
          )}

          {(data.rootCause || (data.contributingFactors?.length)) && (
            <div className="pt-2 border-t border-slate-200">
              {data.rootCause && (
                <p className="leading-relaxed mb-1">
                  <span className="font-semibold text-slate-600">Root cause: </span>{data.rootCause}
                </p>
              )}
              {data.contributingFactors?.length ? (
                <p className="leading-relaxed text-slate-600">
                  <span className="font-semibold text-slate-600">Contributing factors: </span>
                  {data.contributingFactors.join('; ')}.
                </p>
              ) : null}
            </div>
          )}

          {data.immediateActionsReview && (
            <div className="pt-2 border-t border-slate-200">
              <p className="leading-relaxed">
                <span className="font-semibold text-slate-600">Actions review: </span>{data.immediateActionsReview}
              </p>
            </div>
          )}

          {(data.followUpActions?.length || data.preventionStrategies?.length) && (
            <div className="pt-2 border-t border-slate-200 space-y-1.5">
              {data.followUpActions?.length ? (
                <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-100">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Recommended follow-up</p>
                  <p className="text-xs text-blue-800 leading-relaxed">{data.followUpActions.join('. ')}.</p>
                </div>
              ) : null}
              {data.preventionStrategies?.length ? (
                <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-600 mb-1">Prevention measures</p>
                  <p className="text-xs text-slate-700 leading-relaxed">{data.preventionStrategies.join('. ')}.</p>
                </div>
              ) : null}
            </div>
          )}

          {data.systemicRisk && (
            <p className="text-xs text-slate-500 italic pt-1 border-t border-slate-200 leading-relaxed">
              Systemic note: {data.systemicRisk}
            </p>
          )}
        </div>
      ) : (
        <div className="px-4 py-3 text-sm text-slate-700 whitespace-pre-line leading-relaxed">{raw}</div>
      )}
    </div>
  )
}

// ── Severity helpers ──────────────────────────────────────────────

type Severity = 'critical' | 'high' | 'medium' | 'low'

function getSeverity(incidentType: string): Severity {
  if (incidentType === 'medication_error') return 'critical'
  if (incidentType === 'fall' || incidentType === 'missing_person') return 'high'
  if (incidentType === 'aggression' || incidentType === 'self_harm') return 'high'
  return 'medium'
}

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high:     'bg-orange-100 text-orange-800 border-orange-200',
  medium:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  low:      'bg-green-100 text-green-800 border-green-200',
}

const TYPE_STYLES: Record<string, string> = {
  fall:              'bg-orange-100 text-orange-700',
  medication_error:  'bg-red-100 text-red-700',
  missing_person:    'bg-red-100 text-red-700',
  aggression:        'bg-purple-100 text-purple-700',
  self_harm:         'bg-rose-100 text-rose-700',
  accident:          'bg-yellow-100 text-yellow-700',
  near_miss:         'bg-blue-100 text-blue-700',
  other:             'bg-slate-100 text-slate-700',
}

const TYPE_LABELS: Record<string, string> = {
  fall:             'Fall',
  medication_error: 'Medication Error',
  missing_person:   'Missing Person',
  aggression:       'Aggression',
  self_harm:        'Self Harm',
  accident:         'Accident',
  near_miss:        'Near Miss',
  other:            'Other',
}

const INCIDENT_TYPES = Object.keys(TYPE_LABELS)

// incidents come back as flat columns from records_incidents

// ── Stat card ─────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`bg-white rounded-xl border shadow-sm p-4 flex flex-col gap-1 border-l-4 ${color}`}>
      <span className="text-2xl font-bold text-slate-900">{value}</span>
      <span className="text-xs text-slate-500 font-medium">{label}</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────

const BODY_PARTS_FRONT = [
  ['Head', 'Face', 'Neck'],
  ['L. Shoulder', 'Chest', 'R. Shoulder'],
  ['L. Upper Arm', 'Upper Abdomen', 'R. Upper Arm'],
  ['L. Forearm', 'Lower Abdomen', 'R. Forearm'],
  ['L. Hand', 'Pelvis / Groin', 'R. Hand'],
  ['L. Thigh', 'R. Thigh'],
  ['L. Knee', 'R. Knee'],
  ['L. Shin', 'R. Shin'],
  ['L. Foot', 'R. Foot'],
]
const BODY_PARTS_BACK = [
  ['Back of Head', 'Back of Neck'],
  ['L. Shoulder', 'Upper Back', 'R. Shoulder'],
  ['L. Upper Arm', 'Mid Back', 'R. Upper Arm'],
  ['L. Forearm', 'Lower Back', 'R. Forearm'],
  ['L. Hand', 'Buttocks', 'R. Hand'],
  ['L. Thigh', 'R. Thigh'],
  ['Back of L. Knee', 'Back of R. Knee'],
  ['L. Calf', 'R. Calf'],
  ['L. Heel', 'R. Heel'],
]

function BodyMap({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const selected = value ? value.split(',').map(s => s.trim()).filter(Boolean) : []
  const toggle = (part: string) => {
    const next = selected.includes(part) ? selected.filter(p => p !== part) : [...selected, part]
    onChange(next.join(', '))
  }
  const isSel = (p: string) => selected.includes(p)
  const Part = ({ p }: { p: string }) => (
    <button type="button" onClick={() => toggle(p)}
      className={`px-2 py-1 rounded-lg border text-xs font-medium transition-all ${isSel(p) ? 'bg-red-500 text-white border-red-500' : 'bg-white/5 border-white/10 text-slate-400 hover:border-red-400/50 hover:text-red-400'}`}>
      {p}
    </button>
  )
  return (
    <div className="rounded-xl border border-red-100 bg-red-50 p-4">
      <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-3">Body Map — click to mark injury location(s)</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-400 text-center font-semibold mb-2">FRONT</p>
          <div className="space-y-1.5">
            {BODY_PARTS_FRONT.map((row, i) => (
              <div key={i} className="flex gap-1.5 flex-wrap justify-center">
                {row.map(p => <Part key={p} p={p} />)}
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-400 text-center font-semibold mb-2">BACK</p>
          <div className="space-y-1.5">
            {BODY_PARTS_BACK.map((row, i) => (
              <div key={i} className="flex gap-1.5 flex-wrap justify-center">
                {row.map(p => <Part key={p} p={p} />)}
              </div>
            ))}
          </div>
        </div>
      </div>
      {selected.length > 0 && (
        <div className="mt-3 pt-3 border-t border-red-200">
          <p className="text-xs text-red-700 font-semibold">Marked: {selected.join(', ')}</p>
        </div>
      )}
    </div>
  )
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

function nowHour() { return String(new Date().getHours()).padStart(2, '0') }
function nowMinute() { return String(Math.floor(new Date().getMinutes() / 5) * 5).padStart(2, '0') }

const BLANK_INC = {
  suId: '',
  incidentDate: new Date().toISOString().split('T')[0],
  incidentHour: nowHour(),
  incidentMinute: nowMinute(),
  incidentType: '',
  incidentDuration: '',
  incidentDurationUnknown: false,
  location: '',
  locationDetails: '',
  staffInvolved: 'No',
  staffInvolvedList: '',
  injuryLocations: '',
  serviceUserInjured: 'No',
  staffInjured: 'No',
  witnessedBy: 'Nobody',
  residentProvideInfo: 'Yes',
  residentActivity: '',
  description: '',
  reportedToSeniorDate: new Date().toISOString().split('T')[0],
  reportedToSeniorHour: nowHour(),
  reportedToSeniorMinute: nowMinute(),
  equipmentInvolved: 'No',
  nokInformed: 'No',
  gpAmbulanceCalled: '',
  notes: '',
  emotion: '',
  // kept for API compat
  incidentTime: '', immediateAction: '', injuries: false, injuryDetails: '',
  medicalNeeded: false, medicalDetails: '', familyNotified: false,
  contributingFactors: '', preventionActions: '', witnesses: '',
}

// ── Visual Body Map ────────────────────────────────────────────────
const FRONT_ZONES = [
  { part: 'Head',         x: '30%', y: '0%',   w: '40%', h: '12%' },
  { part: 'Face',         x: '32%', y: '5%',   w: '36%', h: '9%'  },
  { part: 'Neck',         x: '38%', y: '14%',  w: '24%', h: '5%'  },
  { part: 'L. Shoulder',  x: '8%',  y: '18%',  w: '22%', h: '10%' },
  { part: 'Chest',        x: '30%', y: '18%',  w: '40%', h: '12%' },
  { part: 'R. Shoulder',  x: '70%', y: '18%',  w: '22%', h: '10%' },
  { part: 'L. Upper Arm', x: '5%',  y: '28%',  w: '18%', h: '14%' },
  { part: 'Upper Abdomen',x: '30%', y: '29%',  w: '40%', h: '10%' },
  { part: 'R. Upper Arm', x: '77%', y: '28%',  w: '18%', h: '14%' },
  { part: 'L. Forearm',   x: '3%',  y: '42%',  w: '18%', h: '13%' },
  { part: 'Lower Abdomen',x: '30%', y: '39%',  w: '40%', h: '10%' },
  { part: 'R. Forearm',   x: '79%', y: '42%',  w: '18%', h: '13%' },
  { part: 'L. Hand',      x: '1%',  y: '55%',  w: '18%', h: '8%'  },
  { part: 'Pelvis / Groin',x:'30%', y: '49%',  w: '40%', h: '9%'  },
  { part: 'R. Hand',      x: '81%', y: '55%',  w: '18%', h: '8%'  },
  { part: 'L. Thigh',     x: '28%', y: '58%',  w: '20%', h: '15%' },
  { part: 'R. Thigh',     x: '52%', y: '58%',  w: '20%', h: '15%' },
  { part: 'L. Knee',      x: '28%', y: '73%',  w: '20%', h: '7%'  },
  { part: 'R. Knee',      x: '52%', y: '73%',  w: '20%', h: '7%'  },
  { part: 'L. Shin',      x: '28%', y: '80%',  w: '20%', h: '13%' },
  { part: 'R. Shin',      x: '52%', y: '80%',  w: '20%', h: '13%' },
  { part: 'L. Foot',      x: '26%', y: '93%',  w: '22%', h: '7%'  },
  { part: 'R. Foot',      x: '52%', y: '93%',  w: '22%', h: '7%'  },
]
const BACK_ZONES = [
  { part: 'Back of Head',   x: '30%', y: '0%',   w: '40%', h: '12%' },
  { part: 'Back of Neck',   x: '38%', y: '14%',  w: '24%', h: '5%'  },
  { part: 'L. Shoulder',    x: '8%',  y: '18%',  w: '22%', h: '10%' },
  { part: 'Upper Back',     x: '30%', y: '18%',  w: '40%', h: '12%' },
  { part: 'R. Shoulder',    x: '70%', y: '18%',  w: '22%', h: '10%' },
  { part: 'L. Upper Arm',   x: '5%',  y: '28%',  w: '18%', h: '14%' },
  { part: 'Mid Back',       x: '30%', y: '29%',  w: '40%', h: '10%' },
  { part: 'R. Upper Arm',   x: '77%', y: '28%',  w: '18%', h: '14%' },
  { part: 'L. Forearm',     x: '3%',  y: '42%',  w: '18%', h: '13%' },
  { part: 'Lower Back',     x: '30%', y: '39%',  w: '40%', h: '10%' },
  { part: 'R. Forearm',     x: '79%', y: '42%',  w: '18%', h: '13%' },
  { part: 'L. Hand',        x: '1%',  y: '55%',  w: '18%', h: '8%'  },
  { part: 'Buttocks',       x: '30%', y: '49%',  w: '40%', h: '9%'  },
  { part: 'R. Hand',        x: '81%', y: '55%',  w: '18%', h: '8%'  },
  { part: 'L. Thigh',       x: '28%', y: '58%',  w: '20%', h: '15%' },
  { part: 'R. Thigh',       x: '52%', y: '58%',  w: '20%', h: '15%' },
  { part: 'Back of L. Knee',x: '28%', y: '73%',  w: '20%', h: '7%'  },
  { part: 'Back of R. Knee',x: '52%', y: '73%',  w: '20%', h: '7%'  },
  { part: 'L. Calf',        x: '28%', y: '80%',  w: '20%', h: '13%' },
  { part: 'R. Calf',        x: '52%', y: '80%',  w: '20%', h: '13%' },
  { part: 'L. Heel',        x: '26%', y: '93%',  w: '22%', h: '7%'  },
  { part: 'R. Heel',        x: '52%', y: '93%',  w: '22%', h: '7%'  },
]

function BodySilhouette({ side }: { side: 'front' | 'back' }) {
  return (
    <svg viewBox="0 0 100 260" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="22" rx="18" ry="20" fill="#2dd4bf" opacity="0.85" stroke="#5eead4" strokeWidth="1.5"/>
      <rect x="43" y="40" width="14" height="10" rx="3" fill="#2dd4bf" opacity="0.85" stroke="#5eead4" strokeWidth="1.2"/>
      <path d="M32 52 Q20 55 16 90 L18 90 Q24 68 34 65 L34 118 Q34 122 50 122 Q66 122 66 118 L66 65 Q76 68 82 90 L84 90 Q80 55 68 52 Z" fill="#2dd4bf" opacity="0.85" stroke="#5eead4" strokeWidth="1.5"/>
      <path d="M16 90 L14 128 L22 132 L24 100 Z" fill="#2dd4bf" opacity="0.8" stroke="#5eead4" strokeWidth="1.2"/>
      <path d="M84 90 L86 128 L78 132 L76 100 Z" fill="#2dd4bf" opacity="0.8" stroke="#5eead4" strokeWidth="1.2"/>
      <ellipse cx="18" cy="135" rx="7" ry="5" fill="#2dd4bf" opacity="0.8" stroke="#5eead4" strokeWidth="1.2"/>
      <ellipse cx="82" cy="135" rx="7" ry="5" fill="#2dd4bf" opacity="0.8" stroke="#5eead4" strokeWidth="1.2"/>
      <path d="M34 120 Q30 125 30 140 L30 185 Q30 190 40 190 L42 190 L42 120 Z" fill="#2dd4bf" opacity="0.85" stroke="#5eead4" strokeWidth="1.3"/>
      <path d="M66 120 Q70 125 70 140 L70 185 Q70 190 60 190 L58 190 L58 120 Z" fill="#2dd4bf" opacity="0.85" stroke="#5eead4" strokeWidth="1.3"/>
      <path d="M30 185 L28 230 Q28 236 38 236 L44 236 L44 185 Z" fill="#2dd4bf" opacity="0.8" stroke="#5eead4" strokeWidth="1.2"/>
      <path d="M70 185 L72 230 Q72 236 62 236 L56 236 L56 185 Z" fill="#2dd4bf" opacity="0.8" stroke="#5eead4" strokeWidth="1.2"/>
      {side === 'front' ? (
        <>
          <ellipse cx="36" cy="238" rx="12" ry="5" fill="#2dd4bf" opacity="0.8" stroke="#5eead4" strokeWidth="1.2"/>
          <ellipse cx="64" cy="238" rx="12" ry="5" fill="#2dd4bf" opacity="0.8" stroke="#5eead4" strokeWidth="1.2"/>
        </>
      ) : (
        <>
          <ellipse cx="36" cy="238" rx="10" ry="5" fill="#2dd4bf" opacity="0.8" stroke="#5eead4" strokeWidth="1.2"/>
          <ellipse cx="64" cy="238" rx="10" ry="5" fill="#2dd4bf" opacity="0.8" stroke="#5eead4" strokeWidth="1.2"/>
        </>
      )}
    </svg>
  )
}

function VisualBodyMap({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const selected = value ? value.split(',').map(s => s.trim()).filter(Boolean) : []
  const toggle = (part: string) => {
    const next = selected.includes(part) ? selected.filter(p => p !== part) : [...selected, part]
    onChange(next.join(', '))
  }
  const isSel = (p: string) => selected.includes(p)

  return (
    <div className="rounded-xl border border-teal-500/30 p-4" style={{ background: 'rgba(13,20,30,0.8)' }}>
      <p className="text-xs font-semibold text-teal-400 uppercase tracking-wide mb-3 text-center">
        Click body to mark injury location(s)
      </p>
      <div className="grid grid-cols-2 gap-4">
        {([['Front', FRONT_ZONES], ['Back', BACK_ZONES]] as const).map(([label, zones]) => (
          <div key={label}>
            <p className="text-xs font-semibold text-teal-300 text-center mb-2">{label}</p>
            <div className="relative mx-auto rounded-lg overflow-hidden" style={{ width: 110, height: 260, background: 'rgba(0,0,0,0.3)' }}>
              <div className="absolute inset-0"><BodySilhouette side={label === 'Front' ? 'front' : 'back'} /></div>
              {zones.map(z => (
                <button key={z.part} type="button" onClick={() => toggle(z.part)} title={z.part}
                  className="absolute rounded transition-all hover:bg-red-400/40"
                  style={{
                    left: z.x, top: z.y, width: z.w, height: z.h,
                    background: isSel(z.part) ? 'rgba(239,68,68,0.55)' : 'transparent',
                    border: isSel(z.part) ? '1.5px solid #ef4444' : '1px solid rgba(255,255,255,0.05)',
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      {selected.length > 0 && (
        <div className="mt-3 pt-3 border-t border-teal-500/20 flex flex-wrap gap-1.5">
          {selected.map(part => (
            <button key={part} type="button" onClick={() => toggle(part)}
              className="bg-red-500/20 text-red-400 text-xs px-2.5 py-1 rounded-full hover:bg-red-500/30 border border-red-500/30 font-medium">
              {part} ×
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Inline SVG bar chart ─────────────────────────────────────────
function BarChart({ data, colorClass = 'fill-orange-500', height = 80 }: {
  data: { label: string; value: number }[]
  colorClass?: string
  height?: number
}) {
  const max = Math.max(...data.map(d => d.value), 1)
  const w = 100 / data.length
  return (
    <svg viewBox={`0 0 ${data.length * 40} ${height + 24}`} className="w-full">
      {data.map((d, i) => {
        const barH = Math.round((d.value / max) * height)
        const x = i * 40 + 4
        return (
          <g key={i}>
            <rect x={x} y={height - barH} width={32} height={barH} className={colorClass} rx="3" />
            <text x={x + 16} y={height + 14} textAnchor="middle" fontSize="9" fill="#94a3b8">{d.label}</text>
            {d.value > 0 && (
              <text x={x + 16} y={height - barH - 3} textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="600">{d.value}</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

function HorizontalBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-600 w-32 flex-shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-3">
        <div className="h-3 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold text-slate-700 w-6 text-right">{value}</span>
    </div>
  )
}

function IncidentAnalyticsPanel({ incidents, analytics, startDate, endDate }: {
  incidents: any[]
  analytics: any
  startDate: string
  endDate: string
}) {
  if (incidents.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400">
        <p className="text-lg font-semibold mb-1">No data for this period</p>
        <p className="text-sm">Adjust the date range to see analytics.</p>
      </div>
    )
  }

  const sortedMonths = Object.keys(analytics.byMonth).sort()
  const monthData = sortedMonths.map(m => ({
    label: m.slice(5) + '/' + m.slice(2, 4), // MM/YY
    value: analytics.byMonth[m]
  }))

  const typeEntries = Object.entries(analytics.byType as Record<string, number>)
    .sort((a, b) => b[1] - a[1])
  const maxType = Math.max(...typeEntries.map(e => e[1]), 1)

  const residentEntries = Object.entries(analytics.byResident as Record<string, number>)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
  const maxRes = Math.max(...residentEntries.map(e => e[1]), 1)

  const dowData = analytics.byDow.map((v: number, i: number) => ({ label: analytics.DOW[i], value: v }))

  const sevColors: Record<string, string> = {
    Critical: '#b91c1c', High: '#ea580c', Medium: '#d97706', Low: '#16a34a'
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(analytics.bySev).map(([label, value]) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-black" style={{ color: sevColors[label] || '#64748b' }}>{value as number}</p>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Incidents by month */}
        {monthData.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Incidents by Month</h3>
            <BarChart data={monthData} colorClass="fill-orange-400" />
          </div>
        )}

        {/* Day of week */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Incidents by Day of Week</h3>
          <BarChart data={dowData} colorClass="fill-blue-400" />
        </div>
      </div>

      {/* By type */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <h3 className="text-sm font-bold text-slate-700 mb-3">Incident Types</h3>
        <div className="space-y-2">
          {typeEntries.map(([label, value]) => (
            <HorizontalBar key={label} label={label} value={value} max={maxType} color="#f97316" />
          ))}
        </div>
      </div>

      {/* By resident */}
      {residentEntries.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Residents with Most Incidents</h3>
          <div className="space-y-2">
            {residentEntries.map(([label, value]) => (
              <HorizontalBar key={label} label={label} value={value} max={maxRes} color="#8b5cf6" />
            ))}
          </div>
          {residentEntries.some(([, v]) => v >= 3) && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs font-semibold text-amber-800">
                ⚠ One or more residents have 3+ incidents — consider a care plan or risk assessment review.
              </p>
            </div>
          )}
        </div>
      )}

      {/* CQC summary box */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
        <h3 className="text-sm font-bold text-slate-700 mb-2">CQC Evidence Summary</h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Period: <strong>{startDate}</strong> to <strong>{endDate}</strong> &nbsp;·&nbsp;
          Total incidents: <strong>{incidents.length}</strong> &nbsp;·&nbsp;
          Critical/High: <strong>{(analytics.bySev.Critical || 0) + (analytics.bySev.High || 0)}</strong> &nbsp;·&nbsp;
          Most common type: <strong>{typeEntries[0]?.[0] || 'N/A'}</strong>
        </p>
        <p className="text-xs text-slate-500 mt-1.5">
          Use this data when preparing for CQC inspections under the Safe and Well-Led key questions.
          Print this page or export for inclusion in your quality assurance file.
        </p>
      </div>
    </div>
  )
}

export default function Incidents() {
  const { user, isRole } = useAuth()
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [incidents, setIncidents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, string>>({})
  const [aiLoading, setAiLoading] = useState<string | null>(null)
  const [sus, setSus] = useState<any[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ ...BLANK_INC })
  const [creating, setCreating] = useState(false)

  // Edit incident state
  const [editOpen, setEditOpen] = useState(false)
  const [editInc, setEditInc] = useState<any>(null)
  const [editForm, setEditForm] = useState({ description: '', immediateAction: '', emotion: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [reviewNote, setReviewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [signing, setSigning] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))

  // Load homes
  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
    }).catch(console.error)
  }, [user])

  useEffect(() => {
    if (!selectedHome) return
    suApi.list(selectedHome, { status: 'live' }).then(res => setSus(res.data.data || [])).catch(() => {})
  }, [selectedHome])

  const loadIncidents = (homeId: string) => {
    setLoading(true)
    const params: Record<string, string> = { homeId }
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate
    if (filterType) params.incident_type = filterType
    if (search) params.search = search
    api.get('/incidents', { params })
      .then(res => setIncidents(res.data.data || []))
      .catch(() => toast.error('Failed to load incidents'))
      .finally(() => setLoading(false))
  }

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.suId) { toast.error('Select a service user'); return }
    if (!createForm.description.trim()) { toast.error('Please describe how the incident happened'); return }
    setCreating(true)
    try {
      const payload = {
        ...createForm,
        homeId: selectedHome,
        incidentTime: `${createForm.incidentHour}:${createForm.incidentMinute}`,
        witnesses: [createForm.witnessedBy, createForm.staffInvolved === 'Yes' ? createForm.staffInvolvedList : ''].filter(Boolean).join('; '),
        injuries: createForm.serviceUserInjured === 'Yes',
        injuryDetails: createForm.injuryLocations
          ? `Locations: ${createForm.injuryLocations}`
          : '',
        medicalNeeded: createForm.gpAmbulanceCalled !== '' && createForm.gpAmbulanceCalled !== 'No',
        medicalDetails: createForm.gpAmbulanceCalled,
        familyNotified: createForm.nokInformed === 'Yes',
        immediateAction: [
          createForm.residentActivity ? `Resident was: ${createForm.residentActivity}` : '',
          createForm.notes || '',
        ].filter(Boolean).join('\n'),
        contributingFactors: createForm.equipmentInvolved === 'Yes' ? 'Equipment/machinery involved' : '',
      }
      await api.post('/incidents', payload)
      setCreateOpen(false)
      setCreateForm({ ...BLANK_INC })
      toast.success('Incident logged')
      loadIncidents(selectedHome)
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to log incident') }
    finally { setCreating(false) }
  }

  // Load incidents
  useEffect(() => {
    if (!selectedHome) return
    loadIncidents(selectedHome)
  }, [selectedHome, startDate, endDate, filterType, search])

  const [activeTab, setActiveTab] = useState<'list' | 'analytics'>('list')

  const stats = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 }
    incidents.forEach(inc => {
      const sev = getSeverity(inc.incident_type || '')
      counts[sev]++
    })
    return counts
  }, [incidents])

  // Analytics derived data
  const analytics = useMemo(() => {
    // By type
    const byType: Record<string, number> = {}
    incidents.forEach(inc => {
      const t = TYPE_LABELS[inc.incident_type] || inc.incident_type || 'Unknown'
      byType[t] = (byType[t] || 0) + 1
    })

    // By month (last 6 months from current filter range)
    const byMonth: Record<string, number> = {}
    incidents.forEach(inc => {
      if (!inc.incident_date) return
      const m = inc.incident_date.toString().slice(0, 7) // YYYY-MM
      byMonth[m] = (byMonth[m] || 0) + 1
    })

    // By day of week
    const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const byDow: number[] = [0, 0, 0, 0, 0, 0, 0]
    incidents.forEach(inc => {
      if (!inc.incident_date) return
      const d = new Date(inc.incident_date).getDay()
      byDow[d]++
    })

    // By severity
    const bySev = { Critical: stats.critical, High: stats.high, Medium: stats.medium, Low: stats.low }

    // Top resident
    const byResident: Record<string, number> = {}
    incidents.forEach(inc => {
      const n = inc.resident_name || 'Unknown'
      byResident[n] = (byResident[n] || 0) + 1
    })

    return { byType, byMonth, byDow, DOW, bySev, byResident }
  }, [incidents, stats])

  const toggleExpand = (id: string) => setExpandedId(prev => prev === id ? null : id)

  const requestAiAnalysis = async (inc: any) => {
    setAiLoading(inc.id)
    try {
      const res = await api.post(`/incidents/${inc.id}/ai-analysis`)
      setAiAnalysis(prev => ({ ...prev, [inc.id]: res.data.data.analysis }))
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Analysis failed'
      if (msg.includes('API key') || msg.includes('ANTHROPIC') || msg.includes('GROQ') || msg.includes('401') || msg.includes('not configured')) {
        toast.error('Incident analysis requires the AI service to be configured. Contact your administrator.')
      } else {
        toast.error('Incident analysis failed — please try again.')
      }
    }
    finally { setAiLoading(null) }
  }

  const openEdit = (inc: any) => {
    setEditInc(inc)
    setEditForm({ description: inc.description || '', immediateAction: inc.immediate_action || '', emotion: inc.emotion || '' })
    setReviewNote('')
    setEditOpen(true)
  }

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editInc) return
    setEditSaving(true)
    try {
      await api.put(`/incidents/${editInc.id}`, editForm)
      setIncidents(prev => prev.map(i => i.id === editInc.id ? { ...i, description: editForm.description, immediate_action: editForm.immediateAction, emotion: editForm.emotion, updated_at: new Date().toISOString() } : i))
      toast.success('Incident updated')
      setEditOpen(false)
    } catch { toast.error('Failed to save') }
    finally { setEditSaving(false) }
  }

  const addReviewNote = async () => {
    if (!reviewNote.trim() || !editInc) return
    setAddingNote(true)
    try {
      const res = await api.post(`/incidents/${editInc.id}/review-note`, { note: reviewNote })
      const entry = res.data.data
      const updated = [...(editInc.review_notes || []), entry]
      setEditInc((p: any) => ({ ...p, review_notes: updated }))
      setIncidents(prev => prev.map(i => i.id === editInc.id ? { ...i, review_notes: updated } : i))
      setReviewNote('')
      toast.success('Review note added')
    } catch { toast.error('Failed to add note') }
    finally { setAddingNote(false) }
  }

  const addSignature = async () => {
    if (!editInc) return
    setSigning(true)
    try {
      const res = await api.post(`/incidents/${editInc.id}/signature`)
      const sig = res.data.data
      setEditInc((p: any) => ({ ...p, signature: sig }))
      setIncidents(prev => prev.map(i => i.id === editInc.id ? { ...i, signature: sig } : i))
      toast.success(`Signed off by ${sig.name}`)
    } catch { toast.error('Failed to add signature') }
    finally { setSigning(false) }
  }

  const handleSearch = (e: React.FormEvent) => { e.preventDefault() }

  const deleteIncident = async (inc: any) => {
    if (!window.confirm(`Delete this incident report for ${inc.resident_name || 'this service user'}? This cannot be undone.`)) return
    try {
      // Try deleting by incident record id first, fallback to daily_record_id
      await api.delete(`/incidents/${inc.id}`)
      setIncidents(prev => prev.filter(i => i.id !== inc.id))
      toast.success('Incident deleted')
    } catch {
      try {
        await api.delete(`/incidents/${inc.daily_record_id}`)
        setIncidents(prev => prev.filter(i => i.id !== inc.id))
        toast.success('Incident deleted')
      } catch { toast.error('Failed to delete incident') }
    }
  }

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-orange-500 flex-shrink-0" />
            Incident Reports
            <span className="ml-2 text-sm font-semibold bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full">
              {incidents.length}
            </span>
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            All recorded incidents for {homes.find(h => h.id === selectedHome)?.name || 'the home'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PrintButton />
          {homes.length > 1 && (
            <select
              className="input w-auto"
              value={selectedHome}
              onChange={e => setSelectedHome(e.target.value)}
            >
              {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setCreateForm({ ...BLANK_INC }); setCreateOpen(true) }}>
            Log Incident
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <StatCard label="Total this period" value={incidents.length} color="border-slate-400" />
        <StatCard label="Critical" value={stats.critical} color="border-red-500" />
        <StatCard label="High severity" value={stats.high} color="border-orange-500" />
        <StatCard label="Medium" value={stats.medium} color="border-yellow-500" />
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5 w-fit">
        {[{ id: 'list', label: 'Incident Log' }, { id: 'analytics', label: '📊 Analytics' }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── ANALYTICS TAB ── */}
      {activeTab === 'analytics' && (
        <IncidentAnalyticsPanel incidents={incidents} analytics={analytics} startDate={startDate} endDate={endDate} />
      )}

      {activeTab === 'list' && <>
      {/* Filter bar */}
      <form onSubmit={handleSearch} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-end">
          {/* Search */}
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">
              Service User Name
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                className="input pl-9"
                placeholder="Search service user..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Incident type */}
          <div className="min-w-[160px]">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">
              Incident type
            </label>
            <select className="input" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">All types</option>
              {INCIDENT_TYPES.map(t => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">
              From
            </label>
            <input
              type="date"
              className="input"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">
              To
            </label>
            <input
              type="date"
              className="input"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>

          <Button type="button" variant="secondary" icon={<Filter className="w-4 h-4" />}
            onClick={() => { setSearch(''); setFilterType(''); setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd')); setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd')); }}>
            Reset
          </Button>
        </div>
      </form>

      {/* Incident list */}
      {loading ? <Spinner /> : incidents.length === 0 ? (
        <EmptyState
          title="No incidents found"
          description="No incidents match your current filters. Try adjusting the date range or clearing the filters."
          action={
            <Button variant="secondary" icon={<Filter className="w-4 h-4" />}
              onClick={() => { setSearch(''); setFilterType(''); setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd')); setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd')); }}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {incidents.map((inc: any) => {
            const incidentType = inc.incident_type || 'other'
            const severity = getSeverity(incidentType)
            const isExpanded = expandedId === inc.id

            return (
              <div key={inc.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <button onClick={() => toggleExpand(inc.id)} className="w-full p-4 text-left hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      severity === 'critical' ? 'bg-red-500' : severity === 'high' ? 'bg-orange-500' : 'bg-yellow-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 text-sm">{inc.resident_name || 'Unknown resident'}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_STYLES[incidentType] || TYPE_STYLES.other}`}>
                          {TYPE_LABELS[incidentType] || incidentType}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${SEVERITY_STYLES[severity]}`}>
                          {severity.charAt(0).toUpperCase() + severity.slice(1)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                        <span>{inc.record_date ? format(new Date(inc.record_date), 'd MMM yyyy') : format(new Date(inc.created_at), 'd MMM yyyy')}</span>
                        {inc.location && <span>📍 {inc.location}</span>}
                        <span>by {inc.recorded_by_name || 'unknown'}</span>
                      </div>
                      {inc.description && <p className="text-sm text-slate-600 mt-1.5 line-clamp-2">{inc.description}</p>}
                    </div>
                    <div className="flex-shrink-0 text-slate-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-3 border-t border-slate-50 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <IncidentField label="Service User" value={inc.resident_name} />
                      <IncidentField label="Incident type" value={TYPE_LABELS[incidentType] || incidentType} />
                      <IncidentField label="Date" value={inc.record_date ? format(new Date(inc.record_date), 'd MMMM yyyy') : ''} />
                      {inc.location && <IncidentField label="Location" value={inc.location} />}
                      <IncidentField label="Recorded by" value={inc.recorded_by_name} />
                      <IncidentField label="Injuries" value={inc.injuries ? `Yes${inc.injury_details ? ` — ${inc.injury_details}` : ''}` : 'None reported'} />
                      <IncidentField label="Medical attention" value={inc.medical_needed ? `Yes${inc.medical_details ? ` — ${inc.medical_details}` : ''}` : 'No'} />
                      {inc.safeguarding_ref && <IncidentField label="Safeguarding" value="Safeguarding referral made" />}
                    </div>
                    {inc.description && <IncidentField label="Details of Incident" value={inc.description} />}
                    {inc.witnesses && <IncidentField label="Witnesses" value={inc.witnesses} />}
                    {inc.immediate_action && <IncidentField label="Immediate action taken" value={inc.immediate_action} />}

                    {/* Emotion display */}
                    {inc.emotion && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Resident Emotion</p>
                        <EmotionDisplay value={inc.emotion} />
                      </div>
                    )}

                    {/* Notification section */}
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-xs font-semibold text-blue-700 mb-0.5">Family / next of kin notified</p>
                      <p className={`text-sm font-medium ${inc.family_notified ? 'text-emerald-700' : 'text-slate-600'}`}>
                        {inc.family_notified ? 'Yes' : 'No'}
                      </p>
                    </div>

                    {/* Review Notes */}
                    {(inc.review_notes?.length > 0 || inc.signature) && (
                      <div className="space-y-2">
                        {inc.review_notes?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Review Notes</p>
                            <div className="space-y-2">
                              {inc.review_notes.map((note: any, i: number) => (
                                <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700">
                                  <p className="text-xs text-slate-400 mb-1">
                                    On {format(new Date(note.timestamp), 'd MMM yyyy HH:mm')} {note.author} wrote:
                                  </p>
                                  {note.text}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {inc.signature && (
                          <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            <p className="text-xs text-emerald-700">
                              Signed off by <strong>{inc.signature.name}</strong> on {format(new Date(inc.signature.timestamp), 'd MMM yyyy HH:mm')}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Last modified */}
                    {inc.updated_at && (
                      <p className="text-xs text-slate-400">Last modified: {format(new Date(inc.updated_at), 'd MMM yyyy HH:mm')}</p>
                    )}

                    {/* AI Analysis */}
                    <div className="pt-2 border-t border-slate-100">
                      {!aiAnalysis[inc.id] ? (
                        <Button size="sm" variant="outline"
                          icon={<Sparkles className="w-3.5 h-3.5 text-purple-500" />}
                          loading={aiLoading === inc.id}
                          onClick={() => requestAiAnalysis(inc)}>
                          Incident Analysis
                        </Button>
                      ) : (
                        <IncidentAnalysisCard
                          raw={aiAnalysis[inc.id]}
                          onDismiss={() => setAiAnalysis(p => { const n = {...p}; delete n[inc.id]; return n })}
                        />
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <Button size="sm" variant="outline" icon={<Pencil className="w-3.5 h-3.5" />}
                        onClick={() => openEdit(inc)}>
                        Edit / Review
                      </Button>
                      {isRole('home_manager', 'group_admin', 'deputy_manager', 'admin') && (
                        <Button size="sm" variant="danger" icon={<Trash2 className="w-3.5 h-3.5" />}
                          onClick={() => deleteIncident(inc)}>
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Edit / Review incident modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Incident" size="lg">
        {editInc && (
          <form onSubmit={saveEdit} className="space-y-5">
            <div>
              <label className="label">Description</label>
              <textarea className="input w-full" rows={4}
                value={editForm.description}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="label">Immediate action taken</label>
              <textarea className="input w-full" rows={2}
                value={editForm.immediateAction}
                onChange={e => setEditForm(f => ({ ...f, immediateAction: e.target.value }))} />
            </div>

            <EmotionPicker value={editForm.emotion} onChange={v => setEditForm(f => ({ ...f, emotion: v }))} />

            {editInc.updated_at && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Last Modified</p>
                <p className="text-sm text-slate-600">{format(new Date(editInc.updated_at), 'd MMM yyyy HH:mm')}</p>
              </div>
            )}

            {/* Review Notes */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Review Notes</p>
              {editInc.review_notes?.length > 0 ? (
                <div className="space-y-2 mb-3">
                  {editInc.review_notes.map((note: any, i: number) => (
                    <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700">
                      <p className="text-xs text-slate-400 mb-1">
                        On {format(new Date(note.timestamp), 'd MMM yyyy HH:mm')} {note.author} wrote:
                      </p>
                      {note.text}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 mb-2">No review notes yet.</p>
              )}
              <div className="flex gap-2">
                <textarea className="input flex-1 text-sm" rows={2} placeholder="Add a review note…"
                  value={reviewNote} onChange={e => setReviewNote(e.target.value)} />
                <Button type="button" size="sm" variant="outline"
                  icon={<MessageSquarePlus className="w-4 h-4" />}
                  loading={addingNote}
                  onClick={addReviewNote}>
                  Add
                </Button>
              </div>
            </div>

            {/* Signature */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Sign-off</p>
              {editInc.signature ? (
                <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <p className="text-xs text-emerald-700">
                    Signed by <strong>{editInc.signature.name}</strong> on {format(new Date(editInc.signature.timestamp), 'd MMM yyyy HH:mm')}
                  </p>
                </div>
              ) : (
                <Button type="button" size="sm" variant="outline"
                  icon={<CheckCircle className="w-4 h-4 text-emerald-600" />}
                  loading={signing}
                  onClick={addSignature}>
                  Add Signature
                </Button>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" loading={editSaving}>Save</Button>
            </div>
          </form>
        )}
      </Modal>

      </> /* end activeTab === 'list' */}

      {/* Create incident modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add Incident" size="lg">
        <form onSubmit={handleCreateIncident} className="space-y-4 pr-1">

          {/* Service User */}
          <div>
            <label className="label">Service User</label>
            <select className="input w-full" value={createForm.suId} onChange={e => setCreateForm(f => ({ ...f, suId: e.target.value }))} required>
              <option value="">Please Select</option>
              {sus.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
            </select>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date</label>
              <input type="date" className="input w-full" value={createForm.incidentDate} onChange={e => setCreateForm(f => ({ ...f, incidentDate: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Time</label>
              <div className="flex gap-2">
                <select className="input flex-1" value={createForm.incidentHour} onChange={e => setCreateForm(f => ({ ...f, incidentHour: e.target.value }))}>
                  {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <select className="input flex-1" value={createForm.incidentMinute} onChange={e => setCreateForm(f => ({ ...f, incidentMinute: e.target.value }))}>
                  {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="label">Type</label>
            <select className="input w-full" value={createForm.incidentType} onChange={e => setCreateForm(f => ({ ...f, incidentType: e.target.value }))}>
              <option value="">Please Select</option>
              {INCIDENT_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
          </div>

          {/* Incident Lasted */}
          <div>
            <label className="label">Incident Lasted (mins)</label>
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="Unknown" value={createForm.incidentDurationUnknown ? 'Unknown' : createForm.incidentDuration}
                disabled={createForm.incidentDurationUnknown}
                onChange={e => setCreateForm(f => ({ ...f, incidentDuration: e.target.value }))} />
              <button type="button"
                className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-all ${createForm.incidentDurationUnknown ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'}`}
                onClick={() => setCreateForm(f => ({ ...f, incidentDurationUnknown: !f.incidentDurationUnknown, incidentDuration: '' }))}>
                Unknown
              </button>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="label">Location</label>
            <select className="input w-full" value={createForm.location} onChange={e => setCreateForm(f => ({ ...f, location: e.target.value }))}>
              <option value="">Please Select</option>
              {['Bedroom', 'Bathroom', 'Kitchen', 'Living Room', 'Garden / Outdoors', 'Communal Area', 'Community / Outside', 'Other'].map(l =>
                <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          {/* Were other staff involved? */}
          <div>
            <label className="label">Were other staff involved?</label>
            <select className="input w-full" value={createForm.staffInvolved} onChange={e => setCreateForm(f => ({ ...f, staffInvolved: e.target.value }))}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
          {createForm.staffInvolved === 'Yes' && (
            <div>
              <textarea className="input w-full text-sm text-emerald-700 placeholder-emerald-400" rows={3}
                placeholder="Please list other staff who were involved"
                value={createForm.staffInvolvedList}
                onChange={e => setCreateForm(f => ({ ...f, staffInvolvedList: e.target.value }))} />
            </div>
          )}

          {/* Location Details */}
          <div>
            <label className="label">Location Details</label>
            <input className="input w-full" value={createForm.locationDetails} onChange={e => setCreateForm(f => ({ ...f, locationDetails: e.target.value }))} />
          </div>

          {/* Service User Injured */}
          <div>
            <label className="label">Service User Injured?</label>
            <select className="input w-full" value={createForm.serviceUserInjured} onChange={e => setCreateForm(f => ({ ...f, serviceUserInjured: e.target.value }))}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>

          {/* Body Map — only shown when service user is injured */}
          {createForm.serviceUserInjured === 'Yes' && (
            <VisualBodyMap value={createForm.injuryLocations} onChange={v => setCreateForm(f => ({ ...f, injuryLocations: v }))} />
          )}

          {/* Staff Member Injured */}
          <div>
            <label className="label">Staff Member Injured?</label>
            <select className="input w-full" value={createForm.staffInjured} onChange={e => setCreateForm(f => ({ ...f, staffInjured: e.target.value }))}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>

          {/* Witnessed By */}
          <div>
            <label className="label">Witnessed By</label>
            <select className="input w-full" value={createForm.witnessedBy} onChange={e => setCreateForm(f => ({ ...f, witnessedBy: e.target.value }))}>
              <option value="Nobody">Nobody</option>
              <option value="Staff">Staff</option>
              <option value="Family / Carer">Family / Carer</option>
              <option value="Service User">Service User</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Was resident able to provide information */}
          <div>
            <label className="label">Was resident able to provide information?</label>
            <select className="input w-full" value={createForm.residentProvideInfo} onChange={e => setCreateForm(f => ({ ...f, residentProvideInfo: e.target.value }))}>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>

          {/* What was resident doing */}
          <div>
            <SpeechTextarea label="What was resident doing at time of the incident?" rows={4}
              placeholder="" value={createForm.residentActivity} onChange={v => setCreateForm(f => ({ ...f, residentActivity: v }))} />
          </div>

          {/* How did it happen */}
          <div>
            <SpeechTextarea required label="How did the incident happen?" rows={4}
              placeholder="" value={createForm.description} onChange={v => setCreateForm(f => ({ ...f, description: v }))} />
          </div>

          {/* Date reported to senior staff */}
          <div>
            <label className="label">Date when incident reported to senior staff</label>
            <div className="flex gap-2">
              <input type="date" className="input flex-1" value={createForm.reportedToSeniorDate} onChange={e => setCreateForm(f => ({ ...f, reportedToSeniorDate: e.target.value }))} />
              <select className="input w-20" value={createForm.reportedToSeniorHour} onChange={e => setCreateForm(f => ({ ...f, reportedToSeniorHour: e.target.value }))}>
                {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              <select className="input w-20" value={createForm.reportedToSeniorMinute} onChange={e => setCreateForm(f => ({ ...f, reportedToSeniorMinute: e.target.value }))}>
                {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Equipment / NOK / GP */}
          <div>
            <label className="label">Any equipment/machinery involved?</label>
            <select className="input w-full" value={createForm.equipmentInvolved} onChange={e => setCreateForm(f => ({ ...f, equipmentInvolved: e.target.value }))}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
          <div>
            <label className="label">Have relatives/NOK been informed?</label>
            <select className="input w-full" value={createForm.nokInformed} onChange={e => setCreateForm(f => ({ ...f, nokInformed: e.target.value }))}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
          <div>
            <label className="label">Any GP/ambulance called?</label>
            <select className="input w-full" value={createForm.gpAmbulanceCalled} onChange={e => setCreateForm(f => ({ ...f, gpAmbulanceCalled: e.target.value }))}>
              <option value="">Please Select</option>
              <option value="No">No</option>
              <option value="GP Called">GP Called</option>
              <option value="Ambulance Called">Ambulance Called</option>
              <option value="Both GP and Ambulance">Both GP and Ambulance</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes</label>
            <textarea className="input w-full" rows={4} value={createForm.notes} onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          {/* Emotion */}
          <EmotionPicker value={createForm.emotion} onChange={v => setCreateForm(f => ({ ...f, emotion: v }))} />

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" loading={creating}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function IncidentField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-slate-700 whitespace-pre-line">{value}</p>
    </div>
  )
}
