import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { format, differenceInYears } from 'date-fns'
import {
  Heart, Phone, Calendar, FileText, Loader2, AlertTriangle,
  Pill, ClipboardList, Shield, User, Activity, CheckCircle,
  Droplets, Utensils, Star, Info, ChevronDown, ChevronUp
} from 'lucide-react'

const bgStyle = { minHeight: '100vh', background: 'linear-gradient(135deg, #0d1526 0%, #151f35 40%, #1e2d4a 100%)' }
const cardStyle = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }
const lightCardStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }

const RISK_COLORS: Record<string, string> = {
  high: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
  medium: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  low: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
}

const RECORD_LABELS: Record<string, string> = {
  personal_care: 'Personal Care',
  food_intake: 'Food & Nutrition',
  fluid: 'Fluid Intake',
  fluids: 'Fluid Intake',
  blood_pressure: 'Blood Pressure',
  weight: 'Weight',
  temperature: 'Temperature',
  oxygen_saturation: 'Oxygen Saturation',
  pulse: 'Pulse / Heart Rate',
  vital_signs: 'Vital Signs',
  incident: 'Incident',
  skin: 'Skin / Pressure Care',
  body_map: 'Body Map',
  repositioning: 'Repositioning',
  continence: 'Continence',
  activity: 'Activity',
  communication: 'Communication',
  sleep: 'Sleep',
  mood: 'Mood & Wellbeing',
  medication: 'Medication',
  handover: 'Handover Note',
  general: 'General Note',
}

function Section({ title, icon, children, defaultOpen = true }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-2xl overflow-hidden mb-4" style={cardStyle}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-amber-400">{icon}</span>
          <h2 className="text-white font-semibold text-sm tracking-wide uppercase">{title}</h2>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | null | boolean }) {
  if (value === null || value === undefined || value === '' || value === false) return null
  return (
    <div className="flex gap-3 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-slate-500 text-xs w-36 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-slate-200 text-sm flex-1">{typeof value === 'boolean' ? 'Yes' : value}</span>
    </div>
  )
}

export default function FamilyView() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    fetch(`/api/family/${token}`)
      .then(r => r.json())
      .then(json => {
        if (!json.success) { setError(json.error || 'Not found'); return }
        setData(json.data)
      })
      .catch(() => setError('Could not load resident information'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div style={bgStyle} className="flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
      </div>
    )
  }

  if (error || !data?.resident) {
    return (
      <div style={bgStyle} className="flex items-center justify-center p-6">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-white text-xl font-semibold mb-2">Link not found</h2>
          <p className="text-slate-400 text-sm">{error || 'This family portal link is invalid or has expired.'}</p>
        </div>
      </div>
    )
  }

  const { resident, records = [], medications = [], carePlans = [], riskAssessments = [] } = data
  const name = resident.preferred_name || `${resident.first_name} ${resident.last_name}`
  const age = resident.date_of_birth ? differenceInYears(new Date(), new Date(resident.date_of_birth)) : null
  const initials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()

  // Group records by date
  const recordsByDate: Record<string, any[]> = {}
  records.forEach((r: any) => {
    const d = r.record_date ? format(new Date(r.record_date), 'yyyy-MM-dd') : 'unknown'
    if (!recordsByDate[d]) recordsByDate[d] = []
    recordsByDate[d].push(r)
  })
  const sortedDates = Object.keys(recordsByDate).sort((a, b) => b.localeCompare(a))

  const regularMeds = medications.filter((m: any) => !m.is_prn)
  const prnMeds = medications.filter((m: any) => m.is_prn)

  const hasAlerts = resident.dnar || resident.nil_by_mouth || resident.requires_oxygen || resident.has_catheter || resident.has_peg

  return (
    <div style={bgStyle} className="py-8 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-6">
          <img src="/logo.jpeg" alt="CompCare Hub" className="w-10 h-10 rounded-xl mx-auto mb-2 shadow-lg object-contain" style={{ background: 'white', padding: '3px' }} />
          <p className="text-slate-500 text-xs uppercase tracking-widest">Family Care Portal</p>
          <p className="text-slate-600 text-xs mt-0.5">Report generated {format(new Date(), 'd MMMM yyyy')}</p>
        </div>

        {/* Resident hero card */}
        <div className="rounded-3xl p-6 mb-4" style={cardStyle}>
          <div className="flex items-center gap-5 mb-5">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-slate-900 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)' }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-white text-2xl font-bold leading-tight">{name}</h1>
              <p className="text-slate-400 text-sm flex items-center gap-1.5 mt-1">
                <Heart className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                {resident.home_name}
              </p>
              {resident.home_phone && (
                <a href={`tel:${resident.home_phone}`} className="text-amber-400 text-sm flex items-center gap-1.5 mt-0.5 hover:text-amber-300">
                  <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                  {resident.home_phone}
                </a>
              )}
            </div>
          </div>

          {/* Key stats row */}
          <div className="grid grid-cols-3 gap-3">
            {age && (
              <div className="rounded-xl p-3 text-center" style={lightCardStyle}>
                <p className="text-white text-lg font-bold">{age}</p>
                <p className="text-slate-500 text-xs">Years old</p>
              </div>
            )}
            {medications.length > 0 && (
              <div className="rounded-xl p-3 text-center" style={lightCardStyle}>
                <p className="text-white text-lg font-bold">{medications.length}</p>
                <p className="text-slate-500 text-xs">Medication{medications.length !== 1 ? 's' : ''}</p>
              </div>
            )}
            {carePlans.length > 0 && (
              <div className="rounded-xl p-3 text-center" style={lightCardStyle}>
                <p className="text-white text-lg font-bold">{carePlans.length}</p>
                <p className="text-slate-500 text-xs">Care plan{carePlans.length !== 1 ? 's' : ''}</p>
              </div>
            )}
          </div>
        </div>

        {/* Medical alerts */}
        {hasAlerts && (
          <div className="rounded-2xl p-4 mb-4 bg-rose-900/30 border border-rose-500/30">
            <p className="text-rose-300 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" /> Medical Alerts
            </p>
            <div className="flex flex-wrap gap-2">
              {resident.dnar && (
                <span className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 border border-rose-500">
                  DNAR — Do Not Attempt Resuscitation
                </span>
              )}
              {resident.nil_by_mouth && (
                <span className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-300 border border-rose-500/50 bg-rose-500/20">
                  Nil By Mouth
                </span>
              )}
              {resident.requires_oxygen && (
                <span className="px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-300 border border-amber-500/50 bg-amber-500/20">
                  Requires Oxygen
                </span>
              )}
              {resident.has_catheter && (
                <span className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 border border-slate-500/50 bg-slate-500/20">
                  Catheter
                </span>
              )}
              {resident.has_peg && (
                <span className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 border border-slate-500/50 bg-slate-500/20">
                  PEG Feed
                </span>
              )}
            </div>
          </div>
        )}

        {/* Personal information */}
        <Section title="Personal Information" icon={<User className="w-4 h-4" />}>
          <div className="divide-y divide-white/5">
            <InfoRow label="Full name" value={`${resident.first_name} ${resident.last_name}`} />
            {resident.preferred_name && <InfoRow label="Preferred name" value={resident.preferred_name} />}
            <InfoRow label="Date of birth" value={resident.date_of_birth ? format(new Date(resident.date_of_birth), 'd MMMM yyyy') : null} />
            <InfoRow label="Age" value={age ? `${age} years` : null} />
            <InfoRow label="Gender" value={resident.gender} />
            <InfoRow label="NHS number" value={resident.nhs_number} />
            <InfoRow label="Admitted" value={resident.admission_date ? format(new Date(resident.admission_date), 'd MMMM yyyy') : null} />
            <InfoRow label="Home" value={resident.home_name} />
            {resident.home_address && <InfoRow label="Address" value={resident.home_address} />}
            <InfoRow label="Height" value={resident.height_cm ? `${resident.height_cm} cm` : null} />
            <InfoRow label="Weight" value={resident.weight_kg ? `${resident.weight_kg} kg` : null} />
          </div>
        </Section>

        {/* Medical information */}
        {(resident.medical_history || resident.med_allergies || resident.food_allergies || resident.special_diet) && (
          <Section title="Medical Information" icon={<Activity className="w-4 h-4" />}>
            <div className="divide-y divide-white/5">
              <InfoRow label="Medical history" value={resident.medical_history} />
              <InfoRow label="Medication allergies" value={resident.med_allergies} />
              <InfoRow label="Food allergies" value={resident.food_allergies} />
              <InfoRow label="Special diet" value={resident.special_diet} />
              <InfoRow label="Fluid consistency" value={resident.fluid_consistency} />
              {resident.min_fluid_ml && <InfoRow label="Minimum fluids/day" value={`${resident.min_fluid_ml} ml`} />}
              {resident.diet_instructions && <InfoRow label="Diet instructions" value={resident.diet_instructions} />}
            </div>
          </Section>
        )}

        {/* Need to know */}
        {resident.need_to_know && (
          <Section title="Important Information" icon={<Star className="w-4 h-4" />}>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{resident.need_to_know}</p>
          </Section>
        )}

        {/* Medications */}
        {medications.length > 0 && (
          <Section title={`Current Medications (${medications.length})`} icon={<Pill className="w-4 h-4" />}>
            {regularMeds.length > 0 && (
              <>
                <p className="text-slate-500 text-xs uppercase tracking-wider mb-3 font-semibold">Regular</p>
                <div className="space-y-2 mb-4">
                  {regularMeds.map((med: any, i: number) => (
                    <div key={i} className="rounded-xl p-3" style={lightCardStyle}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-white text-sm font-semibold">{med.medication_name}</p>
                        {med.dose && <span className="text-amber-400 text-xs font-semibold flex-shrink-0">{med.dose}</span>}
                      </div>
                      <div className="flex gap-3 mt-1 text-xs text-slate-400">
                        {med.frequency && <span>{med.frequency}</span>}
                        {med.route && <span>· {med.route}</span>}
                        {med.prescribed_by && <span>· Dr. {med.prescribed_by}</span>}
                      </div>
                      {med.instructions && <p className="text-slate-400 text-xs mt-1.5 italic">{med.instructions}</p>}
                    </div>
                  ))}
                </div>
              </>
            )}
            {prnMeds.length > 0 && (
              <>
                <p className="text-slate-500 text-xs uppercase tracking-wider mb-3 font-semibold">PRN (As Required)</p>
                <div className="space-y-2">
                  {prnMeds.map((med: any, i: number) => (
                    <div key={i} className="rounded-xl p-3 border border-amber-500/20" style={{ background: 'rgba(234,179,8,0.05)' }}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-white text-sm font-semibold">{med.medication_name}</p>
                        <span className="text-amber-400 text-xs font-bold flex-shrink-0 px-2 py-0.5 rounded-full bg-amber-500/15">PRN</span>
                      </div>
                      <div className="flex gap-3 mt-1 text-xs text-slate-400">
                        {med.dose && <span>{med.dose}</span>}
                        {med.route && <span>· {med.route}</span>}
                      </div>
                      {med.instructions && <p className="text-slate-400 text-xs mt-1.5 italic">{med.instructions}</p>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </Section>
        )}

        {/* Care Plans */}
        {carePlans.length > 0 && (
          <Section title={`Care Plans (${carePlans.length})`} icon={<ClipboardList className="w-4 h-4" />}>
            <div className="space-y-2">
              {carePlans.map((cp: any, i: number) => {
                const isOverdue = cp.next_review_date && new Date(cp.next_review_date) < new Date()
                const isDueSoon = !isOverdue && cp.next_review_date && new Date(cp.next_review_date) < new Date(Date.now() + 7 * 86400000)
                return (
                  <div key={i} className="rounded-xl p-3 flex items-start justify-between gap-3" style={lightCardStyle}>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-200 text-sm font-medium">
                        {cp.custom_name || cp.plan_type?.replace(/_/g, ' ')}
                      </p>
                      {cp.aims_outcomes && (
                        <p className="text-slate-500 text-xs mt-1 line-clamp-2">{cp.aims_outcomes}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      {isOverdue ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">Overdue</span>
                      ) : isDueSoon ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">Due soon</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Current</span>
                      )}
                      {cp.next_review_date && (
                        <p className="text-slate-600 text-xs mt-0.5">
                          Review: {format(new Date(cp.next_review_date), 'd MMM yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>
        )}

        {/* Risk Assessments */}
        {riskAssessments.length > 0 && (
          <Section title={`Risk Assessments (${riskAssessments.length})`} icon={<Shield className="w-4 h-4" />}>
            <div className="space-y-2">
              {riskAssessments.map((ra: any, i: number) => (
                <div key={i} className="rounded-xl p-3 flex items-center justify-between gap-3" style={lightCardStyle}>
                  <p className="text-slate-200 text-sm font-medium flex-1">{ra.assessment_name}</p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {ra.risk_level && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${RISK_COLORS[ra.risk_level] || 'bg-slate-500/20 text-slate-300'}`}>
                        {ra.risk_level}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Daily life */}
        {(resident.hobbies || resident.daily_routine || resident.my_instructions) && (
          <Section title="Daily Life & Preferences" icon={<Info className="w-4 h-4" />} defaultOpen={false}>
            {resident.daily_routine && (
              <div className="mb-4">
                <p className="text-slate-500 text-xs uppercase tracking-wider mb-2 font-semibold">Daily Routine</p>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{resident.daily_routine}</p>
              </div>
            )}
            {resident.hobbies && (
              <div className="mb-4">
                <p className="text-slate-500 text-xs uppercase tracking-wider mb-2 font-semibold">Hobbies & Interests</p>
                <p className="text-slate-300 text-sm leading-relaxed">{resident.hobbies}</p>
              </div>
            )}
            {resident.my_instructions && (
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wider mb-2 font-semibold">Care Instructions</p>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{resident.my_instructions}</p>
              </div>
            )}
          </Section>
        )}

        {/* Recent care notes */}
        <Section title="Recent Care Notes (Last 14 Days)" icon={<FileText className="w-4 h-4" />} defaultOpen={false}>
          {sortedDates.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">No recent records to display</p>
          ) : (
            <div className="space-y-4">
              {sortedDates.map(date => (
                <div key={date}>
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(new Date(date), 'EEEE, d MMMM yyyy')}
                  </p>
                  <div className="space-y-1.5 ml-1">
                    {recordsByDate[date].map((r: any, i: number) => (
                      <div key={i} className="rounded-xl p-3" style={lightCardStyle}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                            {RECORD_LABELS[r.record_type] || r.record_type?.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-slate-600">
                            {r.shift ? r.shift.charAt(0).toUpperCase() + r.shift.slice(1) + ' shift' : ''}
                            {r.staff_name ? ` · ${r.staff_name}` : ''}
                          </span>
                        </div>
                        {r.notes && <p className="text-slate-300 text-sm leading-relaxed">{r.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Footer */}
        <div className="text-center mt-6 mb-2">
          <p className="text-slate-700 text-xs">Confidential — For authorised family members only</p>
          <p className="text-slate-700 text-xs mt-0.5">Powered by CompCare Hub · {format(new Date(), 'd MMM yyyy')}</p>
        </div>
      </div>
    </div>
  )
}
