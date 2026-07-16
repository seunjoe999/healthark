import React, { useEffect, useState } from 'react'
import { format, isToday, parseISO } from 'date-fns'
import {
  Pill, Heart, Coffee, AlertTriangle, Eye, Activity, FileText, Droplets
} from 'lucide-react'
import api from '../../api'

interface TimelineEvent {
  id: string
  time: string // HH:mm
  type: 'medication' | 'personal_care' | 'food_fluid' | 'incident' | 'observation' | 'activity' | 'other'
  label: string
  details: string
  rawTime: string // ISO or comparable
}

interface Props {
  suId: string
  suName: string
  date?: string
}

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd')
}

function toHHMM(ts?: string | null): string {
  if (!ts) return '--:--'
  try {
    const d = new Date(ts)
    if (isNaN(d.getTime())) return ts.slice(0, 5)
    return format(d, 'HH:mm')
  } catch {
    return '--:--'
  }
}

function getSortTime(record: any): string {
  return (
    record.created_at ||
    record.record_date ||
    record.administered_at ||
    record.incident_date ||
    ''
  )
}

function classifyDailyRecord(r: any): Omit<TimelineEvent, 'id' | 'time' | 'rawTime'> {
  const category = (r.category || r.record_type || '').toLowerCase()
  if (category.includes('personal') || category.includes('hygiene') || category.includes('bath') || category.includes('wash')) {
    return {
      type: 'personal_care',
      label: 'Personal Care',
      details: r.notes || r.description || category || 'Personal care recorded',
    }
  }
  if (category.includes('food') || category.includes('fluid') || category.includes('meal') || category.includes('drink') || category.includes('nutrition')) {
    return {
      type: 'food_fluid',
      label: 'Food & Fluid',
      details: r.notes || r.description || `${r.amount_ml ? r.amount_ml + 'ml' : ''} ${r.food_type || ''}`.trim() || 'Intake recorded',
    }
  }
  if (category.includes('observation') || category.includes('vital') || category.includes('bp') || category.includes('pulse') || category.includes('temperature')) {
    return {
      type: 'observation',
      label: 'Observation',
      details: r.notes || r.description || 'Observation recorded',
    }
  }
  if (category.includes('activity') || category.includes('social') || category.includes('exercise')) {
    return {
      type: 'activity',
      label: 'Activity',
      details: r.notes || r.description || 'Activity recorded',
    }
  }
  return {
    type: 'other',
    label: r.record_type || r.category || 'Care Record',
    details: r.notes || r.description || 'Record added',
  }
}

function parseEvents(dailyRecords: any[], marRecords: any[], incidents: any[]): TimelineEvent[] {
  const events: TimelineEvent[] = []

  for (const r of dailyRecords) {
    const rawTime = getSortTime(r)
    const classified = classifyDailyRecord(r)
    events.push({
      id: `dr-${r.id}`,
      time: toHHMM(rawTime),
      rawTime,
      ...classified,
    })
  }

  for (const r of marRecords) {
    const rawTime = r.administered_at || r.created_at || ''
    const scheduledTime = r.scheduled_time ? toHHMM(r.scheduled_time) : ''
    const timeDisplay = rawTime ? toHHMM(rawTime) : scheduledTime || '--:--'
    const status = r.status || r.administered_status || ''
    const statusLabel = status === 'given' ? 'Given' : status === 'refused' ? 'Refused' : status === 'withheld' ? 'Withheld' : status || 'Recorded'
    events.push({
      id: `mar-${r.id}`,
      time: timeDisplay,
      rawTime: rawTime || r.scheduled_time || '',
      type: 'medication',
      label: 'Medication',
      details: `${r.medication_name || r.med_name || 'Medication'} — ${statusLabel}${r.dose ? ' · ' + r.dose : ''}`,
    })
  }

  for (const r of incidents) {
    const rawTime = r.created_at || r.incident_date || ''
    events.push({
      id: `inc-${r.id}`,
      time: toHHMM(rawTime),
      rawTime,
      type: 'incident',
      label: 'Incident',
      details: r.incident_type || r.description || r.notes || 'Incident reported',
    })
  }

  // Sort by rawTime ascending (ISO strings sort lexicographically)
  events.sort((a, b) => {
    if (!a.rawTime) return 1
    if (!b.rawTime) return -1
    return a.rawTime < b.rawTime ? -1 : a.rawTime > b.rawTime ? 1 : 0
  })

  return events
}

const TYPE_CONFIG: Record<TimelineEvent['type'], { color: string; dot: string; Icon: React.FC<{ className?: string }> }> = {
  medication: {
    color: 'bg-blue-900/40 border-blue-500/30 text-blue-100',
    dot: 'bg-blue-500',
    Icon: Pill,
  },
  personal_care: {
    color: 'bg-purple-900/40 border-purple-500/30 text-purple-100',
    dot: 'bg-purple-500',
    Icon: Heart,
  },
  food_fluid: {
    color: 'bg-green-900/40 border-green-500/30 text-green-100',
    dot: 'bg-green-500',
    Icon: Droplets,
  },
  incident: {
    color: 'bg-red-900/40 border-red-500/30 text-red-100',
    dot: 'bg-red-500',
    Icon: AlertTriangle,
  },
  observation: {
    color: 'bg-amber-900/40 border-amber-500/30 text-amber-100',
    dot: 'bg-amber-500',
    Icon: Eye,
  },
  activity: {
    color: 'bg-teal-900/40 border-teal-500/30 text-teal-100',
    dot: 'bg-teal-500',
    Icon: Activity,
  },
  other: {
    color: 'bg-slate-800/60 border-slate-600/30 text-slate-300',
    dot: 'bg-slate-500',
    Icon: FileText,
  },
}

function SkeletonCard() {
  return (
    <div className="flex gap-4 animate-pulse">
      <div className="flex flex-col items-center gap-1 flex-shrink-0" style={{ width: 48 }}>
        <div className="w-10 h-5 rounded bg-slate-700" />
      </div>
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-3 h-3 rounded-full bg-slate-600 mt-1" />
        <div className="w-0.5 flex-1 bg-slate-700 mt-1" />
      </div>
      <div className="flex-1 mb-4">
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 space-y-2">
          <div className="h-4 bg-slate-700 rounded w-1/3" />
          <div className="h-3 bg-slate-700 rounded w-2/3" />
        </div>
      </div>
    </div>
  )
}

export default function ResidentTimeline({ suId, suName, date: dateProp }: Props) {
  const [date, setDate] = useState(dateProp || todayStr())
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!suId) return
    setLoading(true)
    setError(null)

    Promise.allSettled([
      api.get(`/daily-records`, { params: { suId, date } }),
      api.get(`/mar/records/${suId}`, { params: { date } }),
      api.get(`/incidents`, { params: { suId, date } }),
    ]).then(([dailyRes, marRes, incRes]) => {
      const daily = dailyRes.status === 'fulfilled'
        ? (dailyRes.value.data?.data || dailyRes.value.data || [])
        : []
      const mar = marRes.status === 'fulfilled'
        ? (marRes.value.data?.data || marRes.value.data || [])
        : []
      const rawIncidents = incRes.status === 'fulfilled'
        ? (incRes.value.data?.data || incRes.value.data || [])
        : []

      // Filter incidents to this date if backend doesn't
      const incidents = Array.isArray(rawIncidents) ? rawIncidents.filter((inc: any) => {
        const ts = inc.incident_date || inc.created_at || ''
        return ts.startsWith(date)
      }) : []

      setEvents(parseEvents(
        Array.isArray(daily) ? daily : [],
        Array.isArray(mar) ? mar : [],
        incidents,
      ))
    }).catch(() => {
      setError('Failed to load timeline data')
    }).finally(() => setLoading(false))
  }, [suId, date])

  const isLive = date === todayStr()

  return (
    <div style={{ background: '#0d1526', minHeight: 400 }} className="rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-white font-semibold text-base">Daily Timeline</h2>
          {isLive && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        <input
          type="date"
          value={date}
          max={todayStr()}
          onChange={e => setDate(e.target.value || todayStr())}
          className="rounded-lg border border-slate-600 bg-slate-800 text-slate-200 text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-6">
        {(Object.entries(TYPE_CONFIG) as [TimelineEvent['type'], typeof TYPE_CONFIG[TimelineEvent['type']]][]).map(([type, cfg]) => (
          <span key={type} className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            {type === 'food_fluid' ? 'Food & Fluid' : type === 'personal_care' ? 'Personal Care' : type.charAt(0).toUpperCase() + type.slice(1)}
          </span>
        ))}
      </div>

      {/* Content */}
      {error ? (
        <div className="text-red-400 text-sm text-center py-10">{error}</div>
      ) : loading ? (
        <div className="space-y-0">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Activity className="w-10 h-10 text-slate-600 mb-3" />
          <p className="text-slate-400 font-medium">No activity recorded yet for this date</p>
          <p className="text-slate-600 text-sm mt-1">
            {isLive ? 'Care records will appear here as they are added' : `No records found for ${format(parseISO(date), 'd MMMM yyyy')}`}
          </p>
        </div>
      ) : (
        <div className="relative">
          {events.map((event, idx) => {
            const cfg = TYPE_CONFIG[event.type]
            const Icon = cfg.Icon
            const isLast = idx === events.length - 1
            return (
              <div key={event.id} className="flex gap-3 group">
                {/* Time badge */}
                <div className="flex-shrink-0 w-14 pt-1 text-right">
                  <span className="text-xs font-mono font-semibold text-slate-400">{event.time}</span>
                </div>

                {/* Spine + dot */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1.5 ring-2 ring-offset-1 ring-offset-[#0d1526] ${cfg.dot}`} />
                  {!isLast && <div className="w-0.5 flex-1 bg-slate-700 mt-1 mb-1" />}
                </div>

                {/* Card */}
                <div className={`flex-1 mb-4 rounded-xl border p-4 transition-all group-hover:brightness-110 ${cfg.color}`}>
                  <div className="flex items-start gap-2.5">
                    <Icon className="w-4 h-4 flex-shrink-0 mt-0.5 opacity-80" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-0.5">{event.label}</p>
                      <p className="text-sm leading-snug">{event.details}</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && events.length > 0 && (
        <p className="text-center text-xs text-slate-600 mt-2">
          {events.length} event{events.length !== 1 ? 's' : ''} for {format(parseISO(date), 'd MMMM yyyy')}
        </p>
      )}
    </div>
  )
}
