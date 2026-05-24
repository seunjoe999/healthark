import React, { useEffect, useState, useCallback, useRef } from 'react'
import { homesApi, suApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format, parseISO, startOfWeek, startOfMonth } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Input, Select } from '../../components/ui'
import { Pill, Plus, Check, X, Search, Package, Printer, Calendar, ChevronLeft, ChevronRight, AlertTriangle, User } from 'lucide-react'
import toast from 'react-hot-toast'

const FREQ_TIMES: Record<string, string[]> = {
  once_daily: ['08:00'],
  twice_daily: ['08:00', '20:00'],
  three_times_daily: ['08:00', '14:00', '20:00'],
  four_times_daily: ['08:00', '12:00', '16:00', '20:00'],
  weekly: ['08:00'],
  as_required: ['PRN'],
  other: ['—'],
}

const FREQUENCIES = [
  { value: 'once_daily', label: 'Once daily' },
  { value: 'twice_daily', label: 'Twice daily (BD)' },
  { value: 'three_times_daily', label: 'Three times daily (TDS)' },
  { value: 'four_times_daily', label: 'Four times daily (QDS)' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'as_required', label: 'As required (PRN)' },
  { value: 'other', label: 'Other' },
]
const ROUTES = [
  { value: 'oral', label: 'Oral' },
  { value: 'topical', label: 'Topical' },
  { value: 'inhaled', label: 'Inhaled' },
  { value: 'injection', label: 'Injection' },
  { value: 'patch', label: 'Patch' },
  { value: 'eye_drops', label: 'Eye drops' },
  { value: 'other', label: 'Other' },
]

function getWC(dateStr: string): string {
  const d = parseISO(dateStr)
  const mon = startOfWeek(d, { weekStartsOn: 1 })
  return mon.toISOString().split('T')[0]
}

function buildWeeks(dates: string[]) {
  const map: Record<string, string[]> = {}
  for (const d of dates) {
    const wc = getWC(d)
    if (!map[wc]) map[wc] = []
    map[wc].push(d)
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([wc, ds]) => ({ wc, label: `W/C: ${format(parseISO(wc), 'd MMM yyyy')}`, dates: ds }))
}

function dayLetter(d: string) { return format(parseISO(d), 'EEE')[0] }

function getName(su: any) {
  return `${su.first_name || su.firstName || ''} ${su.last_name || su.lastName || ''}`.trim()
}

export default function MAR() {
  const { user } = useAuth()
  const now = new Date()
  const [sus, setSus] = useState<any[]>([])
  const [selectedSu, setSelectedSu] = useState<any>(null)
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [medications, setMedications] = useState<any[]>([])
  const [stockData, setStockData] = useState<any[]>([])
  const [chartData, setChartData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'mar' | 'medications' | 'stock'>('mar')
  const [addMedOpen, setAddMedOpen] = useState(false)
  const [stockModalMed, setStockModalMed] = useState<any>(null)
  const [printModal, setPrintModal] = useState(false)
  const [cellDetail, setCellDetail] = useState<any>(null)   // { med, date, records }
  const [logModal, setLogModal] = useState<any>(null)       // { med, date, slot }
  const [showPrescriptions, setShowPrescriptions] = useState(true)
  const [showDirections, setShowDirections] = useState(true)
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState(format(startOfMonth(now), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(now, 'yyyy-MM-dd'))
  const today = format(now, 'yyyy-MM-dd')

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

  const fetchAll = useCallback(async (su: any) => {
    if (!su) return
    setLoading(true)
    try {
      const [chartRes, medRes, stockRes] = await Promise.all([
        api.get(`/mar/chart-report/${su.id}`, { params: { startDate, endDate } }),
        api.get(`/mar/medications/${su.id}`),
        api.get(`/mar/stock/${su.id}`),
      ])
      setChartData(chartRes.data.data || null)
      setMedications(medRes.data.data || [])
      setStockData(stockRes.data.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [startDate, endDate])

  const selectSu = (su: any) => {
    setSelectedSu(su)
    fetchAll(su)
  }

  useEffect(() => {
    if (selectedSu) fetchAll(selectedSu)
  }, [startDate, endDate])

  const shiftMonth = (dir: number) => {
    const d = new Date(startDate + 'T00:00:00')
    d.setMonth(d.getMonth() + dir)
    const newStart = format(startOfMonth(d), 'yyyy-MM-dd')
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    const newEnd = format(lastDay, 'yyyy-MM-dd')
    setStartDate(newStart)
    setEndDate(newEnd > today ? today : newEnd)
  }

  const filteredSus = sus.filter(su => getName(su).toLowerCase().includes(search.toLowerCase()))

  const su = chartData?.serviceUser || selectedSu
  const suInitials = su ? `${(su.first_name || su.firstName || '?')[0]}${(su.last_name || su.lastName || '?')[0]}` : '?'

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left sidebar ─────────────────────────────────────────────── */}
      <div className="w-64 flex-shrink-0 bg-white border-r border-slate-100 flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
            <Pill className="w-4 h-4 text-purple-600" /> MAR Chart
          </h2>
          {homes.length > 1 && (
            <select className="input mb-2 text-sm" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
              {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input className="input pl-8 text-sm" placeholder="Search residents..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredSus.map(s => {
            const name = getName(s)
            const isSel = selectedSu?.id === s.id
            return (
              <button key={s.id} onClick={() => selectSu(s)}
                className={`w-full text-left px-3 py-2.5 border-b border-slate-50 hover:bg-slate-50 transition-colors ${isSel ? 'bg-purple-50 border-l-2 border-l-purple-600' : ''}`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isSel ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${isSel ? 'text-purple-900' : 'text-slate-800'}`}>{name}</p>
                    {isSel && medications.length > 0 && <p className="text-xs text-slate-400">{medications.length} medications</p>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Right panel ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col bg-slate-50">
        {!selectedSu ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState title="Select a resident" description="Choose a resident from the list to view their MAR chart" />
          </div>
        ) : (
          <>
            {/* ── Control bar ────────────────────────────────────────── */}
            <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-3 flex-wrap">
              {/* Month navigator */}
              <div className="flex items-center gap-1 border border-slate-200 rounded-lg overflow-hidden">
                <button onClick={() => shiftMonth(-1)} className="px-2 py-1.5 hover:bg-slate-100 text-slate-600 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 py-1.5 text-sm font-semibold text-slate-700 min-w-[110px] text-center">
                  {format(parseISO(startDate), 'MMMM yyyy')}
                </span>
                <button onClick={() => shiftMonth(1)} className="px-2 py-1.5 hover:bg-slate-100 text-slate-600 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Custom date range */}
              <div className="flex items-center gap-1.5 text-sm">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400" />
                <span className="text-slate-400">–</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400" />
              </div>

              {/* Toggles */}
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-sm text-slate-600">
                <input type="checkbox" checked={showPrescriptions} onChange={e => setShowPrescriptions(e.target.checked)}
                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-400" />
                Show Prescriptions
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-sm text-slate-600">
                <input type="checkbox" checked={showDirections} onChange={e => setShowDirections(e.target.checked)}
                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-400" />
                Show Directions
              </label>

              <div className="ml-auto flex items-center gap-2">
                <Button size="sm" variant="outline" icon={<Printer className="w-3.5 h-3.5" />} onClick={() => setPrintModal(true)}>Print</Button>
                <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setAddMedOpen(true)}>Add medication</Button>
              </div>
            </div>

            {/* ── Resident profile bar ───────────────────────────────── */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-start gap-4">
              {/* Avatar / photo */}
              <div className="flex-shrink-0">
                {su?.photo_url ? (
                  <img src={su.photo_url} alt={getName(su)} className="w-14 h-14 rounded-full object-cover border-2 border-slate-200" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-lg font-bold border-2 border-purple-200">
                    {suInitials}
                  </div>
                )}
              </div>

              {/* Info columns */}
              <div className="flex-1 grid grid-cols-3 gap-4 text-xs">
                {/* Resident details */}
                <div>
                  <p className="font-bold text-slate-800 text-sm mb-0.5">{getName(su)}</p>
                  {su?.date_of_birth && <p className="text-slate-500">DOB: {format(parseISO(su.date_of_birth), 'd MMM yyyy')}</p>}
                  {(su?.food_allergies || su?.allergies) && (
                    <p className="text-slate-600 mt-1">
                      <span className="font-semibold">Allergies/Notes:</span>{' '}
                      {[su.food_allergies, su.allergies].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {su?.med_allergies && (
                    <p className="text-slate-600">
                      <span className="font-semibold">Medicine Allergies:</span> {su.med_allergies}
                    </p>
                  )}
                  {su?.special_diet && (
                    <p className="text-slate-600">
                      <span className="font-semibold">Main Diet:</span> {su.special_diet}
                    </p>
                  )}
                  {su?.fluid_consistency && (
                    <p className="text-slate-600">
                      <span className="font-semibold">Fluid:</span> {su.fluid_consistency}
                    </p>
                  )}
                </div>

                {/* Provider */}
                <div>
                  {su?.home_name && (
                    <p className="font-semibold text-slate-700">{su.home_name}</p>
                  )}
                  {su?.home_address && <p className="text-slate-500">{su.home_address}</p>}
                  {su?.home_postcode && <p className="text-slate-500">{su.home_postcode}</p>}
                  {su?.home_phone && <p className="text-slate-500">{su.home_phone}</p>}
                </div>

                {/* Medical notes */}
                <div>
                  {su?.nhs_number && <p className="text-slate-600"><span className="font-semibold">NHS No:</span> {su.nhs_number}</p>}
                  {su?.dnar && <p className="text-rose-600 font-semibold">DNAR in place</p>}
                  {su?.nil_by_mouth && <p className="text-rose-600 font-semibold">NIL BY MOUTH</p>}
                  {su?.medical_history && <p className="text-slate-500 line-clamp-2 mt-1">{su.medical_history}</p>}
                </div>
              </div>

              {/* Start date */}
              {su?.admission_date && (
                <div className="flex-shrink-0 text-right text-xs text-slate-400">
                  <p className="font-semibold">Start Date</p>
                  <p>{format(parseISO(su.admission_date), 'd MMM yyyy')}</p>
                </div>
              )}
            </div>

            {/* ── Tabs ───────────────────────────────────────────────── */}
            <div className="bg-white border-b border-slate-200 px-4 flex gap-0">
              {[
                { key: 'mar', label: 'Medicine Administration Report' },
                { key: 'medications', label: 'Medications' },
                { key: 'stock', label: 'Stock Count' },
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key as any)}
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab === t.key ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── Content ────────────────────────────────────────────── */}
            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center h-48"><Spinner /></div>
              ) : tab === 'mar' ? (
                <MARGrid
                  chartData={chartData}
                  showPrescriptions={showPrescriptions}
                  showDirections={showDirections}
                  today={today}
                  onCellClick={(med, date, records, slot) => {
                    if (records.length > 0) setCellDetail({ med, date, records })
                    else if (date <= today) setLogModal({ med, date, slot })
                  }}
                  onRefresh={() => fetchAll(selectedSu)}
                />
              ) : tab === 'medications' ? (
                <div className="p-4 space-y-3">
                  {medications.length === 0 ? (
                    <EmptyState title="No medications" description="Add medications for this resident"
                      action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddMedOpen(true)}>Add medication</Button>} />
                  ) : medications.map((med: any) => (
                    <div key={med.id} className="bg-white rounded-xl border border-slate-100 p-4 flex items-start justify-between shadow-sm">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Pill className="w-4 h-4 text-purple-500" />
                          <h3 className="font-semibold text-slate-900">{med.medication_name}</h3>
                          {med.is_prn && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">PRN</span>}
                        </div>
                        <p className="text-sm text-slate-500">{med.dose} · {(med.frequency || '').replace(/_/g, ' ')} · {med.route}</p>
                        {med.prescribed_by && <p className="text-xs text-slate-400 mt-0.5">Prescribed by: {med.prescribed_by}</p>}
                        {med.start_date && <p className="text-xs text-slate-400">Started: {format(new Date(med.start_date), 'd MMM yyyy')}</p>}
                        {med.instructions && <p className="text-xs text-blue-700 bg-blue-50 rounded px-2 py-1 mt-1">{med.instructions}</p>}
                      </div>
                      <Button size="sm" variant="ghost" onClick={async () => {
                        if (!confirm('Discontinue this medication?')) return
                        await api.delete(`/mar/medications/${med.id}`)
                        const res = await api.get(`/mar/medications/${selectedSu.id}`)
                        setMedications(res.data.data || [])
                        toast.success('Medication discontinued')
                      }}>Discontinue</Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  <p className="text-sm text-slate-500">Record medication stock counts for audit purposes.</p>
                  {medications.map((med: any) => {
                    const stock = stockData.find((s: any) => s.medication_id === med.id)
                    return (
                      <div key={med.id} className="bg-white rounded-xl border border-slate-100 p-4 flex items-center justify-between shadow-sm">
                        <div>
                          <p className="font-semibold text-slate-900">{med.medication_name}</p>
                          <p className="text-sm text-slate-500">{med.dose}</p>
                          {stock && <p className="text-xs text-slate-400 mt-1">Last count: {stock.current_count} · {stock.last_counted_at ? format(new Date(stock.last_counted_at), 'd MMM, HH:mm') : 'Never'}</p>}
                        </div>
                        <div className="flex items-center gap-3">
                          {stock && <span className="text-2xl font-bold text-slate-800">{stock.current_count}</span>}
                          <Button size="sm" variant="outline" icon={<Package className="w-3.5 h-3.5" />}
                            onClick={() => setStockModalMed({ ...med, currentStock: stock?.current_count || 0 })}>
                            Update count
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                  {medications.length === 0 && <EmptyState title="No medications" description="Add medications to track stock counts" />}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────── */}
      <AddMedicationModal open={addMedOpen} onClose={() => setAddMedOpen(false)} suId={selectedSu?.id}
        onSaved={async () => {
          setAddMedOpen(false)
          await fetchAll(selectedSu)
          toast.success('Medication added')
        }} />

      {stockModalMed && (
        <StockCountModal med={stockModalMed} suId={selectedSu?.id} onClose={() => setStockModalMed(null)}
          onSaved={async () => {
            setStockModalMed(null)
            const res = await api.get(`/mar/stock/${selectedSu.id}`)
            setStockData(res.data.data || [])
            toast.success('Stock count updated')
          }} />
      )}

      {printModal && selectedSu && (
        <PrintMARModal suId={selectedSu.id} startDate={startDate} endDate={endDate} onClose={() => setPrintModal(false)} />
      )}

      {cellDetail && (
        <CellDetailModal data={cellDetail} onClose={() => setCellDetail(null)} />
      )}

      {logModal && selectedSu && (
        <LogMARModal med={logModal.med} date={logModal.date} slot={logModal.slot} suId={selectedSu.id}
          onClose={() => setLogModal(null)}
          onSaved={async () => {
            setLogModal(null)
            await fetchAll(selectedSu)
            toast.success('Recorded')
          }} />
      )}
    </div>
  )
}

/* ─── MAR Grid ─────────────────────────────────────────────────────────── */
function MARGrid({ chartData, showPrescriptions, showDirections, today, onCellClick, onRefresh }: {
  chartData: any; showPrescriptions: boolean; showDirections: boolean; today: string;
  onCellClick: (med: any, date: string, records: any[], slot: string) => void; onRefresh: () => void
}) {
  if (!chartData) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400">
        <EmptyState title="No data" description="Select a resident and date range to view the MAR chart" />
      </div>
    )
  }

  const { medications, dates } = chartData
  if (!medications?.length) {
    return (
      <div className="flex items-center justify-center h-48">
        <EmptyState title="No medications" description="Add medications using the button above to start the MAR chart" />
      </div>
    )
  }

  const weeks = buildWeeks(dates)

  const stickyMed: React.CSSProperties = { position: 'sticky', left: 0, zIndex: 2, minWidth: 160, maxWidth: 160, width: 160, background: '#fff', borderRight: '1px solid #d1d5db' }
  const stickyDir: React.CSSProperties = { position: 'sticky', left: 160, zIndex: 2, minWidth: 140, maxWidth: 140, width: 140, background: '#fff', borderRight: '1px solid #d1d5db' }
  const stickyTime: React.CSSProperties = { position: 'sticky', left: 300, zIndex: 2, minWidth: 50, maxWidth: 50, width: 50, background: '#f8fafc', borderRight: '2px solid #94a3b8', textAlign: 'center' }

  const thBase = 'border border-slate-200 text-center text-xs font-semibold py-1 px-0.5 bg-slate-100 text-slate-700'
  const tdBase = 'border border-slate-200 text-center text-xs'

  return (
    <div className="overflow-auto h-full">
      <table style={{ borderCollapse: 'collapse', minWidth: '100%', fontSize: 11 }}>
        <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
          {/* Week header */}
          <tr>
            <th style={{ ...stickyMed, background: '#f1f5f9', borderBottom: '1px solid #d1d5db', borderTop: '1px solid #d1d5db', padding: '6px 8px', fontSize: 11, fontWeight: 700, textAlign: 'left', zIndex: 12 }}>
              Medicine Administration Report
            </th>
            {showDirections && (
              <th style={{ ...stickyDir, background: '#f1f5f9', borderBottom: '1px solid #d1d5db', borderTop: '1px solid #d1d5db', padding: '6px 8px', fontSize: 11, fontWeight: 700, textAlign: 'left', zIndex: 12 }}>
                Directions
              </th>
            )}
            <th style={{ ...stickyTime, background: '#f1f5f9', borderBottom: '1px solid #d1d5db', borderTop: '1px solid #d1d5db', fontSize: 11, fontWeight: 700, zIndex: 12 }}>
              TIME
            </th>
            {weeks.map(w => (
              <th key={w.wc} colSpan={w.dates.length}
                style={{ border: '1px solid #d1d5db', textAlign: 'center', fontSize: 10, fontWeight: 700, padding: '4px 2px', background: '#dbeafe', color: '#1e40af', whiteSpace: 'nowrap' }}>
                {w.label}
              </th>
            ))}
          </tr>
          {/* Day header */}
          <tr>
            <th style={{ ...stickyMed, background: '#f8fafc', borderBottom: '2px solid #94a3b8', padding: '3px 8px', fontSize: 10, zIndex: 12 }} />
            {showDirections && (
              <th style={{ ...stickyDir, background: '#f8fafc', borderBottom: '2px solid #94a3b8', padding: '3px 8px', zIndex: 12 }} />
            )}
            <th style={{ ...stickyTime, background: '#f8fafc', borderBottom: '2px solid #94a3b8', zIndex: 12 }} />
            {dates.map((d: string) => {
              const isToday = d === today
              return (
                <th key={d} style={{
                  border: '1px solid #d1d5db',
                  textAlign: 'center',
                  fontSize: 9,
                  padding: '2px 1px',
                  minWidth: 30,
                  width: 30,
                  background: isToday ? '#fef3c7' : '#f8fafc',
                  fontWeight: isToday ? 800 : 600,
                  color: isToday ? '#92400e' : '#475569',
                }}>
                  <div>{dayLetter(d)}</div>
                  <div>{format(parseISO(d), 'd')}</div>
                </th>
              )
            })}
          </tr>
        </thead>

        <tbody>
          {medications.map((med: any) => {
            const slots: string[] = med.time_slots || FREQ_TIMES[med.frequency] || ['08:00']
            return slots.map((slot: string, si: number) => (
              <tr key={`${med.id}-${slot}`} style={{ backgroundColor: si % 2 === 0 ? '#fff' : '#fafafa' }}>
                {/* Medication name — spans all time slots */}
                {si === 0 && (
                  <td rowSpan={slots.length} style={{
                    ...stickyMed,
                    padding: '6px 8px',
                    verticalAlign: 'top',
                    border: '1px solid #e2e8f0',
                    borderRight: '1px solid #d1d5db',
                    background: '#fff',
                  }}>
                    <div className="font-semibold text-slate-800" style={{ fontSize: 11, lineHeight: 1.3 }}>{med.medication_name}</div>
                    {showPrescriptions && med.dose && (
                      <div style={{ fontSize: 9, color: '#6b7280', marginTop: 2 }}>
                        {med.dose}
                        {med.route && ` · ${med.route}`}
                      </div>
                    )}
                    {showPrescriptions && med.prescribed_by && (
                      <div style={{ fontSize: 9, color: '#9ca3af' }}>Rx: {med.prescribed_by}</div>
                    )}
                    {med.is_prn && (
                      <span style={{ display: 'inline-block', background: '#fef3c7', color: '#92400e', fontSize: 8, padding: '1px 4px', borderRadius: 3, marginTop: 2, fontWeight: 700 }}>PRN</span>
                    )}
                  </td>
                )}

                {/* Directions — spans all slots */}
                {showDirections && si === 0 && (
                  <td rowSpan={slots.length} style={{
                    ...stickyDir,
                    padding: '6px 8px',
                    verticalAlign: 'top',
                    border: '1px solid #e2e8f0',
                    borderRight: '1px solid #d1d5db',
                    background: '#fff',
                    fontSize: 9,
                    color: '#374151',
                    lineHeight: 1.4,
                  }}>
                    {med.instructions || med.notes || <span style={{ color: '#d1d5db' }}>—</span>}
                  </td>
                )}

                {/* Time slot */}
                <td style={{
                  ...stickyTime,
                  padding: '4px 2px',
                  border: '1px solid #e2e8f0',
                  fontWeight: 700,
                  fontSize: 10,
                  color: '#1e293b',
                  background: '#f1f5f9',
                }}>
                  {slot}
                </td>

                {/* Day cells */}
                {dates.map((d: string) => {
                  const dayRecs: any[] = med.records?.[d] || []
                  const rec = slot === 'PRN'
                    ? dayRecs[0]
                    : dayRecs.find((r: any) => r.scheduled_time === slot) || (dayRecs.length === 1 && !dayRecs[0].scheduled_time ? dayRecs[0] : undefined)
                  const isToday = d === today
                  const isFuture = d > today

                  let bg = '#fff'
                  let textColor = '#1e293b'
                  let display = ''
                  let subDisplay = ''

                  if (rec) {
                    if (rec.given) { bg = '#d1fae5'; textColor = '#065f46'; display = rec.initials || '✓' }
                    else if (rec.refused) { bg = '#fee2e2'; textColor = '#991b1b'; display = 'X'; subDisplay = 'R' }
                    else if (rec.omitted) { bg = '#fef9c3'; textColor = '#78350f'; display = 'O' }
                    else { bg = '#f3f4f6'; display = '—' }
                  } else if (isToday && !isFuture) {
                    bg = '#fef3c720'
                  }

                  return (
                    <td key={d} onClick={() => !isFuture && onCellClick(med, d, dayRecs, slot)}
                      style={{
                        border: `1px solid ${isToday ? '#fbbf24' : '#e2e8f0'}`,
                        textAlign: 'center',
                        fontSize: 9,
                        padding: '1px',
                        verticalAlign: 'middle',
                        minWidth: 30,
                        width: 30,
                        background: isToday && !rec ? '#fffbeb' : bg,
                        color: textColor,
                        cursor: isFuture ? 'default' : 'pointer',
                        fontWeight: 700,
                        lineHeight: 1.1,
                        transition: 'background 0.1s',
                      }}
                      className={!isFuture ? 'hover:opacity-80' : ''}>
                      <div>{display}</div>
                      {subDisplay && <div style={{ fontSize: 7 }}>{subDisplay}</div>}
                    </td>
                  )
                })}
              </tr>
            ))
          })}
        </tbody>
      </table>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 bg-white border-t border-slate-200 text-xs text-slate-500 flex-wrap">
        <span className="font-semibold text-slate-700">Key:</span>
        <span className="flex items-center gap-1"><span className="inline-block w-4 h-4 bg-emerald-100 border border-emerald-300 rounded text-center text-emerald-700 font-bold leading-4" style={{fontSize:8}}>JC</span> = Given (initials)</span>
        <span className="flex items-center gap-1"><span className="inline-block w-4 h-4 bg-red-100 border border-red-300 rounded text-center text-red-700 font-bold leading-4" style={{fontSize:8}}>X</span> = Refused</span>
        <span className="flex items-center gap-1"><span className="inline-block w-4 h-4 bg-yellow-100 border border-yellow-300 rounded text-center text-yellow-700 font-bold leading-4" style={{fontSize:8}}>O</span> = Omitted</span>
        <span className="flex items-center gap-1"><span className="inline-block w-4 h-4 bg-amber-50 border border-amber-300 rounded leading-4" style={{fontSize:8}} /> = Today</span>
        <span className="text-slate-400">Click any cell to view details or log medication</span>
      </div>
    </div>
  )
}

/* ─── Cell Detail Modal ────────────────────────────────────────────────── */
function CellDetailModal({ data, onClose }: { data: any; onClose: () => void }) {
  const { med, date, records } = data
  const rec = records[0]
  return (
    <Modal open={true} onClose={onClose} title={med.medication_name} size="md">
      <div className="space-y-3 text-sm">
        <div className={`flex items-center gap-2 text-sm font-semibold p-3 rounded-xl ${rec?.given ? 'bg-emerald-50 text-emerald-700' : rec?.refused ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-600'}`}>
          {rec?.given ? <Check className="w-4 h-4" /> : rec?.refused ? <X className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {rec?.given
            ? `Administered by ${rec.given_by_name || 'Staff'} at ${rec.scheduled_time || rec.given_at ? format(new Date(rec.given_at || date), 'HH:mm') : '—'} on ${format(parseISO(date), 'd MMM yyyy')}`
            : rec?.refused
              ? `Refused on ${format(parseISO(date), 'd MMM yyyy')}${rec.refused_reason ? ' — ' + rec.refused_reason : ''}`
              : `Omitted on ${format(parseISO(date), 'd MMM yyyy')}${rec?.omit_reason ? ' — ' + rec.omit_reason : ''}`}
        </div>
        <table className="w-full text-xs text-slate-600 border-collapse">
          <tbody>
            {[
              ['Medication', med.medication_name],
              ['Dose / Prescription', med.dose || '—'],
              ['Route', med.route || '—'],
              ['Frequency', (med.frequency || '').replace(/_/g, ' ')],
              ['Is PRN?', med.is_prn ? 'Yes' : 'No'],
              ['Directions', med.instructions || '—'],
              ['Prescribed by', med.prescribed_by || '—'],
              ...(rec?.notes ? [['Notes', rec.notes]] : []),
            ].map(([label, val]) => (
              <tr key={label} className="border-b border-slate-100">
                <td className="py-1.5 pr-3 font-semibold text-slate-700 w-36">{label}</td>
                <td className="py-1.5 text-slate-600">{val}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {records.length > 1 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">All records for this date:</p>
            <div className="space-y-1">
              {records.map((r: any, i: number) => (
                <div key={i} className="text-xs text-slate-600 flex gap-2">
                  <span className={`px-1.5 py-0.5 rounded font-bold ${r.given ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {r.given ? 'Given' : 'Refused'}
                  </span>
                  <span>{r.given_by_name || '—'}</span>
                  {r.scheduled_time && <span>{r.scheduled_time}</span>}
                  {r.notes && <span className="text-slate-400">· {r.notes}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-end pt-1">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  )
}

/* ─── Log MAR Modal ────────────────────────────────────────────────────── */
function LogMARModal({ med, date, slot, suId, onClose, onSaved }: {
  med: any; date: string; slot: string; suId: string; onClose: () => void; onSaved: () => void
}) {
  const [given, setGiven] = useState<boolean | null>(null)
  const [notes, setNotes] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const save = async () => {
    if (given === null) { toast.error('Select Given or Refused'); return }
    setLoading(true)
    try {
      await api.post('/mar/records', {
        suId, medicationId: med.id,
        given: given ? true : null,
        refused: !given,
        notes: notes || undefined,
        reason: reason || undefined,
        scheduledTime: slot,
        recordDate: date,
      })
      onSaved()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={true} onClose={onClose} title={`Log — ${med.medication_name}`} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          {format(parseISO(date), 'EEEE, d MMMM yyyy')} · {slot}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setGiven(true)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${given === true ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'}`}>
            <Check className={`w-6 h-6 ${given === true ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span className={`font-semibold text-sm ${given === true ? 'text-emerald-700' : 'text-slate-600'}`}>Given</span>
          </button>
          <button onClick={() => setGiven(false)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${given === false ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-red-300'}`}>
            <X className={`w-6 h-6 ${given === false ? 'text-red-600' : 'text-slate-400'}`} />
            <span className={`font-semibold text-sm ${given === false ? 'text-red-700' : 'text-slate-600'}`}>Refused</span>
          </button>
        </div>
        {given === false && (
          <Input label="Reason for refusal" value={reason} onChange={e => setReason(e.target.value)} placeholder="Resident refused, nausea, etc." />
        )}
        <div>
          <label className="label">Notes (optional)</label>
          <textarea className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional notes..." />
        </div>
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={save}>Save record</Button>
        </div>
      </div>
    </Modal>
  )
}

/* ─── Add Medication Modal ─────────────────────────────────────────────── */
function AddMedicationModal({ open, onClose, suId, onSaved }: { open: boolean; onClose: () => void; suId?: string; onSaved: () => void }) {
  const [form, setForm] = useState({ medicationName: '', dose: '', frequency: '', route: '', prescribedBy: '', startDate: '', instructions: '', isPrn: false })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try { await api.post('/mar/medications', { suId, ...form }); onSaved() }
    catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add medication" size="md">
      <form onSubmit={save} className="space-y-4">
        <Input label="Medication name *" required value={form.medicationName} onChange={e => set('medicationName', e.target.value)} placeholder="e.g. Amlodipine, Paracetamol..." />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Dose" value={form.dose} onChange={e => set('dose', e.target.value)} placeholder="e.g. 5mg, 2 tablets..." />
          <Select label="Frequency" value={form.frequency} onChange={e => set('frequency', e.target.value)} options={FREQUENCIES} placeholder="Select frequency" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Route" value={form.route} onChange={e => set('route', e.target.value)} options={ROUTES} placeholder="Select route" />
          <Input label="Prescribed by" value={form.prescribedBy} onChange={e => set('prescribedBy', e.target.value)} placeholder="GP or consultant name" />
        </div>
        <Input label="Start date" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
        <div>
          <label className="label">Directions / Instructions</label>
          <textarea className="input" rows={2} value={form.instructions} onChange={e => set('instructions', e.target.value)} placeholder="e.g. Take ONE 5ml spoonful twice daily after food..." />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="prn" checked={form.isPrn} onChange={e => set('isPrn', e.target.checked)} className="rounded" />
          <label htmlFor="prn" className="text-sm font-medium text-slate-700">This is a PRN (as required) medication</label>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading} icon={<Pill className="w-4 h-4" />}>Add medication</Button>
        </div>
      </form>
    </Modal>
  )
}

/* ─── Print Modal ──────────────────────────────────────────────────────── */
function PrintMARModal({ suId, startDate, endDate, onClose }: { suId: string; startDate: string; endDate: string; onClose: () => void }) {
  const [sd, setSd] = useState(startDate)
  const [ed, setEd] = useState(endDate)

  const open = () => {
    const token = (window as any).__HA_TOKEN__ || sessionStorage.getItem('ha_token') || localStorage.getItem('ha_token') || ''
    ;(window as any).__HA_TOKEN__ = token
    window.open(`/mar/${suId}/print?startDate=${sd}&endDate=${ed}`, '_blank', 'width=1200,height=900')
    onClose()
  }

  return (
    <Modal open={true} onClose={onClose} title="Print MAR Chart" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-slate-500">Select date range to include in the printable MAR chart.</p>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Start date" type="date" value={sd} onChange={e => setSd(e.target.value)} />
          <Input label="End date" type="date" value={ed} onChange={e => setEd(e.target.value)} />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button icon={<Printer className="w-4 h-4" />} onClick={open}>Open MAR chart</Button>
        </div>
      </div>
    </Modal>
  )
}

/* ─── Stock Count Modal ────────────────────────────────────────────────── */
function StockCountModal({ med, suId, onClose, onSaved }: { med: any; suId: string; onClose: () => void; onSaved: () => void }) {
  const [count, setCount] = useState(String(med.currentStock || 0))
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post(`/mar/stock/${med.id}/count`, { suId, currentCount: parseFloat(count), notes })
      onSaved()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={true} onClose={onClose} title={`Stock count — ${med.medication_name}`} size="sm">
      <form onSubmit={save} className="space-y-4">
        <Input label="Current stock count *" type="number" step="0.5" required value={count} onChange={e => setCount(e.target.value)} hint={`Previous count: ${med.currentStock} units`} />
        <div><label className="label">Notes (optional)</label><textarea className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Save count</Button>
        </div>
      </form>
    </Modal>
  )
}
