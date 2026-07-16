import React, { useEffect, useState, useCallback } from 'react'
import api, { suApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import {
  Brain,
  Sparkles,
  ClipboardList,
  Pill,
  FileText,
  ShieldAlert,
  Mic,
  MicOff,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  ChevronRight,
  Activity,
  Stethoscope,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServiceUser {
  id: string
  first_name: string
  last_name: string
  home_id: string
}

interface HandoverResult {
  summary: string
  stats?: Record<string, unknown>
}

interface MedCheckResult {
  severity: 'low' | 'medium' | 'high'
  message: string
  details: string[]
}

interface IncidentDraftResult {
  draftReport: string
}

interface RiskResult {
  riskLevel: 'low' | 'medium' | 'high'
  score: number
  factors: string[]
  recommendations: string[]
}

interface FormatNoteResult {
  formatted: string
}

type TabId = 'handover' | 'medication' | 'incident' | 'risk' | 'format'

interface Tab {
  id: TabId
  label: string
  icon: React.ElementType
  color: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS: Tab[] = [
  { id: 'handover',   label: 'Shift Handover',    icon: ClipboardList, color: '#4ade80' },
  { id: 'medication', label: 'Medication Safety',  icon: Pill,          color: '#38bdf8' },
  { id: 'incident',   label: 'Incident Draft',     icon: FileText,      color: '#fb923c' },
  { id: 'risk',       label: 'Resident Risk',      icon: ShieldAlert,   color: '#f472b6' },
  { id: 'format',     label: 'Format Note',        icon: Stethoscope,   color: '#a78bfa' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SeverityBadge({ level }: { level: 'low' | 'medium' | 'high' }) {
  const map = {
    low:    { label: 'Low Risk',    bg: '#166534', text: '#4ade80', border: '#15803d' },
    medium: { label: 'Medium Risk', bg: '#713f12', text: '#fbbf24', border: '#92400e' },
    high:   { label: 'High Risk',   bg: '#7f1d1d', text: '#f87171', border: '#991b1b' },
  }
  const s = map[level] || map.low
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
    >
      {s.label}
    </span>
  )
}

function RiskScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? '#f87171' : score >= 40 ? '#fbbf24' : '#4ade80'
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
        <span>Risk Score</span>
        <span style={{ color }} className="font-bold">{score}/100</span>
      </div>
      <div className="w-full rounded-full h-2" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <div
          className="h-2 rounded-full transition-all duration-700"
          style={{ width: `${Math.min(score, 100)}%`, background: color }}
        />
      </div>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Copied to clipboard')
    } catch {
      toast.error('Failed to copy')
    }
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
      style={{ background: 'rgba(255,255,255,0.07)', color: copied ? '#4ade80' : 'rgba(255,255,255,0.6)' }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function SectionCard({ children, color = '#4ade80' }: { children: React.ReactNode; color?: string }) {
  return (
    <div
      className="rounded-2xl p-6 space-y-4"
      style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {children}
    </div>
  )
}

function ResultCard({ children, title, extra }: { children: React.ReactNode; title?: string; extra?: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {(title || extra) && (
        <div className="flex items-center justify-between">
          {title && <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>{title}</p>}
          {extra}
        </div>
      )}
      {children}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
      {children}
    </label>
  )
}

function AIInput({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition focus:ring-1 focus:ring-blue-500/50 ${className}`}
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
    />
  )
}

function AISelect({ className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none transition focus:ring-1 focus:ring-blue-500/50 ${className}`}
      style={{ background: '#1c2233', border: '1px solid rgba(255,255,255,0.1)' }}
    />
  )
}

function AITextarea({ className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none resize-none transition focus:ring-1 focus:ring-blue-500/50 ${className}`}
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
    />
  )
}

function RunButton({
  loading,
  onClick,
  children,
  color = '#4ade80',
}: {
  loading: boolean
  onClick: () => void
  children: React.ReactNode
  color?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
      style={{ background: color + '22', color, border: `1px solid ${color}55` }}
      onMouseEnter={e => { if (!loading) e.currentTarget.style.background = color + '35' }}
      onMouseLeave={e => { e.currentTarget.style.background = color + '22' }}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
      {children}
    </button>
  )
}

function ErrorMsg({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl p-3 text-sm"
      style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
      <AlertCircle size={15} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

function SuSelector({
  suList,
  value,
  onChange,
}: {
  suList: ServiceUser[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <FieldLabel>Service User</FieldLabel>
      <AISelect value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Select service user…</option>
        {suList.map(su => (
          <option key={su.id} value={su.id}>{su.first_name} {su.last_name}</option>
        ))}
      </AISelect>
    </div>
  )
}

// ─── Tab: Handover ────────────────────────────────────────────────────────────

function HandoverTab({ homeId }: { homeId: string }) {
  const [shiftType, setShiftType] = useState<'day' | 'night' | 'all'>('day')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<HandoverResult | null>(null)
  const [error, setError] = useState('')

  const run = async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await api.post('/ai/handover-summary', { homeId, shiftType })
      setResult(res.data)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to generate handover summary')
    } finally { setLoading(false) }
  }

  return (
    <SectionCard color="#4ade80">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Shift Handover Summary</h2>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Generate an AI-powered summary of the shift to brief the incoming team.
        </p>
      </div>

      <div>
        <FieldLabel>Shift Type</FieldLabel>
        <AISelect value={shiftType} onChange={e => setShiftType(e.target.value as 'day' | 'night' | 'all')}>
          <option value="day">Day Shift</option>
          <option value="night">Night Shift</option>
          <option value="all">All Shifts</option>
        </AISelect>
      </div>

      <RunButton loading={loading} onClick={run} color="#4ade80">
        Generate Handover Brief
      </RunButton>

      {error && <ErrorMsg message={error} />}

      {result && (
        <ResultCard title="Handover Summary" extra={<CopyButton text={result.summary} />}>
          {result.stats && (
            <div className="flex flex-wrap gap-3 pb-3 mb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {Object.entries(result.stats).map(([k, v]) => (
                <div key={k} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}>
                  <span className="font-semibold">{String(v)}</span>
                  <span className="ml-1 opacity-70 capitalize">{k.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          )}
          <pre className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'inherit' }}>
            {result.summary}
          </pre>
        </ResultCard>
      )}
    </SectionCard>
  )
}

// ─── Tab: Medication Safety ───────────────────────────────────────────────────

function MedicationTab({ suList }: { suList: ServiceUser[] }) {
  const [suId, setSuId] = useState('')
  const [medicationName, setMedicationName] = useState('')
  const [dose, setDose] = useState('')
  const [route, setRoute] = useState('oral')
  const [instructions, setInstructions] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<MedCheckResult | null>(null)
  const [error, setError] = useState('')

  const run = async () => {
    if (!medicationName.trim()) { toast.error('Please enter a medication name'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await api.post('/ai/medication-check', { suId: suId || undefined, medicationName, dose, route, instructions })
      setResult(res.data)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to check medication interactions')
    } finally { setLoading(false) }
  }

  return (
    <SectionCard color="#38bdf8">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Medication Safety Check</h2>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Check for potential drug interactions and safety concerns.
        </p>
      </div>

      <SuSelector suList={suList} value={suId} onChange={setSuId} />

      <div>
        <FieldLabel>Medication Name</FieldLabel>
        <AIInput
          placeholder="e.g. Aspirin, Warfarin…"
          value={medicationName}
          onChange={e => setMedicationName(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Dose</FieldLabel>
          <AIInput placeholder="e.g. 75mg" value={dose} onChange={e => setDose(e.target.value)} />
        </div>
        <div>
          <FieldLabel>Route</FieldLabel>
          <AISelect value={route} onChange={e => setRoute(e.target.value)}>
            <option value="oral">Oral</option>
            <option value="topical">Topical</option>
            <option value="IV">IV</option>
            <option value="subcutaneous">Subcutaneous</option>
            <option value="inhaled">Inhaled</option>
            <option value="other">Other</option>
          </AISelect>
        </div>
      </div>

      <div>
        <FieldLabel>Instructions / Notes</FieldLabel>
        <AITextarea
          rows={3}
          placeholder="Additional notes or context…"
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
        />
      </div>

      <RunButton loading={loading} onClick={run} color="#38bdf8">
        Check for Interactions
      </RunButton>

      {error && <ErrorMsg message={error} />}

      {result && (
        <ResultCard title="Safety Check Result">
          <div className="flex items-center gap-3 mb-3">
            <SeverityBadge level={result.severity} />
          </div>
          <p className="text-sm text-white leading-relaxed">{result.message}</p>
          {result.details && result.details.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {result.details.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  <ChevronRight size={14} className="mt-0.5 shrink-0 text-sky-400" />
                  {d}
                </li>
              ))}
            </ul>
          )}
        </ResultCard>
      )}
    </SectionCard>
  )
}

// ─── Tab: Incident Draft ──────────────────────────────────────────────────────

function IncidentTab({ suList }: { suList: ServiceUser[] }) {
  const [suId, setSuId] = useState('')
  const [staffNote, setStaffNote] = useState('')
  const [incidentType, setIncidentType] = useState('fall')
  const [incidentDate, setIncidentDate] = useState(() => new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<IncidentDraftResult | null>(null)
  const [error, setError] = useState('')

  const run = async () => {
    if (!staffNote.trim()) { toast.error('Please enter a staff note'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await api.post('/ai/draft-incident', { suId: suId || undefined, staffNote, incidentType, incidentDate })
      setResult(res.data)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to draft incident report')
    } finally { setLoading(false) }
  }

  return (
    <SectionCard color="#fb923c">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Incident Report Draft</h2>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Turn a quick staff note into a formal incident report.
        </p>
      </div>

      <SuSelector suList={suList} value={suId} onChange={setSuId} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Incident Type</FieldLabel>
          <AISelect value={incidentType} onChange={e => setIncidentType(e.target.value)}>
            <option value="fall">Fall</option>
            <option value="medication_error">Medication Error</option>
            <option value="behaviour">Behaviour</option>
            <option value="injury">Injury</option>
            <option value="other">Other</option>
          </AISelect>
        </div>
        <div>
          <FieldLabel>Incident Date</FieldLabel>
          <AIInput type="date" value={incidentDate} onChange={e => setIncidentDate(e.target.value)} />
        </div>
      </div>

      <div>
        <FieldLabel>Staff Note</FieldLabel>
        <AITextarea
          rows={4}
          placeholder="Write a quick note about what happened…"
          value={staffNote}
          onChange={e => setStaffNote(e.target.value)}
        />
      </div>

      <RunButton loading={loading} onClick={run} color="#fb923c">
        Draft Report
      </RunButton>

      {error && <ErrorMsg message={error} />}

      {result && (
        <ResultCard title="Draft Incident Report" extra={<CopyButton text={result.draftReport} />}>
          <pre className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'inherit' }}>
            {result.draftReport}
          </pre>
        </ResultCard>
      )}
    </SectionCard>
  )
}

// ─── Tab: Resident Risk ───────────────────────────────────────────────────────

function RiskTab({ suList }: { suList: ServiceUser[] }) {
  const [suId, setSuId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RiskResult | null>(null)
  const [error, setError] = useState('')

  const run = async () => {
    if (!suId) { toast.error('Please select a service user'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await api.get(`/ai/resident-risk/${suId}`)
      setResult(res.data)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load risk analysis')
    } finally { setLoading(false) }
  }

  return (
    <SectionCard color="#f472b6">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Resident Risk Analysis</h2>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          View predictive risk scores and safety recommendations for a resident.
        </p>
      </div>

      <SuSelector suList={suList} value={suId} onChange={setSuId} />

      <RunButton loading={loading} onClick={run} color="#f472b6">
        Analyse Risk
      </RunButton>

      {error && <ErrorMsg message={error} />}

      {result && (
        <div className="space-y-4">
          <ResultCard title="Risk Overview">
            <div className="flex items-center gap-3">
              <SeverityBadge level={result.riskLevel} />
            </div>
            <RiskScoreBar score={result.score} />
          </ResultCard>

          {result.factors && result.factors.length > 0 && (
            <ResultCard title="Risk Factors">
              <ul className="space-y-1.5">
                {result.factors.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    <Activity size={13} className="mt-0.5 shrink-0 text-pink-400" />
                    {f}
                  </li>
                ))}
              </ul>
            </ResultCard>
          )}

          {result.recommendations && result.recommendations.length > 0 && (
            <ResultCard title="Recommendations">
              <ul className="space-y-1.5">
                {result.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    <Check size={13} className="mt-0.5 shrink-0 text-emerald-400" />
                    {r}
                  </li>
                ))}
              </ul>
            </ResultCard>
          )}
        </div>
      )}
    </SectionCard>
  )
}

// ─── Tab: Format Note ─────────────────────────────────────────────────────────

function FormatNoteTab() {
  const [rawText, setRawText] = useState('')
  const [noteType, setNoteType] = useState('daily_record')
  const [recording, setRecording] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<FormatNoteResult | null>(null)
  const [error, setError] = useState('')
  const [speechSupported] = useState(() =>
    typeof window !== 'undefined' &&
    !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    )
  )

  const startRecording = useCallback(() => {
    const SpeechRec =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    if (!SpeechRec) { toast.error('Speech recognition not supported in this browser'); return }

    const recognition = new SpeechRec()
    recognition.continuous = false
    recognition.lang = 'en-GB'
    recognition.onresult = (e: any) => {
      const transcript: string = e.results[0][0].transcript
      setRawText(prev => (prev ? prev + ' ' + transcript : transcript))
      setRecording(false)
    }
    recognition.onerror = () => { setRecording(false); toast.error('Speech recognition error') }
    recognition.onend = () => setRecording(false)
    recognition.start()
    setRecording(true)
  }, [])

  const run = async () => {
    if (!rawText.trim()) { toast.error('Please enter or dictate a note'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await api.post('/ai/format-note', { rawText, noteType })
      setResult(res.data)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to format note')
    } finally { setLoading(false) }
  }

  return (
    <SectionCard color="#a78bfa">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Format Note</h2>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Convert voice recordings or shorthand notes into professional care records.
        </p>
      </div>

      <div>
        <FieldLabel>Note Type</FieldLabel>
        <AISelect value={noteType} onChange={e => setNoteType(e.target.value)}>
          <option value="daily_record">Daily Record</option>
          <option value="incident">Incident</option>
          <option value="care_plan">Care Plan</option>
          <option value="general">General</option>
        </AISelect>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <FieldLabel>Your Note</FieldLabel>
          {speechSupported && (
            <button
              type="button"
              onClick={startRecording}
              disabled={recording}
              title={recording ? 'Recording…' : 'Start voice input'}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: recording ? 'rgba(248,113,113,0.15)' : 'rgba(167,139,250,0.12)',
                color: recording ? '#f87171' : '#a78bfa',
                border: `1px solid ${recording ? 'rgba(248,113,113,0.3)' : 'rgba(167,139,250,0.25)'}`,
              }}
            >
              {recording ? <MicOff size={13} /> : <Mic size={13} />}
              {recording ? 'Recording…' : 'Voice Input'}
            </button>
          )}
        </div>
        <AITextarea
          rows={5}
          placeholder="Speak or type your shorthand notes… e.g. 'pt awake 06:30 breakfast porridge 3/4 eaten fluid 200ml pad change dry mood settled'"
          value={rawText}
          onChange={e => setRawText(e.target.value)}
        />
      </div>

      <RunButton loading={loading} onClick={run} color="#a78bfa">
        Format Note
      </RunButton>

      {error && <ErrorMsg message={error} />}

      {result && (
        <ResultCard
          title="Formatted Note"
          extra={<CopyButton text={result.formatted} />}
        >
          <pre className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'inherit' }}>
            {result.formatted}
          </pre>
        </ResultCard>
      )}
    </SectionCard>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AIAssistant() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabId>('handover')
  const [suList, setSuList] = useState<ServiceUser[]>([])
  const homeId = user?.homeId || ''

  useEffect(() => {
    if (!homeId) return
    suApi.list(homeId).then(res => setSuList(res.data.data || [])).catch(() => {})
  }, [homeId])

  return (
    <div className="p-4 lg:p-10 max-w-4xl mx-auto">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4 mb-8">
        <div
          className="flex items-center justify-center w-12 h-12 rounded-2xl shrink-0"
          style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.25)' }}
        >
          <Brain size={24} style={{ color: '#a78bfa' }} />
        </div>
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-white">AI Assistant</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            AI-powered tools to support safe, efficient care delivery
          </p>
        </div>
      </div>

      {/* ── Tab Bar ─────────────────────────────────────────────────── */}
      <div
        className="flex flex-wrap gap-1.5 p-1.5 rounded-2xl mb-6"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {TABS.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                background: active ? tab.color + '20' : 'transparent',
                color: active ? tab.color : 'rgba(255,255,255,0.45)',
                border: `1px solid ${active ? tab.color + '40' : 'transparent'}`,
              }}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────── */}
      {activeTab === 'handover'   && <HandoverTab homeId={homeId} />}
      {activeTab === 'medication' && <MedicationTab suList={suList} />}
      {activeTab === 'incident'   && <IncidentTab suList={suList} />}
      {activeTab === 'risk'       && <RiskTab suList={suList} />}
      {activeTab === 'format'     && <FormatNoteTab />}

    </div>
  )
}
