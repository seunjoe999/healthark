import React, { useState, useEffect } from 'react'
import { Clock, Plus, CheckCircle, Download, ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { Button, Modal, Select, Spinner, EmptyState } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import api from '../../api'
import clsx from 'clsx'

function getMonday(d: Date) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  return date.toISOString().split('T')[0]
}

function formatHours(h: number | string) {
  const n = parseFloat(String(h || 0))
  const hrs = Math.floor(n)
  const mins = Math.round((n - hrs) * 60)
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`
}

const statusColor: Record<string, string> = {
  pending:  'badge-warning',
  approved: 'badge-success',
  rejected: 'badge-critical',
}

export default function Timesheets() {
  const { isRole } = useAuth()
  const [timesheets, setTimesheets] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [weekStart, setWeekStart] = useState(getMonday(new Date()))
  const [showGenerate, setShowGenerate] = useState(false)
  const [showDetail, setShowDetail] = useState<any>(null)
  const [genForm, setGenForm] = useState({ staffId: '' })
  const [submitting, setSubmitting] = useState(false)
  const [stats, setStats] = useState<any>(null)

  const canManage = isRole('home_manager', 'group_admin')

  async function load() {
    setLoading(true)
    try {
      const [tsRes, staffRes, statsRes] = await Promise.all([
        api.get('/timesheets', { params: { weekStart } }),
        canManage ? api.get('/staff') : Promise.resolve({ data: { data: [] } }),
        canManage ? api.get('/timesheets/stats/overview', { params: { weekStart } }) : Promise.resolve({ data: { data: null } }),
      ])
      setTimesheets(tsRes.data.data)
      setStaff(staffRes.data.data || staffRes.data || [])
      setStats(statsRes.data.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [weekStart])

  function prevWeek() {
    const d = new Date(weekStart)
    d.setDate(d.getDate() - 7)
    setWeekStart(d.toISOString().split('T')[0])
  }

  function nextWeek() {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    setWeekStart(d.toISOString().split('T')[0])
  }

  async function generate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/timesheets/generate', { staffId: genForm.staffId, weekStart })
      setShowGenerate(false)
      load()
    } catch {}
    setSubmitting(false)
  }

  async function approve(id: string) {
    try {
      await api.patch(`/timesheets/${id}/approve`)
      load()
    } catch {}
  }

  async function loadDetail(ts: any) {
    try {
      const res = await api.get(`/timesheets/${ts.id}`)
      setShowDetail(res.data.data)
    } catch {
      setShowDetail(ts)
    }
  }

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const staffOptions = staff.map((s: any) => ({ value: s.id, label: `${s.first_name} ${s.last_name}` }))

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Clock className="w-6 h-6 text-amber-400" /> Timesheets
          </h1>
          <p className="text-slate-400 text-sm mt-1">Hours worked and payroll overview</p>
        </div>
        {canManage && (
          <Button variant="gold" icon={<Plus className="w-4 h-4" />} onClick={() => setShowGenerate(true)}>
            Generate Timesheet
          </Button>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Pending Approval', value: stats.pending_count },
            { label: 'Approved', value: stats.approved_count },
            { label: 'Total Hours', value: formatHours(stats.total_hours) },
            { label: 'Total Pay', value: stats.total_pay ? `£${parseFloat(stats.total_pay).toFixed(2)}` : '—' },
          ].map(s => (
            <div key={s.label} className="card p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">{s.value ?? 0}</div>
              <div className="text-xs text-slate-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Week Navigator */}
      <div className="flex items-center justify-between mb-5 card px-4 py-3">
        <button onClick={prevWeek} className="p-1.5 rounded-lg hover:bg-white/8 text-slate-300 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <div className="font-bold text-white">
            {new Date(weekStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          <div className="text-xs text-slate-400">Week of {new Date(weekStart).toLocaleDateString('en-GB', { weekday: 'long' })}</div>
        </div>
        <button onClick={nextWeek} className="p-1.5 rounded-lg hover:bg-white/8 text-slate-300 transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {loading ? <Spinner /> : timesheets.length === 0 ? (
        <EmptyState title="No timesheets for this week"
          description={canManage ? "Generate timesheets from staff clock-in data" : "No timesheet found for this week"}
          action={canManage ? <Button variant="gold" onClick={() => setShowGenerate(true)}>Generate Timesheets</Button> : undefined} />
      ) : (
        <div className="space-y-3">
          {timesheets.map(ts => (
            <div key={ts.id} className="card p-4 cursor-pointer hover:border-amber-500/30 transition-all" onClick={() => loadDetail(ts)}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-slate-900"
                    style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)' }}>
                    {ts.staff_name?.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{ts.staff_name}</p>
                    <p className="text-xs text-slate-400 capitalize">{ts.staff_role?.replace(/_/g, ' ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-white">{formatHours(ts.total_hours)}</div>
                    <div className="text-xs text-slate-400">Total</div>
                  </div>
                  {parseFloat(ts.overtime_hours) > 0 && (
                    <div className="text-center">
                      <div className="font-bold text-amber-400">{formatHours(ts.overtime_hours)}</div>
                      <div className="text-xs text-slate-400">Overtime</div>
                    </div>
                  )}
                  {ts.total_pay && (
                    <div className="text-center">
                      <div className="font-bold text-emerald-400">£{parseFloat(ts.total_pay).toFixed(2)}</div>
                      <div className="text-xs text-slate-400">Pay</div>
                    </div>
                  )}
                  <span className={clsx('badge', statusColor[ts.status] || 'badge-info')}>{ts.status}</span>
                  {canManage && ts.status === 'pending' && (
                    <Button size="sm" variant="gold" icon={<CheckCircle className="w-3 h-3" />}
                      onClick={e => { e.stopPropagation(); approve(ts.id) }}>
                      Approve
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate Modal */}
      <Modal open={showGenerate} onClose={() => setShowGenerate(false)} title="Generate Timesheet">
        <form onSubmit={generate} className="space-y-4">
          <p className="text-sm text-slate-400">Generate a timesheet from clock-in data for the selected staff member.</p>
          <Select label="Staff Member" options={staffOptions} placeholder="Select staff member..." value={genForm.staffId}
            onChange={e => setGenForm(f => ({ ...f, staffId: e.target.value }))} required />
          <div className="card p-3 text-sm text-slate-300">
            Week: <strong className=”text-white”>{new Date(weekStart).toLocaleDateString('en-GB')} – {weekEnd.toLocaleDateString('en-GB')}</strong>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowGenerate(false)}>Cancel</Button>
            <Button type="submit" variant="gold" loading={submitting}>Generate</Button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title="Timesheet Detail" size="lg">
        {showDetail && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-white text-lg">{showDetail.staff_name}</p>
                <p className=”text-sm text-slate-400”>{new Date(showDetail.week_start).toLocaleDateString('en-GB')} – {new Date(showDetail.week_end).toLocaleDateString('en-GB')}</p>
              </div>
              <span className={clsx('badge', statusColor[showDetail.status] || 'badge-info')}>{showDetail.status}</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="card p-3 text-center">
                <div className="text-xl font-bold text-white">{formatHours(showDetail.total_hours)}</div>
                <div className="text-xs text-slate-400">Total Hours</div>
              </div>
              <div className="card p-3 text-center">
                <div className="text-xl font-bold text-amber-400">{formatHours(showDetail.overtime_hours)}</div>
                <div className="text-xs text-slate-400">Overtime</div>
              </div>
              <div className="card p-3 text-center">
                <div className=”text-xl font-bold text-emerald-400”>{showDetail.total_pay ? `£${parseFloat(showDetail.total_pay).toFixed(2)}` : '—'}</div>
                <div className="text-xs text-slate-400">Total Pay</div>
              </div>
            </div>

            {showDetail.entries?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Daily Breakdown</p>
                <div className="space-y-2">
                  {showDetail.entries.map((e: any) => (
                    <div key={e.id} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg" style={{ background: '#1a1a1a' }}>
                      <span className="text-slate-300">{new Date(e.work_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                      <span className=”text-slate-400”>{e.start_time} – {e.end_time}</span>
                      <span className="font-bold text-white">{formatHours(e.hours_worked)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {canManage && showDetail.status === 'pending' && (
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setShowDetail(null)}>Close</Button>
                <Button variant="gold" icon={<CheckCircle className="w-4 h-4" />}
                  onClick={() => { approve(showDetail.id); setShowDetail(null) }}>
                  Approve Timesheet
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

