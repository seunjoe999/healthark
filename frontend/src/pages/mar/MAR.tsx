import React, { useEffect, useState, useCallback, useRef } from 'react'
import { homesApi, suApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { format, parseISO, startOfWeek, startOfMonth, endOfMonth, addDays, differenceInCalendarDays } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Input, Select } from '../../components/ui'
import { Pill, Plus, Check, X, Package, Printer, ChevronLeft, ChevronRight, AlertTriangle, PauseCircle, Building2, Stethoscope, Phone, MapPin, Shield, UserCheck } from 'lucide-react'
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
  const { user, isRole } = useAuth()
  const { theme } = useTheme()
  const marColors = theme === 'dark'
    ? { page: '#0a0a0a', panel: '#111', border: 'border-white/10' }
    : { page: '#f8f7fb', panel: '#ffffff', border: 'border-slate-200' }
  const now = new Date()
  const [sus, setSus] = useState<any[]>([])
  const [selectedSu, setSelectedSu] = useState<any>(null)
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [medications, setMedications] = useState<any[]>([])
  const [stockData, setStockData] = useState<any[]>([])
  const [chartData, setChartData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'mar' | 'medications' | 'stock' | 'gp_pharmacy'>('mar')
  const [addMedOpen, setAddMedOpen] = useState(false)
  const [editMedModal, setEditMedModal] = useState<any>(null)
  const [stockModalMed, setStockModalMed] = useState<any>(null)
  const [printModal, setPrintModal] = useState(false)
  const [cellDetail, setCellDetail] = useState<any>(null)
  const [logModal, setLogModal] = useState<any>(null)
  const [witnessSignOffModal, setWitnessSignOffModal] = useState<string | null>(null)
  const [showPrescriptions, setShowPrescriptions] = useState(true)
  const [showDirections, setShowDirections] = useState(true)
  const [startDate, setStartDate] = useState(format(startOfMonth(now), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(endOfMonth(now), 'yyyy-MM-dd'))
  const today = format(now, 'yyyy-MM-dd')

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
    })
  }, [user])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const wrid = params.get('witnessRecord')
    if (wrid) setWitnessSignOffModal(wrid)
  }, [])

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
    const start = parseISO(startDate)
    const end = parseISO(endDate)
    const span = differenceInCalendarDays(end, start) + 1
    const newStart = format(addDays(start, dir * span), 'yyyy-MM-dd')
    const newEnd = format(addDays(end, dir * span), 'yyyy-MM-dd')
    setStartDate(newStart)
    setEndDate(newEnd)
  }

  const su = chartData?.serviceUser || selectedSu
  const suInitials = su ? `${(su.first_name || su.firstName || '?')[0]}${(su.last_name || su.lastName || '?')[0]}` : '?'

  // Care staff / senior carers see medication as a simple task list, not the full MAR grid/history
  const isPrivilegedMar = isRole('home_manager', 'group_admin', 'deputy_manager', 'admin')
  if (!isPrivilegedMar) {
    return <MedicationTasks selectedHome={selectedHome} homes={homes} setSelectedHome={setSelectedHome} />
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: marColors.page }}>

      {/* ── Top control bar (RoundSys-style) ─────────────────────────── */}
      <div className={`no-print border-b ${marColors.border} px-4 py-3 flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-x-6 gap-y-2`} style={{ background: marColors.panel }}>
        {/* Title */}
        <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5 flex-shrink-0">
          <Pill className="w-4 h-4 text-purple-600" /> MAR
        </span>

        {homes.length > 1 && (
          <select className="border border-slate-300 rounded px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
            value={selectedHome} onChange={e => { setSelectedHome(e.target.value); setSelectedSu(null); setChartData(null) }}>
            {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        )}

        {/* Service user dropdown */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">Service User</label>
          <select
            className="border border-slate-300 rounded px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400 min-w-[180px]"
            value={selectedSu?.id || ''}
            onChange={e => {
              if (!e.target.value) { setSelectedSu(null); setChartData(null); return }
              const s = sus.find((x: any) => x.id === e.target.value)
              if (s) selectSu(s)
            }}>
            <option value="">— Select resident —</option>
            {sus.map((s: any) => <option key={s.id} value={s.id}>{getName(s)}</option>)}
          </select>
        </div>

        {/* Date range */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">Date</label>
          <div className="flex items-center gap-1 border border-slate-300 rounded overflow-hidden">
            <button onClick={() => shiftMonth(-1)} className="px-1.5 py-1 hover:bg-slate-100 text-slate-600 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="border-0 px-1.5 py-1 text-sm text-slate-700 focus:outline-none w-32" />
            <span className="text-slate-400 text-xs px-0.5">–</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="border-0 px-1.5 py-1 text-sm text-slate-700 focus:outline-none w-32" />
            <button onClick={() => shiftMonth(1)} className="px-1.5 py-1 hover:bg-slate-100 text-slate-600 transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Show toggles */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">Show Prescriptions</label>
          <button type="button" onClick={() => setShowPrescriptions(!showPrescriptions)}
            className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${showPrescriptions ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>
            {showPrescriptions ? 'Yes' : 'No'}
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">Show Directions</label>
          <button type="button" onClick={() => setShowDirections(!showDirections)}
            className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${showDirections ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>
            {showDirections ? 'Yes' : 'No'}
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" icon={<Printer className="w-3.5 h-3.5" />} onClick={() => setPrintModal(true)}>Print</Button>
          {selectedSu && <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setAddMedOpen(true)}>Add medication</Button>}
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────────── */}
      {!selectedSu ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState title="Select a resident" description="Use the Service User dropdown above to load their Medication Administration Record" />
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

          {/* ── Resident profile strip ───────────────────────────────── */}
          <div className={`border-b ${marColors.border} px-4 py-2 flex items-start gap-4`} style={{ background: marColors.panel }}>
            <div className="flex-shrink-0 relative w-12 h-12">
              <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-base font-bold border-2 border-purple-200">
                {suInitials}
              </div>
              {su?.photo_url && (
                <img src={su.photo_url} alt={getName(su)}
                  className="absolute inset-0 w-12 h-12 rounded-full object-cover border-2 border-slate-200"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              )}
            </div>
            <div className="flex-1 grid grid-cols-3 gap-4 text-xs">
              <div>
                <p className="font-bold text-slate-800 text-sm mb-0.5">{getName(su)}</p>
                {su?.date_of_birth && <p className="text-slate-500">DOB: {format(parseISO(su.date_of_birth), 'd MMM yyyy')}</p>}
                {(su?.food_allergies || su?.allergies) && <p className="text-slate-600 mt-0.5"><span className="font-semibold">Allergies/Notes:</span> {[su.food_allergies, su.allergies].filter(Boolean).join(', ')}</p>}
                {su?.med_allergies && <p className="text-slate-600"><span className="font-semibold">Medicine Allergies:</span> {su.med_allergies}</p>}
                {su?.special_diet && <p className="text-slate-600"><span className="font-semibold">Main Diet:</span> {su.special_diet}</p>}
              </div>
              <div className="text-center">
                {su?.home_name && <p className="font-semibold text-slate-700">{su.home_name}</p>}
                {su?.home_address && <p className="text-slate-500">{su.home_address}</p>}
                {su?.home_postcode && <p className="text-slate-500">{su.home_postcode}</p>}
              </div>
              <div className="text-right">
                {su?.nhs_number && <p className="text-slate-600"><span className="font-semibold">NHS No:</span> {su.nhs_number}</p>}
                {su?.dnar && <p className="text-rose-600 font-semibold text-xs">DNAR in place</p>}
                {su?.nil_by_mouth && <p className="text-rose-600 font-semibold text-xs">NIL BY MOUTH</p>}
                {su?.admission_date && <p className="text-slate-400 text-xs mt-0.5">Admitted: {format(parseISO(su.admission_date), 'd MMM yyyy')}</p>}
                {su?.status === 'on_hold' && (
                  <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300">
                    <PauseCircle className="w-3 h-3 text-amber-700" />
                    <span className="text-amber-700 font-bold text-xs">ON HOLD</span>
                  </div>
                )}
                {su?.status === 'hospital' && (
                  <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-blue-100 border border-blue-300">
                    <Building2 className="w-3 h-3 text-blue-700" />
                    <span className="text-blue-700 font-bold text-xs">IN HOSPITAL</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Tabs ───────────────────────────────────────────────── */}
          <div className={`no-print border-b ${marColors.border} px-4 flex gap-0 overflow-x-auto`} style={{ background: marColors.panel, WebkitOverflowScrolling: 'touch' }}>
            {[
              { key: 'mar', label: 'Medicine Administration Report' },
              { key: 'medications', label: 'Medications' },
              { key: 'stock', label: 'Stock Count' },
              { key: 'gp_pharmacy', label: 'GP & Pharmacy' },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key as any)}
                className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab === t.key ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Content ────────────────────────────────────────────── */}
          <div className="flex-1 min-h-0 overflow-auto">
            {tab === 'mar' && (
              <p className="sm:hidden text-xs text-slate-500 text-center py-1 px-4 bg-black/20 border-b border-white/5">
                Swipe left/right to view all dates
              </p>
            )}
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
                  else setLogModal({ med, date, slot })
                }}
                onRefresh={() => fetchAll(selectedSu)}
              />
            ) : tab === 'medications' ? (
              <div className="p-4 space-y-3">
                {medications.length === 0 ? (
                  <EmptyState title="No medications" description="Add medications for this resident"
                    action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddMedOpen(true)}>Add medication</Button>} />
                ) : medications.map((med: any) => (
                  <div key={med.id} className="bg-white/5 rounded-xl border border-white/10 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Pill className="w-4 h-4 text-purple-500 shrink-0" />
                          <h3 className="font-semibold text-white">{med.medication_name}</h3>
                          {med.is_prn && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">PRN</span>}
                          {med.is_controlled && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><Shield className="w-3 h-3" />CD</span>}
                        </div>
                        <p className="text-sm text-slate-500">{med.dose} · {(med.frequency || '').replace(/_/g, ' ')} · {med.route}</p>
                        {med.prescribed_by && <p className="text-xs text-slate-400 mt-0.5">Prescribed by: {med.prescribed_by}</p>}
                        {med.start_date && <p className="text-xs text-slate-400">Started: {format(new Date(med.start_date), 'd MMM yyyy')}</p>}
                        {med.instructions && (
                          <p className="text-xs text-blue-700 bg-blue-50 rounded px-2 py-1 mt-1.5">{med.instructions}</p>
                        )}
                        {med.location_access_code && (
                          <p className="text-xs text-slate-600 bg-slate-50 rounded px-2 py-1 mt-1.5 flex items-start gap-1">
                            <MapPin className="w-3 h-3 shrink-0 mt-0.5 text-slate-400" />
                            <span><span className="font-semibold">Location / Access:</span> {med.location_access_code}</span>
                          </p>
                        )}
                        {med.medicine_warning && (
                          <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-1.5 flex items-start gap-1">
                            <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                            <span><span className="font-semibold">Warning:</span> {med.medicine_warning}</span>
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => setEditMedModal(med)}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={async () => {
                          if (!confirm('Discontinue this medication?')) return
                          await api.delete(`/mar/medications/${med.id}`)
                          const res = await api.get(`/mar/medications/${selectedSu.id}`)
                          setMedications(res.data.data || [])
                          toast.success('Medication discontinued')
                        }}>Discontinue</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : tab === 'gp_pharmacy' ? (
              <GPPharmacyTab su={su} medications={medications} />
            ) : (
              <div className="p-4 space-y-3">
                <p className="text-sm text-slate-500">Record medication stock counts for audit purposes.</p>
                {medications.map((med: any) => {
                  const stock = stockData.find((s: any) => s.medication_id === med.id)
                  return (
                    <div key={med.id} className="bg-white/5 rounded-xl border border-white/10 p-4 flex items-center justify-between shadow-sm">
                      <div>
                        <p className="font-semibold text-white">{med.medication_name}</p>
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
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────── */}
      <AddMedicationModal open={addMedOpen} onClose={() => setAddMedOpen(false)} suId={selectedSu?.id}
        homeId={selectedHome}
        onSaved={async () => {
          setAddMedOpen(false)
          await fetchAll(selectedSu)
          toast.success('Medication added')
        }} />

      {editMedModal && (
        <EditMedicationModal med={editMedModal} onClose={() => setEditMedModal(null)}
          onSaved={async () => {
            setEditMedModal(null)
            await fetchAll(selectedSu)
            toast.success('Medication updated')
          }} />
      )}

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
        <PrintMARModal suId={selectedSu.id} su={su} startDate={startDate} endDate={endDate} onClose={() => setPrintModal(false)} />
      )}

      {cellDetail && (
        <CellDetailModal data={cellDetail} currentUser={user} onClose={() => setCellDetail(null)}
          onRefresh={() => fetchAll(selectedSu)} />
      )}

      {logModal && selectedSu && (
        <LogMARModal med={logModal.med} date={logModal.date} slot={logModal.slot} suId={selectedSu.id}
          homeId={selectedHome}
          onClose={() => setLogModal(null)}
          onSaved={async () => {
            setLogModal(null)
            await fetchAll(selectedSu)
            toast.success('Recorded')
          }} />
      )}

      {witnessSignOffModal && (
        <WitnessSignOffModal recordId={witnessSignOffModal}
          onClose={() => { setWitnessSignOffModal(null); window.history.replaceState({}, '', '/mar') }} />
      )}
    </div>
  )
}

/* ─── Medication Tasks — staff-facing To-Do view ──────────────────────────
   Non-admin roles see medication due today as a simple checklist rather than
   the full MAR grid/history. Signing off opens the same LogMARModal used by
   admins, so records land identically in the back office. */
const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'To-do', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  given: { label: 'Given', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  refused: { label: 'Refused', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
}

function MedicationTasks({ selectedHome, homes, setSelectedHome }: { selectedHome: string; homes: any[]; setSelectedHome: (v: string) => void }) {
  const { theme } = useTheme()
  const panelBg = theme === 'dark' ? '#111' : '#ffffff'
  const pageBg = theme === 'dark' ? '#0a0a0a' : '#f8f7fb'
  const panelBorder = theme === 'dark' ? 'border-white/10' : 'border-slate-200'
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [signOffTask, setSignOffTask] = useState<any>(null)
  const today = format(new Date(), 'yyyy-MM-dd')

  const load = () => {
    if (!selectedHome) return
    setLoading(true)
    api.get('/mar/due-today', { params: { homeId: selectedHome } })
      .then(res => setTasks(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [selectedHome])

  const pending = tasks.filter(t => t.status === 'pending')
  const done = tasks.filter(t => t.status !== 'pending')

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: pageBg }}>
      <div className={`no-print border-b ${panelBorder} px-4 py-3 flex items-center gap-4 flex-wrap`} style={{ background: panelBg }}>
        <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
          <Pill className="w-4 h-4 text-purple-600" /> Medication Tasks
        </span>
        <span className="text-xs text-slate-500">{format(new Date(), 'EEEE, d MMMM yyyy')}</span>
        {homes.length > 1 && (
          <select className="border border-slate-300 rounded px-2 py-1 text-sm text-slate-700 ml-auto"
            value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
            {homes.map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? <Spinner /> : tasks.length === 0 ? (
          <EmptyState title="No medication due today" description="Check back later, or select the correct home above" />
        ) : (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 rounded-xl border border-white/10 p-3 text-center">
                <p className="text-xl font-bold text-slate-100">{tasks.length}</p>
                <p className="text-xs text-slate-400">Total today</p>
              </div>
              <div className="bg-white/5 rounded-xl border border-white/10 p-3 text-center">
                <p className="text-xl font-bold text-amber-400">{pending.length}</p>
                <p className="text-xs text-slate-400">To-do</p>
              </div>
              <div className="bg-white/5 rounded-xl border border-white/10 p-3 text-center">
                <p className="text-xl font-bold text-emerald-400">{done.length}</p>
                <p className="text-xs text-slate-400">Completed</p>
              </div>
            </div>

            {[...pending, ...done].map((t, i) => {
              const style = STATUS_STYLE[t.status] || { label: t.status, color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' }
              const isPending = t.status === 'pending'
              return (
                <div key={`${t.medicationId}-${t.scheduledTime}-${i}`}
                  className={`bg-white/5 rounded-2xl border p-4 flex items-center gap-4 ${isPending ? 'border-white/10' : 'border-emerald-500/20 opacity-70'}`}>
                  <button onClick={() => isPending && setSignOffTask(t)}
                    disabled={!isPending}
                    className={`w-9 h-9 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isPending ? 'border-slate-500 hover:border-purple-400' : 'bg-emerald-500 border-emerald-500'}`}>
                    {!isPending && <Check className="w-4 h-4 text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm text-slate-100">{t.medicationName}</h3>
                      {t.dose && <span className="text-xs text-slate-400">{t.dose}</span>}
                      {t.isControlled && <span className="flex items-center gap-1 text-xs bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded-full"><Shield className="w-3 h-3" /> Controlled</span>}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{t.suName} · {t.scheduledTime}</p>
                    {t.instructions && <p className="text-xs text-slate-500 mt-1">{t.instructions}</p>}
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0" style={{ color: style.color, background: style.bg }}>
                    {style.label}
                  </span>
                  {isPending && (
                    <Button size="sm" onClick={() => setSignOffTask(t)}>Sign off</Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {signOffTask && (
        <LogMARModal
          med={{
            id: signOffTask.medicationId,
            medication_name: signOffTask.medicationName,
            is_controlled: signOffTask.isControlled,
            location_access_code: null,
            medicine_warning: null,
          }}
          date={today}
          slot={signOffTask.scheduledTime}
          suId={signOffTask.suId}
          homeId={selectedHome}
          onClose={() => setSignOffTask(null)}
          onSaved={() => { setSignOffTask(null); load(); toast.success('Medication signed off') }}
        />
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
  const { theme } = useTheme()
  const gridBodyBg = theme === 'dark' ? '#111' : '#ffffff'
  const gridBodyBgAlt = theme === 'dark' ? '#161616' : '#f8fafc'
  const gridBorder = theme === 'dark' ? '#2a2a2a' : '#e2e8f0'

  const stickyMed: React.CSSProperties = { position: 'sticky', left: 0, zIndex: 2, minWidth: 160, maxWidth: 160, width: 160, background: gridBodyBg, borderRight: `1px solid ${gridBorder}` }
  const stickyDir: React.CSSProperties = { position: 'sticky', left: 160, zIndex: 2, minWidth: 140, maxWidth: 140, width: 140, background: gridBodyBg, borderRight: `1px solid ${gridBorder}` }
  const stickyTime: React.CSSProperties = { position: 'sticky', left: 300, zIndex: 2, minWidth: 50, maxWidth: 50, width: 50, background: '#f8fafc', borderRight: '2px solid #94a3b8', textAlign: 'center' }

  const thBase = 'border border-slate-200 text-center text-xs font-semibold py-1 px-0.5 bg-slate-100 text-slate-700'
  const tdBase = 'border border-slate-200 text-center text-xs'

  return (
    <div style={{ overflowX: 'auto', overflowY: 'auto', width: '100%', height: '100%' }}>
      <table style={{ borderCollapse: 'collapse', minWidth: 'max-content', fontSize: 11 }}>
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
              <tr key={`${med.id}-${slot}`} style={{ backgroundColor: si % 2 === 0 ? gridBodyBg : gridBodyBgAlt }}>
                {/* Medication name — spans all time slots */}
                {si === 0 && (
                  <td rowSpan={slots.length} style={{
                    ...stickyMed,
                    padding: '6px 8px',
                    verticalAlign: 'top',
                    border: `1px solid ${gridBorder}`,
                    borderRight: `1px solid ${gridBorder}`,
                    background: gridBodyBg,
                  }}>
                    <div className="font-semibold" style={{ fontSize: 11, lineHeight: 1.3, color: theme === 'dark' ? '#f5f0e8' : '#0f172a' }}>{med.medication_name}</div>
                    {showPrescriptions && med.dose && (
                      <div style={{ fontSize: 9, color: '#6b7280', marginTop: 2 }}>
                        {med.dose}
                        {med.route && ` · ${med.route}`}
                      </div>
                    )}
                    {showPrescriptions && med.prescribed_by && (
                      <div style={{ fontSize: 9, color: '#9ca3af' }}>Rx: {med.prescribed_by}</div>
                    )}
                    <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', marginTop: 2 }}>
                      {med.is_prn && (
                        <span style={{ display: 'inline-block', background: '#fef3c7', color: '#92400e', fontSize: 8, padding: '1px 4px', borderRadius: 3, fontWeight: 700 }}>PRN</span>
                      )}
                      {med.is_controlled && (
                        <span style={{ display: 'inline-block', background: '#ede9fe', color: '#7c3aed', fontSize: 8, padding: '1px 4px', borderRadius: 3, fontWeight: 700 }}>CD</span>
                      )}
                    </div>
                  </td>
                )}

                {/* Directions — spans all slots */}
                {showDirections && si === 0 && (
                  <td rowSpan={slots.length} style={{
                    ...stickyDir,
                    padding: '6px 8px',
                    verticalAlign: 'top',
                    border: `1px solid ${gridBorder}`,
                    borderRight: `1px solid ${gridBorder}`,
                    background: gridBodyBg,
                    fontSize: 9,
                    color: theme === 'dark' ? '#b8b3a7' : '#475569',
                    lineHeight: 1.4,
                  }}>
                    {med.instructions || med.notes || <span style={{ color: theme === 'dark' ? '#d1d5db' : '#94a3b8' }}>—</span>}
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

                  const currentHM = format(new Date(), 'HH:mm')
                  const isPastSlot = slot !== 'PRN' && (d < today || (isToday && slot < currentHM))
                  const isMissed = !rec && isPastSlot

                  if (rec) {
                    const code = rec.mar_code
                    if (rec.given) { bg = '#d1fae5'; textColor = '#065f46'; display = code || 'G' }
                    else if (rec.refused) { bg = '#fee2e2'; textColor = '#991b1b'; display = code || 'R' }
                    else if (rec.omitted) { bg = '#fef9c3'; textColor = '#78350f'; display = code || 'O' }
                    else { bg = '#f3f4f6'; display = code || '—' }
                  } else if (isMissed) {
                    bg = '#fecaca'; textColor = '#991b1b'; display = 'M'
                  } else if (isToday && !isFuture) {
                    bg = '#fef3c720'
                  }

                  return (
                    <td key={d} onClick={() => onCellClick(med, d, dayRecs, slot)}
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
                        cursor: 'pointer',
                        fontWeight: 700,
                        lineHeight: 1.1,
                        transition: 'background 0.1s',
                      }}
                      className="hover:opacity-80">
                      <div>{display}</div>
                    </td>
                  )
                })}
              </tr>
            ))
          })}
        </tbody>
      </table>

      {/* Legend */}
      <div className="px-4 py-2.5 bg-slate-100 border-t-2 border-slate-300 text-xs text-slate-700">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1.5">
          <span className="font-bold text-slate-900">Key:</span>
          <span><span className="font-bold text-emerald-700 bg-emerald-100 px-1 rounded">JC</span> = Staff Initials (Administered)</span>
          <span className="text-slate-400">|</span>
          <span><span className="font-bold text-amber-700 bg-yellow-100 px-1 rounded">PRN</span> = As Required</span>
          <span className="text-slate-400">|</span>
          <span><span className="font-bold text-red-700 bg-red-100 px-1 rounded">X</span> = Refused</span>
          <span className="text-slate-400">|</span>
          <span><span className="font-bold text-yellow-700 bg-yellow-100 px-1 rounded">O</span> = Omitted</span>
          <span className="text-slate-400">|</span>
          <span><span className="font-bold text-red-800 bg-red-200 px-1 rounded">M</span> = Missed (not recorded)</span>
          <span className="text-slate-400">|</span>
          <span><span className="font-bold text-slate-500 bg-slate-200 px-1 rounded">—</span> = Not Recorded</span>
          <span className="text-slate-400">|</span>
          <span className="flex items-center gap-1"><span className="inline-block w-4 h-4 border-2 border-amber-400 bg-amber-50 rounded" /> = Today</span>
          <span className="text-slate-400">|</span>
          <span className="flex items-center gap-1">
            <PauseCircle className="w-3.5 h-3.5 text-amber-600" /> On Hold
          </span>
          <span className="text-slate-400">|</span>
          <span className="flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-blue-600" /> In Hospital
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500 italic">Click any past cell to log or view record</span>
        </div>
        <div className="font-mono text-slate-300 bg-white/5 border border-white/10 rounded px-3 py-1.5 leading-relaxed">
          <span className="font-bold text-slate-800">Attempted codes:</span>{' '}
          {['A','D','DC','E','F','H','L','MR','N','NR','NT','O','R','S','SM'].map((code, i, arr) => (
            <span key={code}>
              <span className="font-bold text-slate-900">{code}</span>
              {i < arr.length - 1 && <span className="text-slate-400">, </span>}
            </span>
          ))}
          {' '}<span className="text-slate-500">= Attempted</span>
          <span className="mx-3 text-slate-300">|</span>
          <span className="font-bold text-slate-800">A</span> = Administered
          <span className="mx-1 text-slate-300">|</span>
          <span className="font-bold text-slate-800">D</span> = Disposed
          <span className="mx-1 text-slate-300">|</span>
          <span className="font-bold text-slate-800">DC</span> = Discontinued
          <span className="mx-1 text-slate-300">|</span>
          <span className="font-bold text-slate-800">E</span> = Exempt
          <span className="mx-1 text-slate-300">|</span>
          <span className="font-bold text-slate-800">F</span> = Further Supply Needed
          <span className="mx-1 text-slate-300">|</span>
          <span className="font-bold text-slate-800">H</span> = Held
          <span className="mx-1 text-slate-300">|</span>
          <span className="font-bold text-slate-800">L</span> = Late
          <span className="mx-1 text-slate-300">|</span>
          <span className="font-bold text-slate-800">MR</span> = Medicine Refused
          <span className="mx-1 text-slate-300">|</span>
          <span className="font-bold text-slate-800">N</span> = Not Available
          <span className="mx-1 text-slate-300">|</span>
          <span className="font-bold text-slate-800">NR</span> = Not Required
          <span className="mx-1 text-slate-300">|</span>
          <span className="font-bold text-slate-800">NT</span> = Not Taken
          <span className="mx-1 text-slate-300">|</span>
          <span className="font-bold text-slate-800">O</span> = Omitted
          <span className="mx-1 text-slate-300">|</span>
          <span className="font-bold text-slate-800">R</span> = Refused
          <span className="mx-1 text-slate-300">|</span>
          <span className="font-bold text-slate-800">S</span> = Self-Medicated / Success
          <span className="mx-1 text-slate-300">|</span>
          <span className="font-bold text-slate-800">SM</span> = Self-Medicated
        </div>
      </div>
    </div>
  )
}

/* ─── Cell Detail Modal ────────────────────────────────────────────────── */
function CellDetailModal({ data, currentUser, onClose, onRefresh }: { data: any; currentUser: any; onClose: () => void; onRefresh: () => void }) {
  const { med, date, records } = data
  const rec = records[0]
  const [signingOff, setSigningOff] = useState(false)
  const isManager = currentUser?.role === 'home_manager' || currentUser?.role === 'group_admin'

  const signOffMgmt = async () => {
    if (!rec) return
    setSigningOff(true)
    try {
      await api.post(`/mar/records/${rec.id}/witness-signoff`, { mgmt: true })
      toast.success('Management sign-off recorded')
      onRefresh()
      onClose()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setSigningOff(false) }
  }

  return (
    <Modal open={true} onClose={onClose} title={med.medication_name} size="md">
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          {med.is_controlled && (
            <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-semibold">
              <Shield className="w-3 h-3" /> Controlled Drug (CD)
            </span>
          )}
          {med.is_prn && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-semibold">PRN</span>
          )}
        </div>

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

        {/* Controlled medication sign-off status */}
        {med.is_controlled && rec && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 space-y-2">
            <p className="text-xs font-bold text-purple-800 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Controlled Drug Sign-Off Status
            </p>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Administered by:</span>
                <span className="font-semibold text-slate-800">{rec.given_by_name || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Witness:</span>
                <span className="font-semibold text-slate-800">{rec.controlled_witness_name || 'Not selected'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Witness signed:</span>
                <span className={`font-semibold ${rec.controlled_witness_signed ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {rec.controlled_witness_signed
                    ? `Yes — ${rec.controlled_witness_signed_at ? format(new Date(rec.controlled_witness_signed_at), 'd MMM yyyy HH:mm') : ''}`
                    : 'Pending'}
                </span>
              </div>
              {rec.mgmt_sign_off_by && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Management sign-off:</span>
                  <span className="font-semibold text-emerald-700">
                    {rec.mgmt_sign_off_by} — {rec.mgmt_sign_off_at ? format(new Date(rec.mgmt_sign_off_at), 'd MMM HH:mm') : ''}
                  </span>
                </div>
              )}
            </div>
            {isManager && !rec.mgmt_sign_off_by && (
              <Button size="sm" loading={signingOff} onClick={signOffMgmt}
                className="w-full mt-2" icon={<UserCheck className="w-3.5 h-3.5" />}>
                Sign off as management
              </Button>
            )}
          </div>
        )}

        {records.length > 1 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">All records for this date:</p>
            <div className="space-y-1">
              {records.map((r: any, i: number) => (
                <div key={i} className="text-xs text-slate-600 flex gap-2">
                  <span className={`px-1.5 py-0.5 rounded font-bold ${r.given ? 'bg-emerald-100 text-emerald-700' : r.refused ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                    {r.mar_code || (r.given ? 'G' : r.refused ? 'R' : 'O')}
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

/* ─── Witness Sign-Off Modal (deep-link from notification) ─────────────── */
function WitnessSignOffModal({ recordId, onClose }: { recordId: string; onClose: () => void }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const signOff = async () => {
    setLoading(true)
    try {
      await api.post(`/mar/records/${recordId}/witness-signoff`, { mgmt: false })
      setDone(true)
      toast.success('Witness sign-off recorded')
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to sign off') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={true} onClose={onClose} title="Controlled Medication — Witness Sign-Off" size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-purple-50 border border-purple-200 rounded-xl">
          <Shield className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-purple-800">You have been selected as a witness</p>
            <p className="text-xs text-purple-600 mt-1">A colleague has administered a controlled medication and selected you as the witness. Please confirm you witnessed the administration.</p>
          </div>
        </div>
        {done ? (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 p-3 rounded-xl font-semibold">
            <Check className="w-4 h-4" /> Witness sign-off recorded successfully.
          </div>
        ) : (
          <Button loading={loading} onClick={signOff} className="w-full" icon={<UserCheck className="w-4 h-4" />}>
            Confirm — I witnessed this administration
          </Button>
        )}
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  )
}

/* ─── Log MAR Modal ────────────────────────────────────────────────────── */
export const MAR_CODE_OPTIONS = [
  { code: 'G',  label: 'Given',          desc: 'Administered',          color: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.4)',  given: true,  refused: false },
  { code: 'SM', label: 'Assisted',       desc: 'Prompted/assisted',     color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',   border: 'rgba(6,182,212,0.4)',   given: true,  refused: false },
  { code: 'S',  label: 'Self-med',       desc: 'Self-medicated',        color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.4)',  given: true,  refused: false },
  { code: 'R',  label: 'Refused',        desc: 'Resident refused',      color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.4)',   given: false, refused: true  },
  { code: 'MR', label: 'Med refused',    desc: 'Medicine refused',      color: '#f97316', bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.4)',  given: false, refused: true  },
  { code: 'A',  label: 'Attempted',      desc: 'Attempt made',          color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.4)',  given: false, refused: false },
  { code: 'D',  label: 'Early',          desc: 'Dosed early',           color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.4)',  given: false, refused: false },
  { code: 'L',  label: 'Late',           desc: 'Administered late',     color: '#6366f1', bg: 'rgba(99,102,241,0.12)',  border: 'rgba(99,102,241,0.4)',  given: false, refused: false },
  { code: 'N',  label: 'Not available',  desc: 'Stock not available',   color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.4)', given: false, refused: false },
  { code: 'O',  label: 'Omitted',        desc: 'Omitted/missed',        color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.4)',  given: false, refused: false },
  { code: 'NT', label: 'Not taken',      desc: 'Resident did not take', color: '#f43f5e', bg: 'rgba(244,63,94,0.12)',   border: 'rgba(244,63,94,0.4)',  given: false, refused: false },
  { code: 'NR', label: 'Not required',   desc: 'Not required today',    color: '#64748b', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.4)', given: false, refused: false },
  { code: 'F',  label: 'Fasted',         desc: 'Fasted/withheld',       color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.4)', given: false, refused: false },
  { code: 'H',  label: 'On hold',        desc: 'Medication on hold',    color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)',  border: 'rgba(14,165,233,0.4)',  given: false, refused: false },
  { code: 'DC', label: 'Discontinued',   desc: 'Discontinued',          color: '#78716c', bg: 'rgba(120,113,108,0.12)', border: 'rgba(120,113,108,0.4)', given: false, refused: false },
  { code: 'E',  label: 'Error',          desc: 'Medication error',      color: '#dc2626', bg: 'rgba(220,38,38,0.15)',   border: 'rgba(220,38,38,0.5)',  given: false, refused: false },
]

export function LogMARModal({ med, date, slot, suId, homeId, onClose, onSaved }: {
  med: any; date: string; slot: string; suId: string; homeId?: string; onClose: () => void; onSaved: () => void
}) {
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [staffList, setStaffList] = useState<any[]>([])
  const [witnessId, setWitnessId] = useState('')
  const [witnessName, setWitnessName] = useState('')
  const [amountTaken, setAmountTaken] = useState('')
  const [amountUnit, setAmountUnit] = useState('')
  const [sideEffects, setSideEffects] = useState(false)
  const [sideEffectsNotes, setSideEffectsNotes] = useState('')
  const [emotion, setEmotion] = useState<'red' | 'yellow' | 'green' | ''>('')
  const [completed, setCompleted] = useState(true)
  const [signoffId, setSignoffId] = useState('')
  const [signoffName, setSignoffName] = useState('')

  const selected = MAR_CODE_OPTIONS.find(o => o.code === selectedCode)
  const isControlled = med.is_controlled

  useEffect(() => {
    if (homeId) {
      api.get('/staff', { params: { homeId } }).then(res => {
        setStaffList(res.data.data || [])
      }).catch(() => {})
    }
  }, [homeId])

  const save = async () => {
    if (!selectedCode) { toast.error('Select an outcome'); return }
    if (isControlled && selected?.given && !witnessId) {
      toast.error('A witness is required for controlled medication administration'); return
    }
    setLoading(true)
    try {
      const payload: any = {
        suId, homeId, medicationId: med.id,
        given: selected?.given ?? false,
        refused: selected?.refused ?? false,
        marCode: selectedCode,
        notes: notes || undefined,
        reason: reason || undefined,
        scheduledTime: slot,
        recordDate: date,
        amountTaken: amountTaken || undefined,
        amountUnit: amountUnit || undefined,
        sideEffects,
        sideEffectsNotes: sideEffects ? (sideEffectsNotes || undefined) : undefined,
        emotion: emotion || undefined,
        completed,
        signoffRequestedBy: signoffId || undefined,
        signoffRequestedName: signoffId ? signoffName : undefined,
      }
      if (isControlled && witnessId) {
        payload.controlledWitnessId = witnessId
        payload.controlledWitnessName = witnessName
      }
      await api.post('/mar/records', payload)
      onSaved()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={true} onClose={onClose} title={`Log — ${med.medication_name}`} size="lg">
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        <div className="flex items-center gap-2">
          <p className="text-xs text-slate-400">{format(parseISO(date), 'EEEE, d MMMM yyyy')} · {slot}</p>
          {isControlled && (
            <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">
              <Shield className="w-3 h-3" /> Controlled Drug
            </span>
          )}
        </div>

        {(med.location_access_code || med.medicine_warning) && (
          <div className="space-y-1.5">
            {med.location_access_code && (
              <div className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                <span><span className="font-semibold">Location / Access:</span> {med.location_access_code}</span>
              </div>
            )}
            {med.medicine_warning && (
              <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span><span className="font-semibold">Warning:</span> {med.medicine_warning}</span>
              </div>
            )}
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Select outcome</p>
          <div className="grid grid-cols-4 gap-2">
            {MAR_CODE_OPTIONS.map(opt => {
              const isSelected = selectedCode === opt.code
              return (
                <button key={opt.code} onClick={() => setSelectedCode(opt.code)}
                  className="flex flex-col items-center gap-1 p-2.5 rounded-xl transition-all text-center"
                  style={{
                    background: isSelected ? opt.bg : 'rgba(255,255,255,0.04)',
                    border: `2px solid ${isSelected ? opt.border : 'rgba(255,255,255,0.08)'}`,
                    color: isSelected ? opt.color : '#94a3b8',
                  }}>
                  <span className="text-base font-black leading-none" style={{ color: isSelected ? opt.color : '#64748b' }}>{opt.code}</span>
                  <span className="text-[10px] font-medium leading-tight">{opt.label}</span>
                </button>
              )
            })}
          </div>
          {selected && (
            <p className="mt-2 text-xs text-center" style={{ color: selected.color }}>
              {selected.desc}
            </p>
          )}
        </div>

        {/* Witness selection — required for controlled medication when giving */}
        {isControlled && selected?.given && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 space-y-2">
            <p className="text-xs font-bold text-purple-800 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Witness required for controlled drug
            </p>
            <p className="text-xs text-purple-600">Select the colleague who witnessed the administration. They will receive a notification to confirm.</p>
            <select
              className="input text-sm"
              value={witnessId}
              onChange={e => {
                const s = staffList.find((x: any) => x.id === e.target.value)
                setWitnessId(e.target.value)
                setWitnessName(s ? `${s.first_name} ${s.last_name}` : '')
              }}>
              <option value="">— Select witness —</option>
              {staffList.map((s: any) => (
                <option key={s.id} value={s.id}>{s.first_name} {s.last_name}{s.role ? ` (${s.role})` : ''}</option>
              ))}
            </select>
            {witnessId && (
              <p className="text-xs text-purple-700 font-semibold">
                ✓ {witnessName} will be notified to sign off
              </p>
            )}
          </div>
        )}

        {(selected?.refused || selectedCode === 'A' || selectedCode === 'F' || selectedCode === 'H' || selectedCode === 'O' || selectedCode === 'E') && (
          <Input label="Reason / notes" value={reason} onChange={e => setReason(e.target.value)} placeholder="Enter reason..." />
        )}

        {selected?.given && (
          <div className="grid grid-cols-2 gap-3">
            <Input label="Amount taken" value={amountTaken} onChange={e => setAmountTaken(e.target.value)} placeholder="e.g. 1" />
            <div>
              <label className="label">Unit</label>
              <select className="input text-sm" value={amountUnit} onChange={e => setAmountUnit(e.target.value)}>
                <option value="">Please Select</option>
                <option value="tablet">Tablet(s)</option>
                <option value="ml">ml</option>
                <option value="mg">mg</option>
                <option value="drop">Drop(s)</option>
                <option value="puff">Puff(s)</option>
                <option value="application">Application</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        )}

        <div>
          <label className="label">Side effects</label>
          <select className="input text-sm" value={sideEffects ? 'yes' : 'no'} onChange={e => setSideEffects(e.target.value === 'yes')}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>
        {sideEffects && (
          <Input label="Side effect details" value={sideEffectsNotes} onChange={e => setSideEffectsNotes(e.target.value)} placeholder="Describe the side effects observed..." />
        )}

        <div>
          <label className="label">Additional notes (optional)</label>
          <textarea className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional notes..." />
        </div>

        <div>
          <label className="label">Request Signoff by</label>
          <select className="input text-sm" value={signoffId} onChange={e => {
            const s = staffList.find((x: any) => x.id === e.target.value)
            setSignoffId(e.target.value)
            setSignoffName(s ? `${s.first_name} ${s.last_name}` : '')
          }}>
            <option value="">Signoff not needed</option>
            {staffList.map((s: any) => (
              <option key={s.id} value={s.id}>{s.first_name} {s.last_name}{s.role ? ` (${s.role})` : ''}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Completed</label>
          <select className="input text-sm" value={completed ? 'yes' : 'no'} onChange={e => setCompleted(e.target.value === 'yes')}>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>

        <div>
          <p className="label mb-2">Emotion</p>
          <div className="flex items-center gap-4">
            {[
              { key: 'red', emoji: '☹️', label: 'Poor' },
              { key: 'yellow', emoji: '😐', label: 'Okay' },
              { key: 'green', emoji: '🙂', label: 'Good' },
            ].map(e => (
              <button key={e.key} type="button" onClick={() => setEmotion(e.key as any)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border-2 transition-all ${emotion === e.key ? 'border-purple-400 bg-purple-500/10' : 'border-white/10 opacity-60 hover:opacity-100'}`}>
                <span className="text-2xl">{e.emoji}</span>
                <span className="text-[10px] text-slate-400">{e.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-1">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={save} disabled={!selectedCode}>Save record</Button>
        </div>
      </div>
    </Modal>
  )
}

/* ─── Add Medication Modal ─────────────────────────────────────────────── */
function AddMedicationModal({ open, onClose, suId, homeId, onSaved }: { open: boolean; onClose: () => void; suId?: string; homeId?: string; onSaved: () => void }) {
  const BLANK = { medicationName: '', dose: '', frequency: '', route: '', medicineType: '', applyTime: '', prescribedBy: '', startDate: '', instructions: '', isPrn: false, isControlled: false, pharmacyName: '', pharmacyPhone: '', gpName: '', gpPhone: '', locationAccessCode: '', medicineWarning: '' }
  const [form, setForm] = useState(BLANK)
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.medicationName.trim()) { toast.error('Medication name is required'); return }
    if (!suId) { toast.error('No service user selected'); return }
    setLoading(true)
    try {
      await api.post('/mar/medications', { suId, homeId, ...form })
      setForm(BLANK)
      onSaved()
    }
    catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to save medication') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add medication" size="lg">
      <form onSubmit={save} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        <Input label="Medication name *" required value={form.medicationName} onChange={e => set('medicationName', e.target.value)} placeholder="e.g. Amlodipine, Paracetamol..." />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Apply date" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          <Input label="Apply time" type="time" value={form.applyTime} onChange={e => set('applyTime', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Medicine type" value={form.medicineType} onChange={e => set('medicineType', e.target.value)}
            options={[{ value: 'tablet', label: 'Tablet / Pill' }, { value: 'liquid', label: 'Liquid' }, { value: 'cream', label: 'Cream / Ointment' }, { value: 'inhaler', label: 'Inhaler' }, { value: 'injection', label: 'Injection' }, { value: 'patch', label: 'Patch' }, { value: 'drops', label: 'Drops' }, { value: 'other', label: 'Other' }]}
            placeholder="Select type" />
          <Select label="Route" value={form.route} onChange={e => set('route', e.target.value)} options={ROUTES} placeholder="Select route" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Dose" value={form.dose} onChange={e => set('dose', e.target.value)} placeholder="e.g. 5mg, 2 tablets..." />
          <Select label="Frequency" value={form.frequency} onChange={e => set('frequency', e.target.value)} options={FREQUENCIES} placeholder="Select frequency" />
        </div>
        <div>
          <label className="label">Directions / Instructions</label>
          <textarea className="input" rows={2} value={form.instructions} onChange={e => set('instructions', e.target.value)} placeholder="e.g. Take ONE 5ml spoonful twice daily after food..." />
        </div>
        <Input label="Prescribed by" value={form.prescribedBy} onChange={e => set('prescribedBy', e.target.value)} placeholder="GP or consultant name" />
        <div>
          <label className="label flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> Location / Access code</label>
          <textarea className="input" rows={2} value={form.locationAccessCode} onChange={e => set('locationAccessCode', e.target.value)} placeholder="Where is the medication stored? Any access instructions..." />
        </div>
        <div>
          <label className="label flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Medicine Warning</label>
          <textarea className="input" rows={2} value={form.medicineWarning} onChange={e => set('medicineWarning', e.target.value)} placeholder="e.g. May cause drowsiness. Do not stop taking without medical advice..." />
        </div>
        <div className="border-t pt-3">
          <p className="text-xs font-semibold text-slate-600 mb-3">Pharmacy & GP Details</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Pharmacy name" value={form.pharmacyName} onChange={e => set('pharmacyName', e.target.value)} placeholder="Pharmacy name" />
            <Input label="Pharmacy phone" value={form.pharmacyPhone} onChange={e => set('pharmacyPhone', e.target.value)} placeholder="Phone number" />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Input label="GP name" value={form.gpName} onChange={e => set('gpName', e.target.value)} placeholder="GP name" />
            <Input label="GP phone" value={form.gpPhone} onChange={e => set('gpPhone', e.target.value)} placeholder="Phone number" />
          </div>
        </div>
        <div className="border-t pt-3 space-y-3">
          <div className="flex items-center gap-2">
            <input type="checkbox" id="add-prn" checked={form.isPrn} onChange={e => set('isPrn', e.target.checked)} className="rounded" />
            <label htmlFor="add-prn" className="text-sm font-medium text-slate-700">This is a PRN (as required) medication</label>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-xl bg-purple-50 border border-purple-200">
            <input type="checkbox" id="add-controlled" checked={form.isControlled} onChange={e => set('isControlled', e.target.checked)} className="rounded mt-0.5" />
            <div>
              <label htmlFor="add-controlled" className="text-sm font-semibold text-purple-800 cursor-pointer">This is a controlled medication</label>
              <p className="text-xs text-purple-600 mt-0.5">Controlled drugs require two staff sign-offs when administered — the administering staff and a witness.</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading} icon={<Pill className="w-4 h-4" />}>Add medication</Button>
        </div>
      </form>
    </Modal>
  )
}

/* ─── Edit Medication Modal ────────────────────────────────────────────── */
function EditMedicationModal({ med, onClose, onSaved }: { med: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    dose: med.dose || '',
    frequency: med.frequency || '',
    route: med.route || '',
    medicineType: med.medicine_type || '',
    applyTime: med.apply_time || '',
    prescribedBy: med.prescribed_by || '',
    startDate: med.start_date ? med.start_date.split('T')[0] : '',
    instructions: med.instructions || '',
    locationAccessCode: med.location_access_code || '',
    medicineWarning: med.medicine_warning || '',
    isPrn: med.is_prn || false,
    isControlled: med.is_controlled || false,
    pharmacyName: med.pharmacy_name || '',
    pharmacyPhone: med.pharmacy_phone || '',
    gpName: med.gp_name || '',
    gpPhone: med.gp_phone || '',
  })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try { await api.patch(`/mar/medications/${med.id}`, form); onSaved() }
    catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={true} onClose={onClose} title={`Edit — ${med.medication_name}`} size="lg">
      <form onSubmit={save} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Apply date" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          <Input label="Apply time" type="time" value={form.applyTime} onChange={e => set('applyTime', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Medicine type" value={form.medicineType} onChange={e => set('medicineType', e.target.value)}
            options={[{ value: 'tablet', label: 'Tablet / Pill' }, { value: 'liquid', label: 'Liquid' }, { value: 'cream', label: 'Cream / Ointment' }, { value: 'inhaler', label: 'Inhaler' }, { value: 'injection', label: 'Injection' }, { value: 'patch', label: 'Patch' }, { value: 'drops', label: 'Drops' }, { value: 'other', label: 'Other' }]}
            placeholder="Select type" />
          <Select label="Route" value={form.route} onChange={e => set('route', e.target.value)} options={ROUTES} placeholder="Select route" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Dose" value={form.dose} onChange={e => set('dose', e.target.value)} placeholder="e.g. 5mg, 2 tablets..." />
          <Select label="Frequency" value={form.frequency} onChange={e => set('frequency', e.target.value)} options={FREQUENCIES} placeholder="Select frequency" />
        </div>
        <div>
          <label className="label">Directions / Instructions</label>
          <textarea className="input" rows={2} value={form.instructions} onChange={e => set('instructions', e.target.value)} placeholder="e.g. Take ONE 5ml spoonful twice daily after food..." />
        </div>
        <Input label="Prescribed by" value={form.prescribedBy} onChange={e => set('prescribedBy', e.target.value)} placeholder="GP or consultant name" />
        <div>
          <label className="label flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> Location / Access code</label>
          <textarea className="input" rows={2} value={form.locationAccessCode} onChange={e => set('locationAccessCode', e.target.value)} placeholder="Where is the medication stored? Any access instructions..." />
        </div>
        <div>
          <label className="label flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Medicine Warning</label>
          <textarea className="input" rows={2} value={form.medicineWarning} onChange={e => set('medicineWarning', e.target.value)} placeholder="e.g. May cause drowsiness. Do not stop taking without medical advice..." />
        </div>
        <div className="border-t pt-3">
          <p className="text-xs font-semibold text-slate-600 mb-3">Pharmacy & GP Details</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Pharmacy name" value={form.pharmacyName} onChange={e => set('pharmacyName', e.target.value)} placeholder="Pharmacy name" />
            <Input label="Pharmacy phone" value={form.pharmacyPhone} onChange={e => set('pharmacyPhone', e.target.value)} placeholder="Phone number" />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Input label="GP name" value={form.gpName} onChange={e => set('gpName', e.target.value)} placeholder="GP name" />
            <Input label="GP phone" value={form.gpPhone} onChange={e => set('gpPhone', e.target.value)} placeholder="Phone number" />
          </div>
        </div>
        <div className="border-t pt-3 space-y-3">
          <div className="flex items-center gap-2">
            <input type="checkbox" id="edit-prn" checked={form.isPrn} onChange={e => set('isPrn', e.target.checked)} className="rounded" />
            <label htmlFor="edit-prn" className="text-sm font-medium text-slate-700">This is a PRN (as required) medication</label>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-xl bg-purple-50 border border-purple-200">
            <input type="checkbox" id="edit-controlled" checked={form.isControlled} onChange={e => set('isControlled', e.target.checked)} className="rounded mt-0.5" />
            <div>
              <label htmlFor="edit-controlled" className="text-sm font-semibold text-purple-800 cursor-pointer">This is a controlled medication</label>
              <p className="text-xs text-purple-600 mt-0.5">Controlled drugs require two staff sign-offs when administered — the administering staff and a witness.</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading} icon={<Pill className="w-4 h-4" />}>Save changes</Button>
        </div>
      </form>
    </Modal>
  )
}

/* ─── MAR letterhead print ─────────────────────────────────────────────── */
const MAR_PRINT_CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Georgia,'Cambria','Times New Roman',serif;color:#1a1a1a;font-size:11px;line-height:1.4;background:#fff}
  .page{padding:10mm 10mm 12mm;page-break-after:always}
  .page:last-child{page-break-after:avoid}

  .letterhead{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2.5px solid #132a4f;padding-bottom:8px;margin-bottom:6px}
  .org-name{font-size:14px;font-weight:700;letter-spacing:.01em;color:#132a4f}
  .org-addr{font-size:9px;color:#444;margin-top:2px;font-family:Arial,sans-serif}
  .doc-meta{text-align:right;font-size:9px;color:#444;font-family:Arial,sans-serif;line-height:1.5}
  .doc-meta strong{color:#132a4f}

  .doc-title{font-family:Arial,sans-serif;font-weight:700;font-size:11.5px;color:#132a4f}
  .doc-sub{font-family:Arial,sans-serif;font-size:9.5px;color:#555}

  table.mar-grid{border-collapse:collapse;width:100%;table-layout:fixed;font-family:Arial,sans-serif}
  table.mar-grid th, table.mar-grid td{border:1px solid #999;font-size:8px;padding:2px 3px;text-align:center;vertical-align:top}
  table.mar-grid th{background:#f2f2f0;color:#132a4f;font-weight:700}
  table.mar-grid th.wk{background:#dbe4f0;color:#132a4f;font-size:9px}
  table.mar-grid td.med{text-align:left;font-weight:700;font-size:9px}
  table.mar-grid td.med .dose{font-weight:400;color:#444;font-size:8px}
  table.mar-grid td.dir{text-align:left;font-size:8px;color:#333}
  table.mar-grid tr.sig td{border:1px solid #ccc;height:16px;font-size:7.5px;text-align:left;padding:2px 4px}

  .legend{margin-top:6px;font-family:Arial,sans-serif;font-size:7.5px;color:#333;display:flex;gap:10px;flex-wrap:wrap}

  .footer{margin-top:10px;padding-top:6px;border-top:1px solid #999;display:flex;justify-content:space-between;font-family:Arial,sans-serif;font-size:8px;color:#555}
  .footer .confid{font-weight:700;letter-spacing:.05em;color:#132a4f}

  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    @page{margin:0;size:A4 landscape}
  }
`

function buildMarPrintBody(su: any, medications: any[], dates: string[], startDate: string, endDate: string): string {
  const fmt = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
  const esc = (v: any) => v === null || v === undefined || v === '' ? '—' : String(v)
  const suName = getName(su)
  const weeks = buildWeeks(dates)

  const pages = weeks.map((week, idx) => {
    const rows = medications.length === 0
      ? `<tr><td colspan="${3 + week.dates.length}" style="text-align:center;padding:10px;color:#666">No medications recorded</td></tr>`
      : medications.map((med: any) => {
          const slots: string[] = med.time_slots || FREQ_TIMES[med.frequency] || ['08:00']
          return slots.map((slot: string, si: number) => `
            <tr>
              ${si === 0 ? `<td class="med" rowspan="${slots.length}">${esc(med.medication_name)}${med.dose ? `<div class="dose">${esc(med.dose)}${med.route ? ` · ${esc(med.route)}` : ''}</div>` : ''}${med.is_prn ? '<div class="dose">PRN</div>' : ''}</td>` : ''}
              ${si === 0 ? `<td class="dir" rowspan="${slots.length}">${esc(med.instructions || med.notes)}</td>` : ''}
              <td style="font-weight:700">${slot}</td>
              ${week.dates.map((d: string) => {
                const dayRecs: any[] = med.records?.[d] || []
                const rec = slot === 'PRN' ? dayRecs[0] : dayRecs.find((r: any) => r.scheduled_time === slot) || (dayRecs.length === 1 && !dayRecs[0]?.scheduled_time ? dayRecs[0] : undefined)
                const bg = rec ? (rec.given ? '#d1fae5' : rec.refused ? '#fee2e2' : '#fef9c3') : '#fff'
                const code = rec ? (rec.mar_code || (rec.given ? 'G' : rec.refused ? 'R' : 'O')) : ''
                return `<td style="background:${bg}">${code}</td>`
              }).join('')}
            </tr>
          `).join('')
        }).join('')

    return `
    <div class="page">
      <div class="letterhead">
        <div>
          <div class="org-name">Comprehensive Care Ltd</div>
          <div class="org-addr">Ivy Business Centre, Office 3-13 Crown Street, Failsworth, Manchester, M35 9BG</div>
        </div>
        <div class="doc-meta">
          <div>Printed: <strong>${fmt(new Date().toISOString())}</strong></div>
          <div>Range: ${fmt(startDate)} – ${fmt(endDate)}</div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin:6px 0 8px">
        <div>
          <div class="doc-title">${esc(suName)} — Medication Administration Record</div>
          <div class="doc-sub">${su?.date_of_birth ? `DOB: ${fmt(su.date_of_birth)}` : ''}${su?.home_name ? ` · ${esc(su.home_name)}` : ''}${(su?.food_allergies || su?.allergies) ? ` · Allergies: ${esc([su.food_allergies, su.allergies].filter(Boolean).join(', '))}` : ''}${su?.med_allergies ? ` · Med allergies: ${esc(su.med_allergies)}` : ''}</div>
        </div>
        <div class="doc-sub" style="font-weight:700;color:#132a4f">${week.label}</div>
      </div>
      <table class="mar-grid">
        <colgroup><col style="width:150px"/><col style="width:130px"/><col style="width:36px"/>${week.dates.map(() => '<col/>').join('')}</colgroup>
        <thead>
          <tr>
            <th style="text-align:left">Medication</th>
            <th style="text-align:left">Directions</th>
            <th>Time</th>
            ${week.dates.map(d => `<th class="wk">${dayLetter(d)}<br/>${format(parseISO(d), 'd')}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="sig"><td colspan="${3 + week.dates.length}">Initials: _______  Name: ________________________  Signature: ________________________  Role: ____________  Date: __________</td></tr>
        </tbody>
      </table>
      <div class="legend">
        <span><strong>Key:</strong></span>
        <span style="background:#d1fae5;padding:0 3px">G</span> Given
        <span style="background:#fee2e2;padding:0 3px">R</span> Refused
        <span style="background:#fef9c3;padding:0 3px">O</span> Omitted
      </div>
      <div class="footer">
        <span class="confid">CONFIDENTIAL — Resident health record</span>
        <span>Page ${idx + 1} of ${weeks.length}</span>
      </div>
    </div>
    `
  }).join('')

  return pages
}

function printMarChart(su: any, medications: any[], dates: string[], startDate: string, endDate: string) {
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${getName(su)} — MAR</title><style>${MAR_PRINT_CSS}</style></head><body>${buildMarPrintBody(su, medications, dates, startDate, endDate)}</body></html>`
  const w = window.open('', '_blank')
  if (!w) { toast.error('Pop-up blocked — please allow pop-ups for this site and try again'); return }
  w.document.write(html)
  w.document.close()
  w.focus()
  w.print()
}

/* ─── Print Modal ──────────────────────────────────────────────────────── */
function PrintMARModal({ suId, su, startDate, endDate, onClose }: { suId: string; su: any; startDate: string; endDate: string; onClose: () => void }) {
  const [sd, setSd] = useState(startDate)
  const [ed, setEd] = useState(endDate)
  const [printing, setPrinting] = useState(false)

  const open = async () => {
    setPrinting(true)
    try {
      const chartRes = await api.get(`/mar/chart-report/${suId}`, { params: { startDate: sd, endDate: ed } })
      const chart = chartRes.data.data
      printMarChart(chart?.serviceUser || su, chart?.medications || [], chart?.dates || [], sd, ed)
      onClose()
    } catch {
      toast.error('Failed to load MAR data for printing')
    } finally {
      setPrinting(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose} title="Print Medication Administration Record" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-slate-500">Select date range to include in the printable Medication Administration Record.</p>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Start date" type="date" value={sd} onChange={e => setSd(e.target.value)} />
          <Input label="End date" type="date" value={ed} onChange={e => setEd(e.target.value)} />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button icon={<Printer className="w-4 h-4" />} loading={printing} onClick={open}>Print MAR</Button>
        </div>
      </div>
    </Modal>
  )
}

/* ─── GP & Pharmacy Tab ────────────────────────────────────────────────── */
function GPPharmacyTab({ su, medications }: { su: any; medications: any[] }) {
  const infoRow = (label: string, value: string | undefined) =>
    value ? (
      <tr key={label} className="border-b border-slate-100">
        <td className="py-2 pr-4 text-xs font-semibold text-slate-500 whitespace-nowrap w-36">{label}</td>
        <td className="py-2 text-sm text-slate-800">{value}</td>
      </tr>
    ) : null

  const medsWithGpOrPharm = medications.filter((m: any) => m.gp_name || m.pharmacy_name || m.gp_phone || m.pharmacy_phone)

  return (
    <div className="p-5 space-y-6 max-w-3xl">
      {/* GP Details */}
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 px-4 py-3 bg-blue-500/10 border-b border-blue-500/20">
          <Stethoscope className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-blue-800 text-sm">GP Details</span>
        </div>
        <div className="px-4 py-3">
          {su?.gp_name || su?.gp_phone || su?.gp_address ? (
            <table className="w-full">
              <tbody>
                {infoRow('GP Name', su.gp_name)}
                {infoRow('Phone', su.gp_phone)}
                {infoRow('Address', su.gp_address)}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-slate-400 italic py-2">No GP details recorded. Update via the resident's profile.</p>
          )}
        </div>
      </div>

      {/* Pharmacy Details */}
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border-b border-emerald-500/20">
          <Pill className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold text-emerald-800 text-sm">Pharmacy Details</span>
        </div>
        <div className="px-4 py-3">
          {su?.pharmacy_name || su?.pharmacy_phone || su?.pharmacy_address ? (
            <table className="w-full">
              <tbody>
                {infoRow('Pharmacy Name', su.pharmacy_name)}
                {infoRow('Phone', su.pharmacy_phone)}
                {infoRow('Address', su.pharmacy_address)}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-slate-400 italic py-2">No pharmacy details recorded. Update via the resident's profile.</p>
          )}
        </div>
      </div>

      {/* Per-medication GP/Pharmacy */}
      {medsWithGpOrPharm.length > 0 && (
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/10">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-300 text-sm">Medication-Specific GP / Pharmacy</span>
          </div>
          <div className="divide-y divide-slate-100">
            {medsWithGpOrPharm.map((med: any) => (
              <div key={med.id} className="px-4 py-3">
                <p className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5 text-purple-500" />
                  {med.medication_name}
                  {med.dose && <span className="text-xs font-normal text-slate-400">· {med.dose}</span>}
                </p>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  {(med.gp_name || med.gp_phone) && (
                    <div>
                      <p className="font-semibold text-slate-500 mb-1">GP</p>
                      {med.gp_name && <p className="text-slate-700">{med.gp_name}</p>}
                      {med.gp_phone && (
                        <p className="flex items-center gap-1 text-slate-600 mt-0.5">
                          <Phone className="w-3 h-3" /> {med.gp_phone}
                        </p>
                      )}
                    </div>
                  )}
                  {(med.pharmacy_name || med.pharmacy_phone) && (
                    <div>
                      <p className="font-semibold text-slate-500 mb-1">Pharmacy</p>
                      {med.pharmacy_name && <p className="text-slate-700">{med.pharmacy_name}</p>}
                      {med.pharmacy_phone && (
                        <p className="flex items-center gap-1 text-slate-600 mt-0.5">
                          <Phone className="w-3 h-3" /> {med.pharmacy_phone}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
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
