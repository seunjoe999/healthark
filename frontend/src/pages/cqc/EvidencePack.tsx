import React, { useState, useCallback } from 'react'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format, subMonths } from 'date-fns'
import { Spinner } from '../../components/ui'
import { FileText, Download, RefreshCw, CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp, Printer, Shield, Heart, Users, Star, BarChart2 } from 'lucide-react'

const PERIODS = [
  { label: 'Last 3 months', months: 3 },
  { label: 'Last 6 months', months: 6 },
  { label: 'Last 12 months', months: 12 },
]

function RatingBadge({ count, threshold, label }: { count: number; threshold: number; label?: string }) {
  const good = count >= threshold
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${good ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
      {good ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
      {label || count}
    </span>
  )
}

function StatCard({ label, value, sub, color = '#1e3a5f' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-black" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function Section({ icon, title, color, children, open = true }: { icon: React.ReactNode; title: string; color: string; children: React.ReactNode; open?: boolean }) {
  const [isOpen, setIsOpen] = useState(open)
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-5 print:mb-4">
      <button onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center gap-3 text-left border-b border-slate-100 hover:bg-slate-50 print:cursor-default"
        style={{ background: `${color}08` }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <h2 className="font-bold text-slate-800 text-base flex-1">{title}</h2>
        <div className="print:hidden">{isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}</div>
      </button>
      {isOpen && <div className="p-5">{children}</div>}
    </div>
  )
}

function EvidenceRow({ label, value, status }: { label: string; value: string | number; status?: 'good' | 'warn' | 'bad' }) {
  const icon = status === 'good' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
    : status === 'warn' ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
    : status === 'bad' ? <XCircle className="w-3.5 h-3.5 text-red-600" />
    : null
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      <span className="text-sm font-bold text-slate-800">{value}</span>
    </div>
  )
}

export default function EvidencePack() {
  const { user } = useAuth()
  const [period, setPeriod] = useState(3)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [error, setError] = useState('')

  const generate = useCallback(async () => {
    if (!user?.homeId) return
    setLoading(true)
    setError('')
    try {
      const from = format(subMonths(new Date(), period), 'yyyy-MM-dd')
      const to = format(new Date(), 'yyyy-MM-dd')
      const r = await api.get(`/cqc/evidence-pack?homeId=${user.homeId}&from=${from}&to=${to}`)
      setData(r.data.data)
      setGenerated(true)
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to generate evidence pack')
    } finally { setLoading(false) }
  }, [user, period])

  const d = data

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-700" />
            CQC Evidence Pack
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Auto-generated evidence across all five CQC Key Lines of Enquiry
          </p>
        </div>
        {generated && (
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-2 bg-white print:hidden">
            <Printer className="w-4 h-4" /> Print / PDF
          </button>
        )}
      </div>

      {/* Generator controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 print:hidden">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">Evidence Period</label>
            <div className="flex gap-2">
              {PERIODS.map(p => (
                <button key={p.months} onClick={() => setPeriod(p.months)}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                    period === p.months ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}>{p.label}</button>
              ))}
            </div>
          </div>
          <button onClick={generate} disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-all">
            {loading ? <Spinner size="sm" /> : <RefreshCw className="w-4 h-4" />}
            {loading ? 'Generating…' : generated ? 'Regenerate' : 'Generate Pack'}
          </button>
        </div>
        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Spinner />
          <p className="text-slate-500 text-sm">Gathering evidence across all records…</p>
        </div>
      )}

      {!loading && generated && d && (
        <>
          {/* Print header */}
          <div className="hidden print:block mb-6 pb-4 border-b-2 border-slate-200">
            <h1 className="text-2xl font-black text-slate-900">CQC Evidence Pack</h1>
            <p className="text-slate-500">{d.homeName} · Generated {format(new Date(), 'd MMMM yyyy')} · Period: {d.from} to {d.to}</p>
          </div>

          {/* Overview stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatCard label="Residents" value={d.overview.residentCount} sub="Active" color="#1e3a5f" />
            <StatCard label="Staff" value={d.overview.staffCount} sub="Active" color="#7c3aed" />
            <StatCard label="Records" value={d.overview.dailyRecordsCount} sub={`Last ${period} months`} color="#059669" />
            <StatCard label="Incidents" value={d.overview.incidentCount} sub={`Last ${period} months`} color={d.overview.incidentCount > 20 ? '#dc2626' : '#d97706'} />
          </div>

          {/* ── SAFE ── */}
          <Section icon={<Shield className="w-4 h-4" />} title="SAFE — People are protected from abuse and avoidable harm" color="#dc2626">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Incidents & Safeguarding</p>
                <EvidenceRow label="Total incidents in period" value={d.safe.incidentCount} status={d.safe.incidentCount < 10 ? 'good' : 'warn'} />
                <EvidenceRow label="Safeguarding referrals" value={d.safe.safeguardingCount} />
                <EvidenceRow label="High severity incidents" value={d.safe.highSeverityCount} status={d.safe.highSeverityCount === 0 ? 'good' : 'warn'} />
                <EvidenceRow label="Falls incidents" value={d.safe.fallsCount} />
                <EvidenceRow label="Medication errors" value={d.safe.medicationErrorCount} status={d.safe.medicationErrorCount === 0 ? 'good' : 'bad'} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Staffing & Compliance</p>
                <EvidenceRow label="DBS checks on file" value={`${d.safe.dbsCount} / ${d.overview.staffCount}`}
                  status={d.safe.dbsCount >= d.overview.staffCount ? 'good' : 'bad'} />
                <EvidenceRow label="Risk assessments completed" value={d.safe.riskAssessmentCount} status={d.safe.riskAssessmentCount > 0 ? 'good' : 'warn'} />
                <EvidenceRow label="MAR records this period" value={d.safe.marCount} status={d.safe.marCount > 0 ? 'good' : 'warn'} />
                <EvidenceRow label="PPE stock checks" value={d.safe.ppeCount} />
                <EvidenceRow label="Lessons learned recorded" value={d.safe.lessonsLearnedCount} />
              </div>
            </div>
            {d.safe.recentIncidents?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Recent Incidents</p>
                <div className="space-y-2">
                  {d.safe.recentIncidents.slice(0, 5).map((i: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 text-sm text-slate-600 py-1">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${i.severity === 'critical' || i.severity === 'serious' ? 'bg-red-500' : 'bg-amber-400'}`} />
                      <span className="flex-1">{i.incident_type} — {i.description?.slice(0, 80)}{i.description?.length > 80 ? '…' : ''}</span>
                      <span className="text-slate-400 text-xs whitespace-nowrap">{i.incident_date ? format(new Date(i.incident_date), 'd MMM') : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* ── EFFECTIVE ── */}
          <Section icon={<Star className="w-4 h-4" />} title="EFFECTIVE — People's care achieves good outcomes" color="#7c3aed">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Clinical Assessments</p>
                <EvidenceRow label="Barthel Index scores" value={d.effective.barthelCount} status={d.effective.barthelCount > 0 ? 'good' : 'warn'} />
                <EvidenceRow label="MUST scores" value={d.effective.mustCount} status={d.effective.mustCount > 0 ? 'good' : 'warn'} />
                <EvidenceRow label="NEWS2 scores" value={d.effective.news2Count} status={d.effective.news2Count > 0 ? 'good' : 'warn'} />
                <EvidenceRow label="Waterlow assessments" value={d.effective.waterlowCount} status={d.effective.waterlowCount > 0 ? 'good' : 'warn'} />
                <EvidenceRow label="Wound care records" value={d.effective.woundCareCount} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Care Planning</p>
                <EvidenceRow label="Active care plans" value={d.effective.carePlanCount} status={d.effective.carePlanCount > 0 ? 'good' : 'bad'} />
                <EvidenceRow label="Care plan reviews" value={d.effective.carePlanReviewCount} status={d.effective.carePlanReviewCount > 0 ? 'good' : 'warn'} />
                <EvidenceRow label="Weight records" value={d.effective.weightCount} status={d.effective.weightCount > 0 ? 'good' : 'warn'} />
                <EvidenceRow label="Fluid balance records" value={d.effective.fluidCount} />
                <EvidenceRow label="Hospital admissions" value={d.effective.hospitalCount} />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Training &amp; Development</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatCard label="Training completions" value={d.effective.trainingCount} color="#7c3aed" />
                <StatCard label="Supervisions" value={d.effective.supervisionCount} color="#7c3aed" />
                <StatCard label="Mandatory compliance" value={d.effective.trainingCompliancePct != null ? `${d.effective.trainingCompliancePct}%` : '—'} color={d.effective.trainingCompliancePct >= 80 ? '#059669' : '#dc2626'} />
                <StatCard label="Audits completed" value={d.effective.auditCount} color="#7c3aed" />
              </div>
            </div>
          </Section>

          {/* ── CARING ── */}
          <Section icon={<Heart className="w-4 h-4" />} title="CARING — Staff involve and treat people with compassion and dignity" color="#db2777">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Person-Centred Care</p>
                <EvidenceRow label="Daily care records" value={d.caring.dailyRecordsCount} status={d.caring.dailyRecordsCount > 0 ? 'good' : 'bad'} />
                <EvidenceRow label="Personal care entries" value={d.caring.personalCareCount} status={d.caring.personalCareCount > 0 ? 'good' : 'warn'} />
                <EvidenceRow label="Social activity records" value={d.caring.socialActivitiesCount} status={d.caring.socialActivitiesCount > 0 ? 'good' : 'warn'} />
                <EvidenceRow label="Resident diary entries" value={d.caring.diaryCount} />
                <EvidenceRow label="Consents recorded" value={d.caring.consentsCount} status={d.caring.consentsCount > 0 ? 'good' : 'warn'} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Communication &amp; Engagement</p>
                <EvidenceRow label="Family portal residents" value={d.caring.familyPortalCount} status={d.caring.familyPortalCount > 0 ? 'good' : 'warn'} />
                <EvidenceRow label="Professional visit records" value={d.caring.profVisitsCount} />
                <EvidenceRow label="Observations logged" value={d.caring.observationsCount} />
                <EvidenceRow label="Noticeboard posts" value={d.caring.noticeboardCount} />
                <EvidenceRow label="Bath chart entries" value={d.caring.bathChartCount} />
              </div>
            </div>
          </Section>

          {/* ── RESPONSIVE ── */}
          <Section icon={<Users className="w-4 h-4" />} title="RESPONSIVE — Services are organised to meet people's needs" color="#0891b2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Complaints &amp; Reviews</p>
                <EvidenceRow label="Complaints received" value={d.responsive.complaintsCount} />
                <EvidenceRow label="Compliments received" value={d.responsive.complimentsCount} />
                <EvidenceRow label="Care reviews" value={d.responsive.reviewsCount} status={d.responsive.reviewsCount > 0 ? 'good' : 'warn'} />
                <EvidenceRow label="Outcomes recorded" value={d.responsive.outcomesCount} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Service Access</p>
                <EvidenceRow label="Hospital admissions" value={d.responsive.hospitalCount} />
                <EvidenceRow label="Waiting list entries" value={d.responsive.waitingListCount} />
                <EvidenceRow label="Tasks completed" value={d.responsive.tasksCount} status={d.responsive.tasksCount > 0 ? 'good' : 'warn'} />
                <EvidenceRow label="Maintenance requests" value={d.responsive.maintenanceCount} />
              </div>
            </div>
          </Section>

          {/* ── WELL-LED ── */}
          <Section icon={<BarChart2 className="w-4 h-4" />} title="WELL-LED — Leadership promotes a positive culture" color="#059669">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Governance &amp; Oversight</p>
                <EvidenceRow label="Policies signed off" value={d.wellLed.policiesCount} status={d.wellLed.policiesCount > 0 ? 'good' : 'warn'} />
                <EvidenceRow label="Audits completed" value={d.wellLed.auditCount} status={d.wellLed.auditCount > 0 ? 'good' : 'warn'} />
                <EvidenceRow label="Compliance checks" value={d.wellLed.complianceCount} />
                <EvidenceRow label="CQC notifications sent" value={d.wellLed.cqcNotifCount} />
                <EvidenceRow label="Lessons learned" value={d.wellLed.lessonsLearnedCount} status={d.wellLed.lessonsLearnedCount > 0 ? 'good' : 'warn'} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Workforce</p>
                <EvidenceRow label="Staff supervisions" value={d.wellLed.supervisionCount} status={d.wellLed.supervisionCount > 0 ? 'good' : 'warn'} />
                <EvidenceRow label="DBS checks current" value={d.wellLed.dbsCount} />
                <EvidenceRow label="Staff absence records" value={d.wellLed.absenceCount} />
                <EvidenceRow label="Rota entries" value={d.wellLed.rotaCount} status={d.wellLed.rotaCount > 0 ? 'good' : 'warn'} />
                <EvidenceRow label="Clock-in records" value={d.wellLed.clockinCount} status={d.wellLed.clockinCount > 0 ? 'good' : 'warn'} />
              </div>
            </div>
          </Section>

          {/* Footer */}
          <div className="text-center text-xs text-slate-400 mt-6 mb-2">
            Generated by CompCare Hub · {d.homeName} · {format(new Date(), 'd MMMM yyyy HH:mm')} · Period: {d.from} to {d.to}
          </div>
        </>
      )}

      {!loading && !generated && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <FileText className="w-14 h-14 mx-auto mb-4 text-slate-300" />
          <h2 className="text-lg font-bold text-slate-700 mb-2">Generate Your Evidence Pack</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Select a time period above and click Generate. CompCare Hub will pull data from every module —
            incidents, care plans, training, audits, assessments — and present it as structured CQC evidence
            across Safe, Effective, Caring, Responsive, and Well-Led.
          </p>
        </div>
      )}
    </div>
  )
}
