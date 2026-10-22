import React, { useEffect, useState } from 'react'
import { homesApi, suApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { ukDateStr } from '../../utils/ukDate'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button, Modal } from '../../components/ui'
import {
  BarChart3, Search, AlertTriangle, CheckCircle, User, Brain,
  TrendingUp, Download, Eye, ShieldAlert, Pill, Clock, Calendar, FileText, MapPin
} from 'lucide-react'
import toast from 'react-hot-toast'
import { buildLetterheadPage, openLetterheadPrint, esc, type PrintSection } from '../../utils/letterheadPrint'

// Alphabetical by label — includes all 26 original operational reports plus management extras.
const REPORT_TYPES = [
  { value: 'assessment-matrix', label: 'Assessment Matrix', description: 'Staff assessments on file and reviews due' },
  { value: 'calendar', label: 'Calendar & Appointments', description: 'Everything added to the calendar' },
  { value: 'cancelled-shifts', label: 'Cancelled Shifts', description: 'Shifts cancelled, with the reason' },
  { value: 'care-plan-compliance', label: 'Care Plan Compliance', description: 'Review status and overdue plans' },
  { value: 'care-plan-reviews', label: 'Care Plan Reviews', description: 'Overdue and upcoming reviews' },
  { value: 'careplan-review-matrix', label: 'Careplan Review Matrix', description: 'Care plan, risk assessment and MAR review dates per person' },
  { value: 'clash-bookings', label: 'Clash Bookings', description: 'Bookings confirmed despite a shift clash warning' },
  { value: 'clock-in-locations', label: 'Clock In Locations', description: 'How far staff were from the service when they clocked in or out' },
  { value: 'clocked-in-integrity', label: 'Clocked In Integrity', description: 'Shift start against actual clock-in' },
  { value: 'complaints', label: 'Complaints & Compliments', description: 'Quality feedback, actions taken and outcomes' },
  { value: 'daily-records', label: 'Daily Records', description: 'All care records for a date range' },
  { value: 'delivered-hours', label: 'Delivered Hours', description: "Rota'd hours, delivered hours and clock-ins per staff member" },
  { value: 'documents-matrix', label: 'Documents Matrix', description: 'DBS, right to work, references and training per staff member' },
  { value: 'fluid', label: 'Fluid Intake', description: 'Fluid totals and threshold alerts' },
  { value: 'handover', label: 'Handover Notes', description: 'Shift handover notes by service user' },
  { value: 'incident-analysis', label: 'Incident Analysis', description: 'Analysis of incident patterns' },
  { value: 'incidents', label: 'Incidents', description: 'All incident reports' },
  { value: 'mar-report', label: 'MAR Report', description: 'Medication administration records' },
  { value: 'medication-report', label: 'Medication Report', description: 'Completed MAR reviews & prescribed medications schedule' },
  { value: 'medication-stock', label: 'Medication Stock Count', description: 'Medication stock counts completed by staff on shift' },
  { value: 'overdue-signatures', label: 'Overdue Signatures', description: 'Policies sent to staff and still unsigned' },
  { value: 'reviews', label: 'Service User Reviews', description: 'Completed service user care reviews' },
  { value: 'safeguarding', label: 'Safeguarding', description: 'All safeguarding concerns' },
  { value: 'absence', label: 'Staff Absence', description: 'Sickness and absence log' },
  { value: 'staff-attendance', label: 'Staff Attendance', description: 'Clock in/out history by staff member' },
  { value: 'leave', label: 'Staff Leave', description: 'Annual and statutory leave requests' },
  { value: 'system-activity', label: 'System Activity', description: 'Anything done on the system, by any staff member' },
  { value: 'tasks-not-completed', label: 'Tasks Not Completed', description: 'Tasks that were due and never done' },
  { value: 'training-compliance', label: 'Training Compliance', description: 'Expiring and expired certificates' },
  { value: 'weekly-summary', label: 'Weekly Summary', description: 'Incidents, falls, seizures, bowel records and visits per person' },
  { value: 'wellbeing', label: 'Well Being', description: 'Height, weight, blood pressure and oxygen observations per person' },
]

// Synced with RECORD_TYPES in pages/daily-records/DailyRecords.tsx
const DAILY_RECORD_TYPES = [
  { value: '', label: 'All types' },
  { value: 'one_to_one', label: '1-to-1 Conversation' },
  { value: 'behaviour', label: 'Behavior Record (ABC)' },
  { value: 'vitals_bp', label: 'Blood Pressure' },
  { value: 'body_map', label: 'Body Map / Skin' },
  { value: 'bowel_movement', label: 'Bowel Movement' },
  { value: 'comfort_check', label: 'Comfort Check' },
  { value: 'communication', label: 'Communication' },
  { value: 'family_visit', label: 'Family Visit' },
  { value: 'financial_support', label: 'Financial Support' },
  { value: 'fluid_intake', label: 'Fluid / Drinks' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'food_intake', label: 'Food Intake' },
  { value: 'general_support', label: 'General Support' },
  { value: 'handover', label: 'Handover Note' },
  { value: 'housekeeping', label: 'Housekeeping' },
  { value: 'incident', label: 'Incident' },
  { value: 'medication_disposed', label: 'Medication Disposed' },
  { value: 'medication_ordered', label: 'Medication Ordered' },
  { value: 'medication_received', label: 'Medication Received' },
  { value: 'medication_stock_count', label: 'Medication Team Count' },
  { value: 'oral_care', label: 'Oral Care' },
  { value: 'vitals_oxygen', label: 'Oxygen (SpO2)' },
  { value: 'personal_care', label: 'Personal Care' },
  { value: 'prn_medication', label: 'PRN Medication' },
  { value: 'professional_visit', label: 'Professional Visit' },
  { value: 'repositioning', label: 'Repositioning' },
  { value: 'seizure', label: 'Seizure Episode' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'social_activity', label: 'Social Activity' },
  { value: 'social_visit', label: 'Social Visit' },
  { value: 'telephone_call', label: 'Telephone Call' },
  { value: 'vitals_temp', label: 'Temperature' },
  { value: 'welfare_check', label: 'Welfare Check' },
  { value: 'vitals_weight', label: 'Weight & MUST' },
]

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const HIDDEN_INTERNAL_COLS = new Set([
  'id', 'home_id', 'su_id', 'staff_id', 'daily_record_id', 'medication_id',
  'stock_id', 'created_by', 'updated_by', 'reviewed_by', 'conducted_by',
  'logged_by', 'approved_by', 'manager_ack_by', 'assigned_staff_id',
  'parent_shift_id', 'template_id', 'shift_breakdown', 'items', 'raw_notes',
  '_changes',
])

const WIDE_RANGE_REPORTS = new Set([
  'incident-analysis', 'incidents', 'safeguarding', 'medication-report',
  'reviews', 'complaints', 'leave', 'absence', 'calendar',
])

function daysAgoUkStr(days: number): string {
  return ukDateStr(new Date(Date.now() - days * 86400000))
}

export default function Reports() {
  const { user } = useAuth()
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [searchParams] = window.location.search ? [new URLSearchParams(window.location.search)] : [new URLSearchParams()]
  const initialType = searchParams.get('type') || 'daily-records'
  const [reportType, setReportType] = useState(initialType)
  const [from, setFrom] = useState(() => daysAgoUkStr(WIDE_RANGE_REPORTS.has(initialType) ? 30 : 7))
  const [to, setTo] = useState(() => ukDateStr())
  const [data, setData] = useState<any>(null)
  const [medReviews, setMedReviews] = useState<any[]>([])
  const [medStockSummary, setMedStockSummary] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [suList, setSuList] = useState<any[]>([])
  const [selectedSu, setSelectedSu] = useState('')
  const [dailyRecordType, setDailyRecordType] = useState('')

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
    })
  }, [user])

  useEffect(() => {
    if (!selectedHome) return
    suApi.list(selectedHome).then(res => setSuList(res.data.data || [])).catch(() => {})
  }, [selectedHome])

  const selectReportType = (nextType: string) => {
    setReportType(nextType)
    setData(null)
    setMedReviews([])
    setMedStockSummary([])
    // Automatically widen default range from 7d -> 30d when switching to monthly/analytical reports
    if (WIDE_RANGE_REPORTS.has(nextType) && from > daysAgoUkStr(14)) {
      setFrom(daysAgoUkStr(30))
    }
  }

  const runReport = async () => {
    setLoading(true)
    setData(null)
    setMedReviews([])
    setMedStockSummary([])
    try {
      const params: any = { homeId: selectedHome, from, to }
      if (selectedSu) params.suId = selectedSu
      if (reportType === 'daily-records' && dailyRecordType) params.recordType = dailyRecordType

      if (reportType === 'system-activity') {
        const res = await api.get('/audit-trail', { params })
        const raw = res.data.data || res.data || []
        const formatted = (Array.isArray(raw) ? raw : []).map((a: any) => ({
          date_and_time: a.created_at
            ? new Date(a.created_at).toLocaleString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London'
              })
            : '—',
          staff_member: a.staff_name || a.actor_name || 'System',
          role: a.staff_role_label || a.role_label || String(a.staff_role || a.actor_role || 'System').replace(/_/g, ' '),
          person_affected: a.person_affected || a.target_person_name || a.target_name || '—',
          module: a.module_label || String(a.entity_type || a.resource_type || 'System').replace(/_/g, ' '),
          specific_action_and_changes: a.action_description || String(a.action || '—').replace(/_/g, ' '),
          _changes: Array.isArray(a.changes) ? a.changes : [],
        }))
        setData(formatted)
        return
      }

      const res = await api.get(`/reports/${reportType}`, { params })
      setData(res.data.data)
      setMedReviews(reportType === 'medication-report' ? (res.data.marReviews || []) : [])
      setMedStockSummary(reportType === 'medication-stock' ? (res.data.currentStock || []) : [])
    } catch (err: any) {
      console.error('Report error:', err?.response?.data)
      toast.error(err?.response?.data?.error || 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadReport = () => {
    if (!data) { toast.error('Run a report first'); return }
    const rows: any[] = Array.isArray(data) ? data : (data?.plans || data?.incidents || [])
    if (!rows.length && !medReviews.length) { toast.error('No data to download'); return }
    const reportLabel = REPORT_TYPES.find(r => r.value === reportType)?.label || reportType
    const su = selectedSu ? suList.find(s => s.id === selectedSu) : null
    const suName = su ? `${su.first_name || su.firstName} ${su.last_name || su.lastName}` : 'All Residents'

    let sections: PrintSection[] = []

    if (reportType === 'daily-records') {
      sections = [{
        title: reportLabel,
        inner: rows.slice(0, 200).map(row => {
          const recordedAt = row.recorded_at ? new Date(row.recorded_at) : (row.record_date ? new Date(row.record_date) : null)
          const typeLabel = DAILY_RECORD_TYPES.find(t => t.value === row.record_type)?.label
            || String(row.record_type || '').replace(/_/g, ' ')
          const body = recordNarrative(row)
          return `
            <h3 class="sub">${esc(typeLabel)}</h3>
            <table class="idtable" style="margin-bottom:6px">
              <tr>
                <td class="lbl">Date</td><td class="val">${recordedAt ? esc(recordedAt.toLocaleDateString('en-GB', { timeZone: 'Europe/London' })) : '—'}</td>
                <td class="lbl">Time</td><td class="val">${row.recorded_at ? esc(new Date(row.recorded_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })) : '—'}</td>
              </tr>
              <tr>
                <td class="lbl">Staff on Duty</td><td class="val">${esc(row.staff_name || row.recorded_by_name || '—')}</td>
                <td class="lbl">Service User</td><td class="val">${esc(row.su_name || '—')}</td>
              </tr>
            </table>
            <p class="body-text">${esc(body || 'No further detail recorded')}</p>
          `
        }).join(''),
      }]
    } else if (reportType === 'medication-report') {
      if (medReviews.length > 0) {
        const revRows = medReviews.map(r => `<tr>
          <td>${esc(r.review_date)}</td>
          <td>${esc(r.service_user)}</td>
          <td>${esc(r.review_type)}</td>
          <td>${esc(r.reviewed_by)}</td>
          <td>${esc(String(r.summary_findings || '—').substring(0, 220))}</td>
          <td>${esc(r.next_review_due)}</td>
        </tr>`).join('')
        sections.push({
          title: 'Completed MAR Reviews',
          inner: `<table class="fields">
            <tr><th>Date</th><th>Service User</th><th>Review Type</th><th>Reviewed By</th><th>Summary Findings</th><th>Next Review</th></tr>
            ${revRows}
          </table>`,
        })
      }
      if (rows.length > 0) {
        const medRows = rows.map(m => `<tr>
          <td>${esc(m.service_user)}</td>
          <td>${esc(m.medication)}</td>
          <td>${esc(m.dosage)}</td>
          <td>${esc(m.administration_route)}</td>
          <td>${esc(m.start_time)}</td>
          <td>${esc(m.prescriber)}</td>
        </tr>`).join('')
        sections.push({
          title: 'Prescribed Medications Schedule',
          inner: `<table class="fields">
            <tr><th>Service User</th><th>Medication</th><th>Dosage</th><th>Route</th><th>Start Time</th><th>Prescriber / GP</th></tr>
            ${medRows}
          </table>`,
        })
      }
    } else {
      const cols = getVisibleColumns(rows[0] || {})
      const tableRows = rows.slice(0, 200).map(row => `<tr>${cols.map(c => {
        const display = formatCellValue(row[c]).substring(0, 160)
        return `<td>${esc(display)}</td>`
      }).join('')}</tr>`).join('')
      sections = [{
        title: reportLabel,
        inner: `
          <table class="fields">
            <tr>${cols.map(c => `<th>${esc(c.replace(/_/g, ' '))}</th>`).join('')}</tr>
            ${tableRows}
          </table>
        `,
      }]
    }

    const page = buildLetterheadPage({
      docTitle: reportLabel,
      docSubtitle: `${from} to ${to}${rows.length > 200 ? ` — first 200 of ${rows.length} records` : ''}`,
      docRefPrefix: 'RPT',
      docRefId: reportType,
      residentName: suName,
      residentLabel: su ? 'Resident' : 'Scope',
      residentPhotoUrl: su?.photo_url || su?.photoUrl || null,
      sections,
    })
    openLetterheadPrint(reportLabel, page)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-purple-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-600" /> Reports
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Generate and view operational &amp; clinical compliance reports</p>
        </div>
        {homes.length > 1 && (
          <select className="input w-auto" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
            {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        )}
      </div>

      {/* Report type selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {REPORT_TYPES.map(rt => (
          <button key={rt.value} onClick={() => selectReportType(rt.value)}
            className={`p-4 rounded-xl border-2 text-left transition-colors ${reportType === rt.value ? 'border-purple-600 bg-purple-50' : 'border-slate-200 bg-white hover:border-purple-300'}`}>
            <p className={`text-sm font-semibold ${reportType === rt.value ? 'text-purple-900' : 'text-slate-800'}`}>{rt.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{rt.description}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="label">From date</label>
            <input type="date" className="input w-auto" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">To date</label>
            <input type="date" className="input w-auto" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          {reportType === 'daily-records' && (
            <div>
              <label className="label">Record type</label>
              <select className="input w-auto" value={dailyRecordType} onChange={e => setDailyRecordType(e.target.value)}>
                {DAILY_RECORD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label flex items-center gap-1"><User className="w-3.5 h-3.5" /> Filter by resident</label>
            <select className="input w-auto" value={selectedSu} onChange={e => setSelectedSu(e.target.value)}>
              <option value="">All residents</option>
              {suList.map(s => <option key={s.id} value={s.id}>{s.first_name || s.firstName} {s.last_name || s.lastName}</option>)}
            </select>
          </div>
          <Button icon={<Search className="w-4 h-4" />} onClick={runReport} loading={loading}>
            Run report
          </Button>
        </div>
      </div>

      {/* Download */}
      {!loading && data && (
        <div className="flex justify-end mb-3">
          <Button variant="outline" icon={<Download className="w-4 h-4" />} onClick={handleDownloadReport}>
            Download / Print Report
          </Button>
        </div>
      )}

      {/* Results */}
      {loading ? <Spinner /> : !data ? (
        <EmptyState title="Select a report type and click Run" description="Reports will appear here" />
      ) : reportType === 'care-plan-compliance' ? (
        <CarePlanCompliance data={data} />
      ) : reportType === 'fluid' ? (
        <FluidReport data={data} />
      ) : reportType === 'training-compliance' ? (
        <TrainingCompliance data={data} />
      ) : reportType === 'incident-analysis' ? (
        <IncidentAnalysis data={data} />
      ) : reportType === 'incidents' ? (
        <IncidentsReport data={Array.isArray(data) ? data : []} />
      ) : reportType === 'safeguarding' ? (
        <SafeguardingReport data={Array.isArray(data) ? data : []} />
      ) : reportType === 'medication-stock' ? (
        <MedicationStockCountReport data={Array.isArray(data) ? data : []} currentStock={medStockSummary} />
      ) : reportType === 'medication-report' ? (
        <MedicationReportView medications={Array.isArray(data) ? data : []} marReviews={medReviews} />
      ) : reportType === 'delivered-hours' ? (
        <DeliveredHoursReport data={Array.isArray(data) ? data : []} />
      ) : reportType === 'calendar' ? (
        <CalendarReport data={Array.isArray(data) ? data : []} />
      ) : reportType === 'daily-records' ? (
        <DailyRecordsReport data={Array.isArray(data) ? data : []} />
      ) : reportType === 'wellbeing' ? (
        <WellbeingReport data={Array.isArray(data) ? data : []} />
      ) : reportType === 'system-activity' ? (
        <SystemActivityReport data={Array.isArray(data) ? data : []} />
      ) : (
        <GenericTable data={Array.isArray(data) ? data : []} reportType={reportType} />
      )}
    </div>
  )
}

function getVisibleColumns(sampleRow: Record<string, any>): string[] {
  return Object.keys(sampleRow)
    .filter(k => !HIDDEN_INTERNAL_COLS.has(k) && !k.endsWith('_id'))
    .filter(k => typeof sampleRow[k] !== 'object' || sampleRow[k] === null || sampleRow[k] instanceof Date)
    .slice(0, 10)
}

function formatCellValue(val: any): string {
  if (val === null || val === undefined || val === '') return '—'
  if (val instanceof Date) return format(val, 'd MMM yyyy')
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'
  if (Array.isArray(val)) {
    const parts = val.map(item => {
      if (item && typeof item === 'object') {
        if ('text' in item) return `${item.author ? `${item.author}: ` : ''}${item.text || ''}`
        return Object.values(item).filter(Boolean).join(' · ')
      }
      return String(item ?? '')
    }).filter(Boolean)
    return parts.length ? parts.join('\n\n') : '—'
  }
  if (typeof val === 'object') {
    if ('text' in val) return `${val.author ? `${val.author}: ` : ''}${val.text || ''}`
    return JSON.stringify(val)
  }
  const str = String(val)
  if (UUID_REGEX.test(str.trim())) return '—'
  return str
}

// Turns a row of daily_records into crisp human-readable narrative across ALL 32 record types
function recordNarrative(r: any): string {
  const type = r.record_type || ''
  const rawNotes = String(r.notes || r.details_summary || r.general_notes || r.description || '').trim()
  if (type === 'fluid_intake' && r.amount_ml != null) {
    return `${r.fluid_type || 'Fluid'} — ${r.amount_ml}ml${rawNotes ? `. ${rawNotes}` : ''}`
  }
  if (type === 'food_intake' && (r.meal_type || r.amount_eaten)) {
    return `${r.meal_type || 'Meal'}: ${r.amount_eaten || '—'}${r.food_description ? ` · ${r.food_description}` : ''}${rawNotes ? `. ${rawNotes}` : ''}`
  }
  if (type === 'vitals_bp' && r.systolic != null) {
    return `BP: ${r.systolic}/${r.diastolic} mmHg${r.pulse ? ` · Pulse: ${r.pulse}bpm` : ''}${rawNotes ? `. ${rawNotes}` : ''}`
  }
  if (type === 'vitals_temp' && r.temp_celsius != null) {
    return `Temp: ${r.temp_celsius}°C${rawNotes ? `. ${rawNotes}` : ''}`
  }
  if (type === 'vitals_oxygen' && r.spo2_percent != null) {
    return `SpO2: ${r.spo2_percent}%${r.supplemental_o2 ? ' (on O₂)' : ''}${rawNotes ? `. ${rawNotes}` : ''}`
  }
  if (type === 'vitals_weight' && r.weight_kg != null) {
    return `Weight: ${r.weight_kg}kg${r.bmi ? ` · BMI: ${r.bmi}` : ''}${rawNotes ? `. ${rawNotes}` : ''}`
  }
  if (type === 'bowel_movement' && r.bristol_type != null) {
    return `Bristol type ${r.bristol_type}${rawNotes ? ` · ${rawNotes}` : ''}`
  }
  if ((type === 'comfort_check' || type === 'welfare_check') && !rawNotes) {
    const parts = [r.su_status, r.environment_notes, r.action_taken].filter(Boolean)
    if (parts.length > 0) return parts.join(' · ')
    return `${type === 'comfort_check' ? 'Comfort check' : 'Welfare check'} completed — resident settled and safe`
  }
  return rawNotes || (type ? `${type.replace(/_/g, ' ')} completed` : '—')
}

// ── Video 10: Daily Records (including Comfort Checks — dark crisp text + click-to-view modal) ──
function DailyRecordsReport({ data }: { data: any[] }) {
  const [selectedRow, setSelectedRow] = useState<any | null>(null)
  if (!data.length) return <EmptyState title="No records found" description="No daily records found for this date range" />

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">{data.length} record{data.length !== 1 ? 's' : ''}</p>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-purple-600" /> Click any record to open full entry
          </p>
        </div>
        <div className="divide-y divide-slate-200">
          {data.map((r: any, i: number) => {
            const typeInfo = DAILY_RECORD_TYPES.find(t => t.value === r.record_type)
            const when = r.recorded_at || r.record_date
            const author = r.staff_name || r.recorded_by_name
            const narrative = recordNarrative(r)
            return (
              <div
                key={r.id ?? i}
                onClick={() => setSelectedRow(r)}
                className="px-5 py-4 hover:bg-purple-50/40 cursor-pointer transition-colors"
              >
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 capitalize">
                    {typeInfo?.label || (r.record_type || '').replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm font-semibold text-slate-900">{r.su_name || '—'}</span>
                  <span className="text-xs font-medium text-slate-600">
                    {when ? new Date(when).toLocaleString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      ...(r.recorded_at ? { hour: '2-digit', minute: '2-digit' } : {}),
                      timeZone: 'Europe/London',
                    }) : '—'}
                  </span>
                  {author && <span className="text-xs font-medium text-slate-600">· Recorded by {author}</span>}
                </div>
                <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed" style={{ minHeight: '1.25rem' }}>
                  {narrative}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {selectedRow && (
        <Modal
          open={true}
          onClose={() => setSelectedRow(null)}
          title={`${selectedRow.su_name || 'Resident'} — ${DAILY_RECORD_TYPES.find(t => t.value === selectedRow.record_type)?.label || String(selectedRow.record_type || '').replace(/_/g, ' ')}`}
          size="lg"
        >
          <div className="space-y-4 text-slate-800">
            <div className="grid sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs">
              <div><span className="font-semibold text-slate-500">Resident:</span> <span className="font-semibold text-slate-900">{selectedRow.su_name || '—'}</span></div>
              <div><span className="font-semibold text-slate-500">Date &amp; Time:</span> <span className="font-semibold text-slate-900">{selectedRow.recorded_at ? new Date(selectedRow.recorded_at).toLocaleString('en-GB', { timeZone: 'Europe/London' }) : (selectedRow.record_date ? format(new Date(selectedRow.record_date), 'd MMM yyyy') : '—')}</span></div>
              <div><span className="font-semibold text-slate-500">Recorded By:</span> <span className="font-semibold text-slate-900">{selectedRow.staff_name || selectedRow.recorded_by_name || '—'}</span></div>
              <div><span className="font-semibold text-slate-500">Management Review:</span> <span className="font-semibold text-slate-900">{selectedRow.reviewed_at || selectedRow.is_reviewed ? `Reviewed${selectedRow.reviewed_by_name ? ` by ${selectedRow.reviewed_by_name}` : ''}` : 'Pending review'}</span></div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-900 whitespace-pre-wrap leading-relaxed">
              {recordNarrative(selectedRow)}
            </div>
            {selectedRow.review_notes && formatCellValue(selectedRow.review_notes) !== '—' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900">
                <p className="font-semibold mb-1">Management Review Notes</p>
                <p className="whitespace-pre-wrap">{formatCellValue(selectedRow.review_notes)}</p>
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedRow(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

// ── Video 2: Safeguarding Report (Created By Staff Name + Clickable Detail Modal) ──
function SafeguardingReport({ data }: { data: any[] }) {
  const [selected, setSelected] = useState<any | null>(null)
  if (!data.length) return <EmptyState title="No safeguarding concerns found" description="No safeguarding records match this filter" />

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm font-semibold text-slate-900">{data.length} safeguarding concern{data.length !== 1 ? 's' : ''}</p>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-purple-600" /> Click any row to view full safeguarding concern details
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Date', 'Service User', 'Time', 'Location', 'Concern Overview', 'Immediate Actions', 'Outside Agency', 'Created By', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600 text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((sg: any, i: number) => (
                <tr
                  key={sg.id || i}
                  onClick={() => setSelected(sg)}
                  className="hover:bg-purple-50/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-xs font-medium text-slate-800 whitespace-nowrap">{sg.incident_date || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-purple-900 whitespace-nowrap">{sg.service_user || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{sg.incident_time ? String(sg.incident_time).slice(0, 5) : '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-700">{sg.location || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-800 max-w-xs truncate">{sg.overview || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-700 max-w-xs truncate">{sg.immediate_actions || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-700">{sg.outside_agency || 'No'}</td>
                  <td className="px-4 py-3 text-xs font-medium text-slate-900 whitespace-nowrap">{sg.created_by_name || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${sg.manager_ack ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {sg.manager_status || (sg.manager_ack ? 'Acknowledged' : 'Pending review')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <Modal open={true} onClose={() => setSelected(null)} title={`Safeguarding Concern — ${selected.service_user || 'Resident'}`} size="lg">
          <div className="space-y-4 text-slate-800">
            <div className="grid sm:grid-cols-2 gap-3 p-4 rounded-xl bg-rose-50/60 border border-rose-200 text-xs">
              <div><span className="font-semibold text-slate-500">Service User:</span> <span className="font-semibold text-slate-900">{selected.service_user || '—'}</span></div>
              <div><span className="font-semibold text-slate-500">Incident Date &amp; Time:</span> <span className="font-semibold text-slate-900">{selected.incident_date || '—'}{selected.incident_time && selected.incident_time !== '—' ? ` at ${String(selected.incident_time).slice(0, 5)}` : ''}</span></div>
              <div><span className="font-semibold text-slate-500">Created By:</span> <span className="font-semibold text-slate-900">{selected.created_by_name || '—'}</span></div>
              <div><span className="font-semibold text-slate-500">Incident Location:</span> <span className="font-semibold text-slate-900">{selected.incident_location || selected.location || '—'}</span></div>
              <div><span className="font-semibold text-slate-500">Service User Current Location:</span> <span className="font-semibold text-slate-900">{selected.su_location || '—'}</span></div>
              <div><span className="font-semibold text-slate-500">Manager Status:</span> <span className="font-semibold text-slate-900">{selected.manager_status || '—'}</span></div>
            </div>

            {[
              ['Overview of Safeguarding Concern', selected.overview],
              ['Immediate Actions Taken', selected.immediate_actions],
              ['Witnesses', selected.witnesses],
              ['Injuries & Medical Attention', [selected.injury_details, selected.medical_details].filter(Boolean).join('\n') || (selected.medical_required ? 'Medical review required' : null)],
              ['Outside Agency / Local Authority Referral', selected.outside_agency && selected.outside_agency !== 'No' ? selected.outside_agency : null],
              ['Reported To', selected.reported_to],
              ['Decisions Breached / Policy Considerations', selected.decisions_breached],
              ['Prevention Actions', selected.prevention_actions],
              ['Lessons Learnt', selected.lessons_learnt],
              ['Management Recommendations', selected.management_recs],
            ].map(([label, val]) => [label, formatCellValue(val)]).filter(([, txt]) => txt && txt !== '—').map(([label, txt]) => (
              <div key={String(label)} className="border border-slate-200 rounded-xl p-4 bg-white">
                <p className="text-xs font-bold uppercase tracking-wider text-purple-800 mb-1.5">{label}</p>
                <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{txt}</p>
              </div>
            ))}

            <div className="flex justify-end pt-1">
              <Button variant="outline" size="sm" onClick={() => setSelected(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

// ── Video 6: Incidents Report (Service User first column, zero raw UUIDs, clickable full report modal) ──
function IncidentsReport({ data }: { data: any[] }) {
  const [selected, setSelected] = useState<any | null>(null)
  if (!data.length) return <EmptyState title="No incidents found" description="No incident reports found for this date range" />

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm font-semibold text-slate-900">{data.length} incident report{data.length !== 1 ? 's' : ''}</p>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-purple-600" /> Click any row to open full incident report
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Service User', 'Date', 'Time', 'Incident Type', 'Location', 'Description', 'Immediate Action', 'Injuries', 'Reported By', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600 text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((inc: any, i: number) => (
                <tr key={inc.id || i} onClick={() => setSelected(inc)} className="hover:bg-purple-50/50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-semibold text-purple-900 whitespace-nowrap">{inc.service_user || inc.su_name || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap">{inc.date || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{inc.time || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-xs font-semibold">
                      {inc.incident_type || 'Incident'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-700">{inc.location || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-800 max-w-xs truncate">{inc.description || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-700 max-w-xs truncate">{inc.immediate_action || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-700">{inc.injuries || 'No'}</td>
                  <td className="px-4 py-3 text-xs font-medium text-slate-800 whitespace-nowrap">{inc.reported_by || inc.staff_name || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${inc.review_status === 'Reviewed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {inc.review_status || 'Pending review'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <Modal open={true} onClose={() => setSelected(null)} title={`Incident Report — ${selected.service_user || selected.su_name || 'Resident'}`} size="lg">
          <div className="space-y-4 text-slate-800">
            <div className="grid sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div><span className="font-semibold text-slate-500">Service User:</span> <span className="font-semibold text-slate-900">{selected.service_user || selected.su_name || '—'}</span></div>
              <div><span className="font-semibold text-slate-500">Date &amp; Time:</span> <span className="font-semibold text-slate-900">{selected.date || '—'} {selected.time && selected.time !== '—' ? `at ${selected.time}` : ''}</span></div>
              <div><span className="font-semibold text-slate-500">Incident Type:</span> <span className="font-semibold text-slate-900">{selected.incident_type || '—'}</span></div>
              <div><span className="font-semibold text-slate-500">Location:</span> <span className="font-semibold text-slate-900">{selected.location || '—'}</span></div>
              <div><span className="font-semibold text-slate-500">Reported By:</span> <span className="font-semibold text-slate-900">{selected.reported_by || selected.staff_name || '—'}</span></div>
              <div><span className="font-semibold text-slate-500">Review Status:</span> <span className="font-semibold text-slate-900">{selected.review_status || '—'}</span></div>
            </div>

            {[
              ['Incident Description', selected.description],
              ['Immediate Actions Taken', selected.immediate_action],
              ['Injuries Sustained', selected.injuries],
              ['Medical Attention', selected.medical_attention],
              ['Witnesses', selected.witnesses],
              ['Contributing Factors', selected.contributing_factors],
              ['Prevention Actions', selected.prevention_actions],
              ['Manager Review Notes', selected.review_notes],
            ].map(([label, val]) => [label, formatCellValue(val)]).filter(([, txt]) => txt && txt !== '—').map(([label, txt]) => (
              <div key={String(label)} className="border border-slate-200 rounded-xl p-4 bg-white">
                <p className="text-xs font-bold uppercase tracking-wider text-purple-800 mb-1.5">{label}</p>
                <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{txt}</p>
              </div>
            ))}

            <div className="flex justify-end pt-1">
              <Button variant="outline" size="sm" onClick={() => setSelected(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

// ── Video 3: Medication Stock Count Report (actual shift counts by staff + clickable detail modal) ──
function MedicationStockCountReport({ data, currentStock }: { data: any[]; currentStock: any[] }) {
  const [selectedCount, setSelectedCount] = useState<any | null>(null)

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Shift Medication Stock Counts ({data.length})
            </p>
            <p className="text-xs text-slate-500">Medication stock counts completed and recorded by staff on shift</p>
          </div>
          {data.length > 0 && (
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-purple-600" /> Click any row to inspect individual medication counts
            </p>
          )}
        </div>

        {!data.length ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No shift medication stock counts recorded in this date range — widen the From / To dates above to view earlier counts.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Date', 'Shift / Time', 'Service User', 'Completed By', 'Staff on Duty', 'Meds Counted', 'Stock Count Summary'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600 text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((row: any, i: number) => (
                  <tr key={row.id || i} onClick={() => setSelectedCount(row)} className="hover:bg-purple-50/50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 text-xs font-medium text-slate-800 whitespace-nowrap">{row.date}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{row.time}</td>
                    <td className="px-4 py-3 font-semibold text-purple-900 whitespace-nowrap">{row.service_user}</td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-800 whitespace-nowrap">{row.counted_by}</td>
                    <td className="px-4 py-3 text-xs text-slate-700 max-w-[180px] truncate">{row.staff_on_duty}</td>
                    <td className="px-4 py-3 text-xs font-bold text-purple-700 text-center">{row.medications_counted}</td>
                    <td className="px-4 py-3 text-xs text-slate-700 max-w-md truncate">{row.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {currentStock.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
            <p className="text-sm font-semibold text-slate-800">Current Running Medication Balances</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs">Service User</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs">Medication</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs">Current Stock</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs">Reorder Threshold</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs">Last Updated By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentStock.map((s: any, i: number) => (
                <tr key={i} className={s.reorder_threshold != null && s.current_stock <= s.reorder_threshold ? 'bg-rose-50' : 'hover:bg-slate-50'}>
                  <td className="px-4 py-3 font-medium text-slate-900">{s.su_name}</td>
                  <td className="px-4 py-3 text-slate-800">{s.medication_name}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{s.current_stock} {s.unit}</td>
                  <td className="px-4 py-3 text-slate-600">{s.reorder_threshold ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{s.last_updated_by_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedCount && (
        <Modal
          open={true}
          onClose={() => setSelectedCount(null)}
          title={`Medication Stock Count — ${selectedCount.service_user}`}
          size="lg"
        >
          <div className="space-y-4 text-slate-800">
            <div className="grid sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div><span className="font-semibold text-slate-500">Service User:</span> <span className="font-semibold text-slate-900">{selectedCount.service_user}</span></div>
              <div><span className="font-semibold text-slate-500">Date &amp; Shift:</span> <span className="font-semibold text-slate-900">{selectedCount.date} ({selectedCount.time})</span></div>
              <div><span className="font-semibold text-slate-500">Completed By:</span> <span className="font-semibold text-slate-900">{selectedCount.counted_by}</span></div>
              <div><span className="font-semibold text-slate-500">Staff on Duty:</span> <span className="font-semibold text-slate-900">{selectedCount.staff_on_duty}</span></div>
            </div>

            {selectedCount.items && selectedCount.items.length > 0 ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Medication Name</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Strength</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Qty at Hand</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Administered</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Qty Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedCount.items.map((it: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 font-semibold text-slate-900">{it.medicationName}</td>
                        <td className="px-3 py-2 text-slate-700">{it.strength}</td>
                        <td className="px-3 py-2 text-slate-800">{it.quantityAtHand}</td>
                        <td className="px-3 py-2 text-slate-800">{it.quantityAdministered}</td>
                        <td className="px-3 py-2 font-bold text-emerald-700">{it.quantityRemaining}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl p-4 bg-white text-sm whitespace-pre-wrap leading-relaxed">
                {selectedCount.raw_notes || selectedCount.summary}
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedCount(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Videos 4, 5 & 7: Medication Report (MAR Reviews + Resident, Dosage, Route, Start Time, Prescriber — ZERO UUIDs) ──
function MedicationReportView({ medications, marReviews }: { medications: any[]; marReviews: any[] }) {
  const [section, setSection] = useState<'all' | 'reviews' | 'medications'>('all')
  const [selectedReview, setSelectedReview] = useState<any | null>(null)
  const [selectedMed, setSelectedMed] = useState<any | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: `All (${marReviews.length} MAR Reviews · ${medications.length} Active Medications)` },
            { key: 'reviews', label: `Completed MAR Reviews (${marReviews.length})` },
            { key: 'medications', label: `Prescribed Medications (${medications.length})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setSection(tab.key as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${section === tab.key ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-purple-100'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 flex items-center gap-1">
          <Eye className="w-3.5 h-3.5 text-purple-600" /> Click any row to open full clinical detail
        </p>
      </div>

      {/* Section 1: Completed MAR Reviews */}
      {(section === 'all' || section === 'reviews') && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 bg-purple-50/60 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-purple-900">Completed MAR Reviews ({marReviews.length})</p>
              <p className="text-xs text-slate-600">Clinical MAR reviews &amp; chart audits completed across residents</p>
            </div>
          </div>
          {!marReviews.length ? (
            <p className="p-6 text-center text-sm text-slate-500">No completed MAR reviews recorded in this date range — widen the From / To dates above to view earlier reviews.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Review Date', 'Service User', 'Review Type', 'Reviewed By', 'Audit Summary & Findings', 'Action Plan', 'Next Review Due'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600 text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {marReviews.map((rev: any, i: number) => (
                    <tr key={rev.id || i} onClick={() => setSelectedReview(rev)} className="hover:bg-purple-50/50 cursor-pointer transition-colors">
                      <td className="px-4 py-3 text-xs font-medium text-slate-800 whitespace-nowrap">{rev.review_date}</td>
                      <td className="px-4 py-3 font-semibold text-purple-900 whitespace-nowrap">{rev.service_user}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-semibold">{rev.review_type}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-800 whitespace-nowrap">{rev.reviewed_by}</td>
                      <td className="px-4 py-3 text-xs text-slate-700 max-w-xs truncate">{rev.summary_findings}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-xs truncate">{rev.action_plan}</td>
                      <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap">{rev.next_review_due}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Section 2: Active Prescribed Medications Schedule */}
      {(section === 'all' || section === 'medications') && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
            <p className="text-sm font-semibold text-slate-900">Prescribed Medications Schedule ({medications.length})</p>
            <p className="text-xs text-slate-500">Service user, dosage, administration route, start/scheduled time, and prescribing doctor / GP</p>
          </div>
          {!medications.length ? (
            <p className="p-6 text-center text-sm text-slate-500">No active prescribed medications found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Service User', 'Medication', 'Dosage', 'Administration Route', 'Start Time / Schedule', 'Prescriber / GP', 'Last MAR Review'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600 text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {medications.map((m: any, i: number) => (
                    <tr key={m.id || i} onClick={() => setSelectedMed(m)} className="hover:bg-purple-50/50 cursor-pointer transition-colors">
                      <td className="px-4 py-3 font-semibold text-purple-900 whitespace-nowrap">{m.service_user}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{m.medication}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-800">{m.dosage}</td>
                      <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-medium">{m.administration_route}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-800 whitespace-nowrap">{m.start_time}</td>
                      <td className="px-4 py-3 text-xs text-slate-800">{m.prescriber}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{m.last_mar_review}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {selectedReview && (
        <Modal open={true} onClose={() => setSelectedReview(null)} title={`MAR Review — ${selectedReview.service_user}`} size="lg">
          <div className="space-y-4 text-slate-800">
            <div className="grid sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div><span className="font-semibold text-slate-500">Service User:</span> <span className="font-semibold text-slate-900">{selectedReview.service_user}</span></div>
              <div><span className="font-semibold text-slate-500">Review Date:</span> <span className="font-semibold text-slate-900">{selectedReview.review_date}</span></div>
              <div><span className="font-semibold text-slate-500">Reviewed By:</span> <span className="font-semibold text-slate-900">{selectedReview.reviewed_by}</span></div>
              <div><span className="font-semibold text-slate-500">Next Review Due:</span> <span className="font-semibold text-slate-900">{selectedReview.next_review_due}</span></div>
            </div>
            <div className="border border-slate-200 rounded-xl p-4 bg-white">
              <p className="text-xs font-bold uppercase tracking-wider text-purple-800 mb-1.5">Audit Findings &amp; Clinical Notes</p>
              <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{selectedReview.summary_findings}</p>
            </div>
            {selectedReview.action_plan && selectedReview.action_plan !== '—' && (
              <div className="border border-slate-200 rounded-xl p-4 bg-white">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1.5">Action Plan &amp; Follow-Up</p>
                <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{selectedReview.action_plan}</p>
              </div>
            )}
            <div className="flex justify-end"><Button variant="outline" size="sm" onClick={() => setSelectedReview(null)}>Close</Button></div>
          </div>
        </Modal>
      )}

      {selectedMed && (
        <Modal open={true} onClose={() => setSelectedMed(null)} title={selectedMed.medication} size="md">
          <div className="space-y-3 text-slate-800">
            <table className="w-full text-xs border-collapse">
              <tbody>
                {[
                  ['Service User', selectedMed.service_user],
                  ['Medication Name', selectedMed.medication],
                  ['Dosage', selectedMed.dosage],
                  ['Administration Route', selectedMed.administration_route],
                  ['Start Time / Scheduled Slots', selectedMed.start_time],
                  ['Frequency', selectedMed.frequency],
                  ['Start Date', selectedMed.start_date],
                  ['Prescriber / GP Surgery', selectedMed.prescriber],
                  ['Pharmacy', selectedMed.pharmacy],
                  ['Controlled Drug', selectedMed.controlled_drug],
                  ['Indication & Directions', selectedMed.directions_and_indication],
                  ['Latest MAR Review', selectedMed.last_mar_review],
                ].map(([lbl, val]) => (
                  <tr key={String(lbl)} className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-semibold text-slate-600 w-44">{lbl}</td>
                    <td className="py-2 text-slate-900 font-medium">{val || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end pt-2"><Button variant="outline" size="sm" onClick={() => setSelectedMed(null)}>Close</Button></div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Video 9: Delivered Hours Report (exact per-shift clock-in matching + shift-by-shift breakdown modal) ──
function DeliveredHoursReport({ data }: { data: any[] }) {
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null)
  if (!data.length) return <EmptyState title="No delivered hours found" description="No staffed rota shifts found for this date range" />

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">{data.length} staff member{data.length !== 1 ? 's' : ''}</p>
            <p className="text-xs text-slate-500">Shifts due = Clocked in + Not clocked in (future unstarted shifts shown separately)</p>
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-purple-600" /> Click any staff row to inspect individual shifts &amp; clock times
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Staff Member', 'Shifts Due', 'Shifts Clocked In', 'Shifts Not Clocked In', 'Upcoming Shifts', 'Scheduled Hours', 'Delivered Hours', 'Contracted Hrs/Wk'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600 text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((row: any, i: number) => (
                <tr key={i} onClick={() => setSelectedStaff(row)} className="hover:bg-purple-50/50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-semibold text-purple-900 whitespace-nowrap">{row.staff}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">{row.shifts}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-700">{row.shifts_clocked_in}</td>
                  <td className="px-4 py-3 font-semibold">
                    <span className={row.shifts_not_clocked_in > 0 ? 'px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-xs font-bold' : 'text-slate-500'}>
                      {row.shifts_not_clocked_in}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{row.upcoming_shifts ?? 0}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{row.rota_hours} h</td>
                  <td className="px-4 py-3 font-bold text-purple-800">{row.delivered_hours} h</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{row.contracted_hours_per_week ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedStaff && (
        <Modal open={true} onClose={() => setSelectedStaff(null)} title={`Shift Breakdown — ${selectedStaff.staff}`} size="lg">
          <div className="space-y-4 text-slate-800">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-50 border"><p className="text-lg font-bold text-slate-900">{selectedStaff.shifts}</p><p className="text-xs text-slate-500">Shifts Due</p></div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200"><p className="text-lg font-bold text-emerald-700">{selectedStaff.shifts_clocked_in}</p><p className="text-xs text-emerald-700">Clocked In</p></div>
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200"><p className="text-lg font-bold text-rose-700">{selectedStaff.shifts_not_clocked_in}</p><p className="text-xs text-rose-700">Not Clocked In</p></div>
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200"><p className="text-lg font-bold text-purple-800">{selectedStaff.delivered_hours}h</p><p className="text-xs text-purple-700">Delivered Hours</p></div>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-96">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    {['Date', 'Shift', 'Service User', 'Scheduled', 'Clock In', 'Clock Out', 'Delivered', 'Status'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(selectedStaff.shift_breakdown || []).map((sh: any, idx: number) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 font-medium text-slate-900 whitespace-nowrap">{sh.date}</td>
                      <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{sh.shift}</td>
                      <td className="px-3 py-2 text-slate-700">{sh.service_user}</td>
                      <td className="px-3 py-2 text-slate-700">{sh.scheduled_hours}h</td>
                      <td className="px-3 py-2 text-slate-800 font-medium">{sh.clocked_in}</td>
                      <td className="px-3 py-2 text-slate-700">{sh.clocked_out}</td>
                      <td className="px-3 py-2 font-bold text-purple-800">{sh.delivered_hours}h</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full font-semibold ${sh.status === 'Clocked in' ? 'bg-emerald-100 text-emerald-800' : sh.status === 'Upcoming' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'}`}>
                          {sh.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end"><Button variant="outline" size="sm" onClick={() => setSelectedStaff(null)}>Close</Button></div>
          </div>
        </Modal>
      )}
    </>
  )
}

// ── Batch 1 Video 1: Calendar & Appointments Report (clickable read-only detail modal, zero UUIDs) ──
function CalendarReport({ data }: { data: any[] }) {
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null)
  if (!data?.length) return <EmptyState title="No appointments or events found" description="No calendar events match this date range" />

  const fmtTimeRange = (r: any) => {
    const fmtT = (v?: string) => {
      if (!v) return ''
      const d = new Date(v)
      return isNaN(d.getTime()) ? String(v).slice(0, 5) : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })
    }
    const st = fmtT(r.start_time)
    const et = fmtT(r.end_time)
    return st ? `${st}${et ? ` – ${et}` : ''}` : '—'
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
          <p className="font-semibold text-sm text-slate-900">{data.length} appointment{data.length !== 1 ? 's' : ''} / event{data.length !== 1 ? 's' : ''}</p>
          <p className="text-xs text-slate-500 flex items-center gap-1"><Eye className="w-3.5 h-3.5 text-purple-600" /> Click any row to open full appointment details</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-800">
            <thead className="bg-slate-50 border-b border-slate-200 text-left">
              <tr>
                {['Date', 'Time', 'Service User / Staff', 'Appointment / Event', 'Type', 'Location', 'Booked By', 'Outcome / Notes'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((r: any, idx: number) => {
                const summaryText = r.outcome || r.mn_summary || r.mn_notes || r.notes || r.description || '—'
                return (
                  <tr key={r.id || idx} onClick={() => setSelectedEvent(r)} className="hover:bg-purple-50/50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800 whitespace-nowrap">
                      {r.event_date ? format(new Date(r.event_date), 'd MMM yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{fmtTimeRange(r)}</td>
                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                      {r.su_name || r.assigned_staff_name || 'General / All Staff'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-purple-900">{r.title || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 capitalize">
                        {(r.event_type || 'event').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{r.location || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap">{r.created_by_name || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-xs truncate">{summaryText}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedEvent && (
        <Modal open={true} onClose={() => setSelectedEvent(null)} title={selectedEvent.title || 'Appointment Details'} size="lg">
          <div className="space-y-4 text-slate-800">
            <div className="grid sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div><span className="font-semibold text-slate-500">Date &amp; Time:</span> <span className="font-semibold text-slate-900">{selectedEvent.event_date ? format(new Date(selectedEvent.event_date), 'EEEE d MMMM yyyy') : '—'} ({fmtTimeRange(selectedEvent)})</span></div>
              <div><span className="font-semibold text-slate-500">For:</span> <span className="font-semibold text-slate-900">{selectedEvent.su_name || selectedEvent.assigned_staff_name || 'All Staff'}</span></div>
              <div><span className="font-semibold text-slate-500">Location:</span> <span className="font-semibold text-slate-900">{selectedEvent.location || '—'}</span></div>
              <div><span className="font-semibold text-slate-500">Booked By:</span> <span className="font-semibold text-slate-900">{selectedEvent.created_by_name || '—'}</span></div>
            </div>
            {[
              ['Description', selectedEvent.description],
              ['Agenda', selectedEvent.agenda],
              ['Meeting Summary & Outcome', selectedEvent.mn_summary || selectedEvent.outcome],
              ['Notes', selectedEvent.mn_notes || selectedEvent.notes],
              ['Action Plans', selectedEvent.mn_action_points || selectedEvent.action_plans],
              ['Concerns Raised', selectedEvent.mn_concerns || selectedEvent.concerns],
              ['Staff Signed Off', selectedEvent.signed_off_staff],
            ].filter(([, v]) => v && String(v).trim()).map(([lbl, val]) => (
              <div key={String(lbl)} className="border border-slate-200 rounded-xl p-4 bg-white">
                <p className="text-xs font-bold uppercase tracking-wider text-purple-800 mb-1.5">{lbl}</p>
                <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{val}</p>
              </div>
            ))}
            <div className="flex justify-end"><Button variant="outline" size="sm" onClick={() => setSelectedEvent(null)}>Close</Button></div>
          </div>
        </Modal>
      )}
    </>
  )
}

// ── Batch 1 Video 2: Care Plan Compliance (clickable read-only Care Plan document modal) ──
function CarePlanCompliance({ data }: { data: any }) {
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null)
  const plans: any[] = data?.plans || []
  const summary = data?.summary || { total: 0, current: 0, dueSoon: 0, overdue: 0 }
  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="bg-white rounded-xl border p-4 text-center"><p className="text-2xl font-bold text-slate-900">{summary.total ?? 0}</p><p className="text-sm text-slate-500">Total plans</p></div>
        <div className="bg-green-50 rounded-xl border p-4 text-center"><p className="text-2xl font-bold text-green-700">{summary.current ?? 0}</p><p className="text-sm text-slate-500">Current</p></div>
        <div className="bg-orange-50 rounded-xl border p-4 text-center"><p className="text-2xl font-bold text-orange-700">{summary.dueSoon ?? 0}</p><p className="text-sm text-slate-500">Due soon</p></div>
        <div className="bg-red-50 rounded-xl border p-4 text-center"><p className="text-2xl font-bold text-red-700">{summary.overdue ?? 0}</p><p className="text-sm text-slate-500">Overdue</p></div>
      </div>
      {plans.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-10 text-center text-slate-400">
          <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No care plans found for this home</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex justify-end">
            <span className="text-xs text-slate-500 flex items-center gap-1"><Eye className="w-3.5 h-3.5 text-purple-600" /> Click any plan row to read full care plan</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{['Resident', 'Plan type', 'Review frequency', 'Next review', 'Status'].map(h => <th key={h} className="px-4 py-3 text-left font-medium text-slate-600 text-xs">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {plans.map((p: any, i: number) => (
                <tr key={p.id || i} onClick={() => setSelectedPlan(p)} className="hover:bg-purple-50/50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-semibold text-purple-900">{p.su_name}</td>
                  <td className="px-4 py-3 capitalize text-slate-800">{(p.custom_name || p.plan_type || '').replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 capitalize text-slate-700">{(p.review_frequency || '').replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-slate-700">{p.next_review_date ? format(new Date(p.next_review_date), 'd MMM yyyy') : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.review_status === 'overdue' ? 'bg-red-100 text-red-700' : p.review_status === 'due_soon' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                      {(p.review_status || '').replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedPlan && (
        <Modal open={true} onClose={() => setSelectedPlan(null)} title={`${selectedPlan.su_name} — ${(selectedPlan.custom_name || selectedPlan.plan_type || 'Care Plan').replace(/_/g, ' ')}`} size="lg">
          <div className="space-y-4 text-slate-800">
            <div className="grid sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div><span className="font-semibold text-slate-500">Review Frequency:</span> <span className="font-semibold text-slate-900 capitalize">{(selectedPlan.review_frequency || '—').replace(/_/g, ' ')}</span></div>
              <div><span className="font-semibold text-slate-500">Last Reviewed:</span> <span className="font-semibold text-slate-900">{selectedPlan.last_review_date ? format(new Date(selectedPlan.last_review_date), 'd MMM yyyy') : '—'}</span></div>
              <div><span className="font-semibold text-slate-500">Next Review Due:</span> <span className="font-semibold text-slate-900">{selectedPlan.next_review_date ? format(new Date(selectedPlan.next_review_date), 'd MMM yyyy') : '—'}</span></div>
            </div>
            {[
              ['Aims & Desired Outcomes', selectedPlan.aims_outcomes],
              ['What the Person Can Do Independently', selectedPlan.what_i_can_do],
              ['How Staff Should Support', selectedPlan.how_to_support],
              ['Staff Read Sign-Offs', selectedPlan.read_by_staff],
            ].filter(([, v]) => v && String(v).trim()).map(([lbl, val]) => (
              <div key={String(lbl)} className="border border-slate-200 rounded-xl p-4 bg-white">
                <p className="text-xs font-bold uppercase tracking-wider text-purple-800 mb-1.5">{lbl}</p>
                <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{val}</p>
              </div>
            ))}
            <div className="flex justify-end"><Button variant="outline" size="sm" onClick={() => setSelectedPlan(null)}>Close</Button></div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function FluidReport({ data }: { data: any[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-slate-800">
      <table className="w-full text-sm text-slate-800">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>{['Resident', 'Date', 'Total (ml)', 'Target (ml)', 'Status'].map(h => <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600 text-xs">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((r: any, i: number) => (
            <tr key={i} className={r.below_threshold ? 'bg-red-50/30' : ''}>
              <td className="px-4 py-3 font-medium text-slate-900">{r.su_name}</td>
              <td className="px-4 py-3 text-slate-700">{r.record_date ? format(new Date(r.record_date), 'd MMM yyyy') : '—'}</td>
              <td className="px-4 py-3 font-bold text-slate-900">{r.total_ml}ml</td>
              <td className="px-4 py-3 text-slate-700">{r.min_fluid_ml}ml</td>
              <td className="px-4 py-3">
                {r.below_threshold
                  ? <span className="flex items-center gap-1 text-xs text-red-600 font-medium"><AlertTriangle className="w-3 h-3" />Below target</span>
                  : <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle className="w-3 h-3" />On target</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && <p className="text-center text-slate-400 p-8 text-sm">No fluid records in this date range</p>}
    </div>
  )
}

function TrainingCompliance({ data }: { data: any[] }) {
  const [selectedCert, setSelectedCert] = useState<any | null>(null)
  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-slate-900">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm font-semibold text-slate-900">
            {data.length} training record{data.length !== 1 ? 's' : ''}
          </p>
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-purple-600" /> Click any row for certificate details
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-900">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Staff Member', 'Role', 'Course', 'Completed', 'Expiry', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600 text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((r: any, i: number) => (
                <tr key={i} onClick={() => setSelectedCert(r)} className="hover:bg-purple-50/40 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{r.staff_name || '—'}</td>
                  <td className="px-4 py-3 capitalize text-xs text-slate-600 whitespace-nowrap">{(r.role || '').replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{r.course_name || '—'}</td>
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{r.completed_date ? format(new Date(r.completed_date), 'd MMM yyyy') : '—'}</td>
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{r.expiry_date ? format(new Date(r.expiry_date), 'd MMM yyyy') : 'No expiry'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                      r.expiry_status === 'expired'
                        ? 'bg-red-100 text-red-700'
                        : r.expiry_status === 'expiring'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {r.expiry_status || 'current'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.length === 0 && <p className="text-center text-slate-400 p-8 text-sm">No training records found</p>}
      </div>

      {selectedCert && (
        <Modal open={true} onClose={() => setSelectedCert(null)} title={`Training Record — ${selectedCert.staff_name || 'Staff Member'}`} size="md">
          <div className="space-y-3 text-slate-800">
            <table className="w-full text-xs border-collapse">
              <tbody>
                {[
                  ['Staff Member', selectedCert.staff_name],
                  ['Role', (selectedCert.role || '—').replace(/_/g, ' ')],
                  ['Course Name', selectedCert.course_name],
                  ['Completed Date', selectedCert.completed_date ? format(new Date(selectedCert.completed_date), 'd MMM yyyy') : '—'],
                  ['Expiry Date', selectedCert.expiry_date ? format(new Date(selectedCert.expiry_date), 'd MMM yyyy') : 'No expiry'],
                  ['Status', (selectedCert.expiry_status || 'current').toUpperCase()],
                ].map(([lbl, val]) => (
                  <tr key={String(lbl)} className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-semibold text-slate-600 w-40">{lbl}</td>
                    <td className="py-2 text-slate-900 font-medium">{val || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end pt-2"><Button variant="outline" size="sm" onClick={() => setSelectedCert(null)}>Close</Button></div>
          </div>
        </Modal>
      )}
    </>
  )
}

// ── Batch 3 Video 7: Well Being Report (Height + Weight from all clinical sources; Pulse & Temperature removed) ──
function WellbeingReport({ data }: { data: any[] }) {
  if (!data?.length) return <EmptyState title="No well-being records found" description="No resident well-being records match this filter" />
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-slate-900">
      <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm font-semibold text-slate-900">
          Well Being Summary ({data.length} resident{data.length !== 1 ? 's' : ''})
        </p>
        <span className="text-xs text-slate-500">
          Height, Weight, Blood Pressure &amp; Oxygen Saturation per resident
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-slate-900">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Service User', 'Age', 'Height (cm)', 'Weight (kg)', 'Average Blood Pressure', 'Average Oxygen (%)', 'Readings'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600 text-xs whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((r: any, i: number) => (
              <tr key={i} className="hover:bg-purple-50/40 transition-colors">
                <td className="px-4 py-3 font-semibold text-purple-900 whitespace-nowrap">{r.service_user || r.person_supported || '—'}</td>
                <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{r.age ?? '—'}</td>
                <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{r.height_cm || r.height || '—'}</td>
                <td className="px-4 py-3 font-bold text-emerald-800 whitespace-nowrap">{r.weight_kg || r.weight || '—'}</td>
                <td className="px-4 py-3 text-slate-800 whitespace-nowrap">{r.average_blood_pressure || '—'}</td>
                <td className="px-4 py-3 text-slate-800 whitespace-nowrap">{r.average_oxygen_percent || r.average_oxygen || '—'}</td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{r.readings ?? r.readings_recorded ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Batch 3 Video 9: System Activity Report (Zero UUIDs + Specific Human-Readable Action Descriptions + Field Diff Modal) ──
function SystemActivityReport({ data }: { data: any[] }) {
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null)
  const [filterText, setFilterText] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'changes' | 'logins'>('all')

  if (!data?.length) return <EmptyState title="No system activity recorded" description="No staff activity found for the selected date range" />

  const isAuthRow = (r: any) => String(r.module || '').toLowerCase() === 'authentication' || /^signed (in|out)/i.test(String(r.specific_action_and_changes || ''))
  const changesCount = data.filter(r => !isAuthRow(r)).length
  const loginsCount = data.length - changesCount

  const filtered = data.filter(r => {
    if (categoryFilter === 'changes' && isAuthRow(r)) return false
    if (categoryFilter === 'logins' && !isAuthRow(r)) return false
    if (filterText.trim()) {
      const hay = `${r.staff_member || ''} ${r.role || ''} ${r.person_affected || ''} ${r.module || ''} ${r.specific_action_and_changes || ''}`.toLowerCase()
      if (!hay.includes(filterText.trim().toLowerCase())) return false
    }
    return true
  })

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-slate-900">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { key: 'all', label: `All Activity (${data.length})` },
                { key: 'changes', label: `Care & Profile Changes (${changesCount})` },
                { key: 'logins', label: `Sign-Ins (${loginsCount})` },
              ].map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setCategoryFilter(tab.key as any)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                    categoryFilter === tab.key
                      ? 'bg-purple-700 text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">Showing {filtered.length} record{filtered.length !== 1 ? 's' : ''} • Click any row to inspect field-level changes</p>
          </div>
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              className="input pl-9 py-1.5 text-xs w-full"
              placeholder="Search staff, service user, module, action…"
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-900">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Date & Time', 'Staff Member', 'Affected Service User / Staff', 'Module', 'Specific Action & Changes'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600 text-xs whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.slice(0, 1000).map((r: any, i: number) => (
                <tr key={i} onClick={() => setSelectedActivity(r)} className="hover:bg-purple-50/40 cursor-pointer transition-colors">
                  <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{r.date_and_time || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="font-semibold text-slate-900 text-xs">{r.staff_member || 'System'}</p>
                    <p className="text-[11px] text-slate-500 capitalize">{r.role || 'System'}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-purple-900 whitespace-nowrap">{r.person_affected || '—'}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-semibold">{r.module || 'System'}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-800 font-medium max-w-lg">{r.specific_action_and_changes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedActivity && (
        <Modal open={true} onClose={() => setSelectedActivity(null)} title="System Activity Detail" size="lg">
          <div className="space-y-4 text-slate-800">
            <div className="grid sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div><span className="font-semibold text-slate-500">Date &amp; Time:</span> <strong className="text-slate-900">{selectedActivity.date_and_time}</strong></div>
              <div><span className="font-semibold text-slate-500">Performed By:</span> <strong className="text-slate-900">{selectedActivity.staff_member} ({selectedActivity.role})</strong></div>
              <div><span className="font-semibold text-slate-500">Affected Person / Profile:</span> <strong className="text-purple-900">{selectedActivity.person_affected}</strong></div>
              <div><span className="font-semibold text-slate-500">Module:</span> <strong className="text-slate-900">{selectedActivity.module}</strong></div>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 bg-white">
              <p className="text-xs font-bold uppercase tracking-wider text-purple-800 mb-1">Action Summary</p>
              <p className="text-sm font-semibold text-slate-900">{selectedActivity.specific_action_and_changes}</p>
            </div>

            {selectedActivity._changes && selectedActivity._changes.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <table className="w-full text-xs text-slate-800">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold text-slate-600">Field</th>
                      <th className="px-3 py-2 text-left font-bold text-rose-700">Previous Value</th>
                      <th className="px-3 py-2 text-left font-bold text-emerald-700">Updated Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedActivity._changes.map((c: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 font-semibold text-slate-800 capitalize">{c.label || c.field}</td>
                        <td className="px-3 py-2 text-rose-700 bg-rose-50/30 whitespace-pre-wrap">{c.before || '—'}</td>
                        <td className="px-3 py-2 text-emerald-800 bg-emerald-50/30 font-medium whitespace-pre-wrap">{c.after || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end"><Button variant="outline" size="sm" onClick={() => setSelectedActivity(null)}>Close</Button></div>
          </div>
        </Modal>
      )}
    </>
  )
}

// ── Video 8: Incident Analysis (proper response unwrapping, period string safe formatting, clickable incidents) ──
function IncidentAnalysis({ data }: { data: any }) {
  const [selectedInc, setSelectedInc] = useState<any | null>(null)
  if (!data) return <EmptyState title="No analysis available" description="Run the report to generate an analysis of incidents" />

  const payload = data?.incidents !== undefined ? data : (data?.data || {})
  const analysis: string = payload.analysis || ''
  const incidents: any[] = Array.isArray(payload.incidents) ? payload.incidents : []
  const count: number = typeof payload.count === 'number' ? payload.count : incidents.length
  const periodLabel = typeof payload.period === 'object' && payload.period !== null
    ? `${payload.period.from || ''} to ${payload.period.to || ''}`
    : (payload.period || '')

  const formatAnalysis = (text: string) => {
    if (!text) return []
    return text.split(/\n\n+/).filter(Boolean)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl p-4">
        <Brain className="w-5 h-5 text-purple-600 flex-shrink-0" />
        <div>
          <p className="font-semibold text-purple-900 text-sm">Incident Analysis</p>
          <p className="text-xs text-purple-700 mt-0.5">
            {count} incident{count !== 1 ? 's' : ''} analysed{periodLabel ? ` · Period: ${periodLabel}` : ''}
          </p>
        </div>
      </div>

      {analysis && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border-b border-slate-200">
            <TrendingUp className="w-4 h-4 text-slate-600" />
            <span className="font-semibold text-slate-700 text-sm">Quality Assurance Analysis</span>
          </div>
          <div className="px-5 py-4 space-y-4">
            {formatAnalysis(analysis).map((para: string, i: number) => {
              const isHeader = para.startsWith('**') && !para.includes('\n')
              if (isHeader || para.startsWith('#')) {
                const clean = para.replace(/^#+\s*/, '').replace(/\*\*/g, '')
                return <h3 key={i} className="font-semibold text-slate-900 text-sm mt-2">{clean}</h3>
              }
              return (
                <p key={i} className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                  {para.replace(/\*\*(.*?)\*\*/g, '$1')}
                </p>
              )
            })}
          </div>
        </div>
      )}

      {incidents.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <p className="font-semibold text-slate-800 text-sm">Incidents in Period ({incidents.length})</p>
            <span className="text-xs text-slate-500 flex items-center gap-1"><Eye className="w-3.5 h-3.5 text-purple-600" /> Click any row for full incident</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Service User', 'Date', 'Type', 'Location', 'Description', 'Immediate Action / Outcome'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600 text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {incidents.map((inc: any, i: number) => (
                  <tr key={inc.id || i} onClick={() => setSelectedInc(inc)} className="hover:bg-purple-50/50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-semibold text-purple-900 whitespace-nowrap">{inc.su_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap text-xs">
                      {inc.record_date ? format(new Date(inc.record_date), 'd MMM yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium capitalize">
                        {(inc.incident_type || 'incident').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 text-xs">{inc.location || '—'}</td>
                    <td className="px-4 py-3 text-slate-800 max-w-xs truncate text-xs">{inc.description || '—'}</td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs truncate text-xs">{inc.outcome || inc.immediate_action || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedInc && (
        <Modal open={true} onClose={() => setSelectedInc(null)} title={`Incident — ${selectedInc.su_name || 'Resident'}`} size="lg">
          <div className="space-y-4 text-slate-800">
            <div className="border border-slate-200 rounded-xl p-4 bg-white">
              <p className="text-xs font-bold uppercase tracking-wider text-purple-800 mb-1.5">Description</p>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{selectedInc.description || '—'}</p>
            </div>
            {selectedInc.immediate_action && (
              <div className="border border-slate-200 rounded-xl p-4 bg-white">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1.5">Immediate Action</p>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{selectedInc.immediate_action}</p>
              </div>
            )}
            <div className="flex justify-end"><Button variant="outline" size="sm" onClick={() => setSelectedInc(null)}>Close</Button></div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function GenericTable({ data, reportType }: { data: any[]; reportType: string }) {
  const [selectedRow, setSelectedRow] = useState<any | null>(null)
  if (!data.length) return <EmptyState
    title="No records found"
    description={reportType === 'mar-report'
      ? 'No medication administration records for this date range and service — check the From/To dates and the service above, or pick a wider range.'
      : 'No records found for this date range'} />

  const cols = getVisibleColumns(data[0])
  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">
            {data.length} record{data.length !== 1 ? 's' : ''}{data.length > 1000 ? ' — showing first 1,000' : ''}
          </p>
          <span className="text-xs text-slate-500 flex items-center gap-1"><Eye className="w-3.5 h-3.5 text-purple-600" /> Click any row for full view</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {cols.map(c => (
                <th key={c} className="px-4 py-3 text-left font-semibold text-slate-600 text-xs capitalize whitespace-nowrap">
                  {c.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.slice(0, 1000).map((row: any, i: number) => (
              <tr key={i} onClick={() => setSelectedRow(row)} className="hover:bg-purple-50/40 cursor-pointer transition-colors">
                {cols.map(c => (
                  <td key={c} className="px-4 py-3 text-slate-800 max-w-xs truncate">
                    {formatCellValue(row[c]).substring(0, 300)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedRow && (
        <Modal open={true} onClose={() => setSelectedRow(null)} title="Record Details" size="md">
          <div className="space-y-3 text-slate-800">
            <table className="w-full text-xs border-collapse">
              <tbody>
                {cols.map(c => (
                  <tr key={c} className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-semibold text-slate-600 capitalize w-44 align-top">{c.replace(/_/g, ' ')}</td>
                    <td className="py-2 text-slate-900 whitespace-pre-wrap">{formatCellValue(selectedRow[c])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end pt-2"><Button variant="outline" size="sm" onClick={() => setSelectedRow(null)}>Close</Button></div>
          </div>
        </Modal>
      )}
    </>
  )
}
