import React, { useEffect, useMemo, useState } from 'react'
import api, { suApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, Button, Modal } from '../../components/ui'
import { UniformFilterBar } from '../../components/ui/FilterBar'
import toast from 'react-hot-toast'
import { Smile, Save, AlertTriangle, Printer, Plus, Edit, Eye, ChevronUp } from 'lucide-react'
import { openLetterheadPrint, buildLetterheadPage, fmtDate, esc, nl, type PrintSection } from '../../utils/letterheadPrint'

const MOUTH_CONDITIONS = [
  'Healthy / pink', 'Dry / cracked lips', 'Coated tongue', 'Bleeding gums',
  'Ulcers / sores', 'Halitosis (bad breath)', 'Loose / missing teeth',
  'Swelling / inflammation', 'Thrush (white patches)', 'Pain / sensitivity',
]

const DENTURE_OPTIONS = ['N/A', 'Cleaned', 'Soaked overnight', 'Refused', 'Missing/broken']

const PRODUCTS = [
  'Toothbrush & fluoride toothpaste', 'Soft / ultra-soft toothbrush',
  'Electric toothbrush', 'Denture cleanser / soak', 'Mouthwash (alcohol-free)',
  'Saliva substitute / oral gel', 'Lip balm / barrier cream', 'Foam / oral swab',
]

const ASSISTANCE = [
  'Independent', 'Prompting only', 'Partial assistance', 'Full assistance',
]

const SESSIONS = ['Morning', 'Afternoon', 'Evening', 'Night']

function parseArr(val: any): string[] {
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      return Array.isArray(parsed) ? parsed : (val ? [val] : [])
    } catch {
      return val ? [val] : []
    }
  }
  return []
}

function printOralHygiene(residentName: string, records: any[]) {
  const sections: PrintSection[] = []
  if (!records.length) {
    sections.push({ title: 'Oral Hygiene Log', inner: `<p class="body-text muted">No oral hygiene records match the selected filters.</p>` })
    return { sections }
  }
  const rows = records.map(r => {
    const conds = parseArr(r.mouth_conditions)
    const prods = parseArr(r.products)
    return `
      <tr>
        <th>${r.recorded_at ? fmtDate(r.recorded_at) : '—'}<br/><span style="font-weight:normal;color:#64748b">${esc(r.su_name || residentName)} · ${esc(r.session)}</span></th>
        <td>
          <strong>${r.refused ? 'Refused' : esc(r.assistance || 'Completed')}</strong>
          ${r.upper_denture ? `<br/>Upper denture: ${esc(r.upper_denture)}` : ''}
          ${r.lower_denture ? `<br/>Lower denture: ${esc(r.lower_denture)}` : ''}
          ${conds.length ? `<br/>Mouth condition: ${esc(conds.join(', '))}` : ''}
          ${prods.length ? `<br/>Products used: ${esc(prods.join(', '))}` : ''}
          ${r.notes ? `<br/><em>${nl(r.notes)}</em>` : ''}
          ${r.staff_name ? `<br/><span style="color:#64748b;font-size:11px">Recorded by ${esc(r.staff_name)}</span>` : ''}
        </td>
      </tr>
    `
  }).join('')
  sections.push({ title: 'Oral Care Records', inner: `<table class="fields">${rows}</table>` })
  return { sections }
}

export default function OralHygiene() {
  const { user } = useAuth()
  const [residents, setResidents] = useState<any[]>([])
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Uniform filter bar state
  const [filterSu, setFilterSu] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterSession, setFilterSession] = useState('')

  // Collapsible new entry form state
  const [formOpen, setFormOpen] = useState(false)
  const [formSu, setFormSu] = useState('')
  const [session, setSession] = useState('Morning')
  const [mouthConditions, setMouthConditions] = useState<string[]>([])
  const [upperDenture, setUpperDenture] = useState('N/A')
  const [lowerDenture, setLowerDenture] = useState('N/A')
  const [products, setProducts] = useState<string[]>([])
  const [assistance, setAssistance] = useState('Independent')
  const [refused, setRefused] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // View / Edit modal state for existing oral care record
  const [activeRecord, setActiveRecord] = useState<any | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({
    session: 'Morning',
    mouthConditions: [] as string[],
    upperDenture: 'N/A',
    lowerDenture: 'N/A',
    products: [] as string[],
    assistance: 'Independent',
    refused: false,
    notes: '',
  })
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (!user?.homeId) return
    suApi.list(user.homeId).then(r => setResidents(r.data.data || [])).catch(() => {})
  }, [user?.homeId])

  const loadRecords = async () => {
    if (!user?.homeId) return
    setLoading(true)
    try {
      const r = await api.get('/clinical/oral-hygiene', {
        params: {
          homeId: user.homeId,
          suId: filterSu || undefined,
          from: dateFrom || undefined,
          to: dateTo || undefined,
          session: filterSession || undefined,
        },
      })
      setRecords(r.data.data || [])
    } catch {
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecords()
  }, [user?.homeId, filterSu, dateFrom, dateTo, filterSession])

  useEffect(() => {
    if (filterSu) setFormSu(filterSu)
  }, [filterSu])

  const filteredRecords = useMemo(() => {
    if (!search.trim()) return records
    const q = search.toLowerCase()
    return records.filter(r => {
      const conds = parseArr(r.mouth_conditions).join(' ')
      const prods = parseArr(r.products).join(' ')
      return (
        String(r.su_name || '').toLowerCase().includes(q) ||
        String(r.staff_name || '').toLowerCase().includes(q) ||
        String(r.session || '').toLowerCase().includes(q) ||
        String(r.assistance || '').toLowerCase().includes(q) ||
        String(r.notes || '').toLowerCase().includes(q) ||
        conds.toLowerCase().includes(q) ||
        prods.toLowerCase().includes(q)
      )
    })
  }, [records, search])

  const toggle = (list: string[], set: (v: string[]) => void, val: string) =>
    set(list.includes(val) ? list.filter(x => x !== val) : [...list, val])

  const handlePrint = () => {
    const resident = residents.find(r => r.id === filterSu)
    const residentName = resident ? `${resident.first_name} ${resident.last_name}` : 'All Service Users'
    const { sections } = printOralHygiene(residentName, filteredRecords)
    const body = buildLetterheadPage({
      docTitle: 'Oral Hygiene Log',
      docSubtitle: 'Mouth care sessions, oral health observations & assistance records',
      docRefPrefix: 'OH',
      docRefId: filterSu || 'ALL',
      residentName,
      sections,
    })
    openLetterheadPrint(`${residentName} — Oral Care`, body)
  }

  const save = async () => {
    const targetSu = formSu || filterSu
    if (!targetSu) {
      toast.error('Please select a service user')
      return
    }
    setSaving(true)
    try {
      await api.post('/clinical/oral-hygiene', {
        suId: targetSu,
        homeId: user?.homeId,
        session,
        mouthConditions,
        upperDenture,
        lowerDenture,
        products,
        assistance,
        refused,
        notes,
        staffId: user?.id,
      })
      toast.success('Oral hygiene session recorded')
      setMouthConditions([])
      setUpperDenture('N/A')
      setLowerDenture('N/A')
      setProducts([])
      setAssistance('Independent')
      setRefused(false)
      setNotes('')
      setFormOpen(false)
      await loadRecords()
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to save oral care record')
    } finally {
      setSaving(false)
    }
  }

  const openRecordModal = (rec: any, startEditing = false) => {
    setActiveRecord(rec)
    setEditMode(startEditing)
    setEditForm({
      session: rec.session || 'Morning',
      mouthConditions: parseArr(rec.mouth_conditions),
      upperDenture: rec.upper_denture || 'N/A',
      lowerDenture: rec.lower_denture || 'N/A',
      products: parseArr(rec.products),
      assistance: rec.assistance || 'Independent',
      refused: Boolean(rec.refused),
      notes: rec.notes || '',
    })
  }

  const saveEditedRecord = async () => {
    if (!activeRecord) return
    setUpdating(true)
    try {
      await api.put(`/clinical/oral-hygiene/${activeRecord.id}`, {
        session: editForm.session,
        mouthConditions: editForm.mouthConditions,
        upperDenture: editForm.upperDenture,
        lowerDenture: editForm.lowerDenture,
        products: editForm.products,
        assistance: editForm.assistance,
        refused: editForm.refused,
        notes: editForm.notes,
      })
      toast.success('Oral hygiene record updated')
      setActiveRecord(null)
      setEditMode(false)
      await loadRecords()
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to update oral care record')
    } finally {
      setUpdating(false)
    }
  }

  const personOptions = useMemo(
    () => residents.map(r => ({ value: r.id, label: `${r.first_name} ${r.last_name}` })),
    [residents]
  )

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Smile className="w-6 h-6 text-sky-500" /> Oral Hygiene
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Mouth care logs, denture care &amp; oral health observations</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg px-3 py-2 bg-white print:hidden"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          <Button
            icon={formOpen ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            onClick={() => setFormOpen(v => !v)}
          >
            {formOpen ? 'Hide Entry Form' : 'Record Session'}
          </Button>
        </div>
      </div>

      {/* Uniform Filter Bar */}
      <UniformFilterBar
        personLabel="Service User"
        personAllLabel="All Service Users"
        personValue={filterSu}
        onPersonChange={setFilterSu}
        personOptions={personOptions}
        searchPlaceholder="Search resident, staff, assistance, mouth condition, notes..."
        searchValue={search}
        onSearchChange={setSearch}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        extraSelects={[
          {
            id: 'session',
            label: 'Session',
            allLabel: 'All Sessions',
            value: filterSession,
            onChange: setFilterSession,
            options: SESSIONS.map(s => ({ value: s, label: s })),
          },
        ]}
        onClear={() => {
          setFilterSu('')
          setSearch('')
          setDateFrom('')
          setDateTo('')
          setFilterSession('')
        }}
        shownCount={filteredRecords.length}
        totalCount={records.length}
      />

      {/* Collapsible New Oral Care Session Form */}
      {formOpen && (
        <div className="bg-white text-slate-900 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3 bg-slate-50/80">
            <h2 className="font-bold text-slate-900">Record Oral Care Session</h2>
            <div className="flex rounded-xl border border-slate-200 overflow-hidden">
              {SESSIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSession(s)}
                  className={`px-3.5 py-1.5 text-xs font-bold transition-all ${session === s ? 'bg-sky-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 space-y-5 text-slate-900">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2 block">Service User *</label>
              <select
                className="input w-full max-w-sm text-slate-900 bg-white"
                value={formSu}
                onChange={e => setFormSu(e.target.value)}
              >
                <option value="">— Select service user —</option>
                {residents.map(r => (
                  <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2 block">Mouth Condition</label>
              <div className="flex flex-wrap gap-2">
                {MOUTH_CONDITIONS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggle(mouthConditions, setMouthConditions, c)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                      mouthConditions.includes(c)
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2 block">Upper Denture</label>
                <select className="input w-full text-slate-900 bg-white" value={upperDenture} onChange={e => setUpperDenture(e.target.value)}>
                  {DENTURE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2 block">Lower Denture</label>
                <select className="input w-full text-slate-900 bg-white" value={lowerDenture} onChange={e => setLowerDenture(e.target.value)}>
                  {DENTURE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2 block">Assistance Required</label>
                <select className="input w-full text-slate-900 bg-white" value={assistance} onChange={e => setAssistance(e.target.value)}>
                  {ASSISTANCE.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2 block">Products Used</label>
              <div className="flex flex-wrap gap-2">
                {PRODUCTS.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => toggle(products, setProducts, p)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                      products.includes(p)
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <label className="flex items-center gap-2.5 cursor-pointer text-sm font-semibold text-slate-900">
                <input type="checkbox" className="w-4 h-4 accent-amber-600" checked={refused} onChange={e => setRefused(e.target.checked)} />
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Care refused by service user
              </label>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1.5 block">Notes &amp; Oral Health Observations</label>
              <textarea className="input w-full text-slate-900 bg-white" rows={2} placeholder="Observations, refusal context, or dental escalation..." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button icon={<Save className="w-4 h-4" />} onClick={save} loading={saving}>Save Session</Button>
            </div>
          </div>
        </div>
      )}

      {/* High-Contrast Oral Hygiene History Table — GUARANTEED #0f172a on #ffffff */}
      <div className="bg-white text-slate-900 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <h2 className="font-bold text-slate-900">Recent Oral Hygiene Records ({filteredRecords.length})</h2>
          <span className="text-xs font-medium text-slate-500">Click any row to view full record or edit</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">
            No oral hygiene records found for the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-900">
              <thead className="bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-800 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left text-slate-800">Date / Time</th>
                  <th className="px-4 py-3 text-left text-slate-800">Service User</th>
                  <th className="px-4 py-3 text-left text-slate-800">Session</th>
                  <th className="px-4 py-3 text-left text-slate-800">Assistance</th>
                  <th className="px-4 py-3 text-left text-slate-800">Mouth Condition</th>
                  <th className="px-4 py-3 text-left text-slate-800">Status</th>
                  <th className="px-4 py-3 text-left text-slate-800">Recorded By</th>
                  <th className="px-4 py-3 text-right text-slate-800">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white text-slate-900">
                {filteredRecords.map((r: any) => {
                  const conds = parseArr(r.mouth_conditions)
                  return (
                    <tr
                      key={r.id}
                      onClick={() => openRecordModal(r, false)}
                      className="even:bg-slate-50/60 hover:bg-sky-50/70 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 text-xs font-semibold text-slate-900 whitespace-nowrap">
                        {r.recorded_at ? format(new Date(r.recorded_at), 'dd MMM yyyy, HH:mm') : '—'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                        {r.su_name || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-900">
                          {r.session || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-800">
                        {r.assistance || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700 max-w-xs truncate">
                        {conds.length > 0 ? conds.join(', ') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {r.refused ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">Refused</span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">Completed</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-700 whitespace-nowrap">
                        {r.staff_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openRecordModal(r, false)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                          <button
                            type="button"
                            onClick={() => openRecordModal(r, true)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100"
                          >
                            <Edit className="w-3.5 h-3.5" /> Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View / Edit Completed Oral Care Modal */}
      {activeRecord && (
        <Modal
          open={true}
          onClose={() => { setActiveRecord(null); setEditMode(false) }}
          title={editMode ? `Edit Oral Hygiene — ${activeRecord.su_name || ''}` : `Oral Hygiene Record — ${activeRecord.su_name || ''}`}
          size="lg"
        >
          <div className="bg-white text-slate-900 rounded-xl p-4 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-200">
              <div className="text-xs text-slate-600">
                <strong className="text-slate-900 text-sm">{activeRecord.su_name}</strong>
                {' · '}
                {activeRecord.recorded_at ? format(new Date(activeRecord.recorded_at), 'dd MMM yyyy, HH:mm') : ''}
                {activeRecord.staff_name ? ` · Recorded by ${activeRecord.staff_name}` : ''}
              </div>
              {!editMode && (
                <button
                  type="button"
                  onClick={() => setEditMode(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-600 text-white hover:bg-sky-700"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit Record
                </button>
              )}
            </div>

            {!editMode ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold uppercase text-slate-500 block mb-1">Session</span>
                  <span className="text-sm font-semibold text-slate-900">{activeRecord.session || '—'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold uppercase text-slate-500 block mb-1">Assistance Level</span>
                  <span className="text-sm font-semibold text-slate-900">{activeRecord.assistance || '—'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold uppercase text-slate-500 block mb-1">Upper / Lower Denture</span>
                  <span className="text-sm font-semibold text-slate-900">
                    Upper: {activeRecord.upper_denture || 'N/A'} · Lower: {activeRecord.lower_denture || 'N/A'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold uppercase text-slate-500 block mb-1">Status</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {activeRecord.refused ? 'Refused' : 'Completed'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 sm:col-span-2">
                  <span className="font-bold uppercase text-slate-500 block mb-1">Mouth Condition Selected</span>
                  <span className="text-sm text-slate-900">{parseArr(activeRecord.mouth_conditions).join(', ') || 'None recorded'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 sm:col-span-2">
                  <span className="font-bold uppercase text-slate-500 block mb-1">Products Used</span>
                  <span className="text-sm text-slate-900">{parseArr(activeRecord.products).join(', ') || 'None recorded'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 sm:col-span-2">
                  <span className="font-bold uppercase text-slate-500 block mb-1">Notes</span>
                  <span className="text-sm text-slate-900 whitespace-pre-wrap">{activeRecord.notes || 'No notes recorded'}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 mb-1 block">Session</label>
                    <select className="input w-full text-slate-900 bg-white" value={editForm.session} onChange={e => setEditForm(f => ({ ...f, session: e.target.value }))}>
                      {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 mb-1 block">Assistance</label>
                    <select className="input w-full text-slate-900 bg-white" value={editForm.assistance} onChange={e => setEditForm(f => ({ ...f, assistance: e.target.value }))}>
                      {ASSISTANCE.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 mb-1 block">Upper Denture</label>
                    <select className="input w-full text-slate-900 bg-white" value={editForm.upperDenture} onChange={e => setEditForm(f => ({ ...f, upperDenture: e.target.value }))}>
                      {DENTURE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 mb-1 block">Lower Denture</label>
                    <select className="input w-full text-slate-900 bg-white" value={editForm.lowerDenture} onChange={e => setEditForm(f => ({ ...f, lowerDenture: e.target.value }))}>
                      {DENTURE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 mb-1.5 block">Mouth Condition</label>
                  <div className="flex flex-wrap gap-1.5">
                    {MOUTH_CONDITIONS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditForm(f => ({
                          ...f,
                          mouthConditions: f.mouthConditions.includes(c) ? f.mouthConditions.filter(x => x !== c) : [...f.mouthConditions, c],
                        }))}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                          editForm.mouthConditions.includes(c) ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 mb-1.5 block">Products Used</label>
                  <div className="flex flex-wrap gap-1.5">
                    {PRODUCTS.map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setEditForm(f => ({
                          ...f,
                          products: f.products.includes(p) ? f.products.filter(x => x !== p) : [...f.products, p],
                        }))}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                          editForm.products.includes(p) ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <input type="checkbox" checked={editForm.refused} onChange={e => setEditForm(f => ({ ...f, refused: e.target.checked }))} />
                  Care refused
                </label>

                <textarea
                  className="input w-full text-slate-900 bg-white"
                  rows={2}
                  placeholder="Clinical notes..."
                  value={editForm.notes}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                />

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setEditMode(false)}>Cancel</Button>
                  <Button icon={<Save className="w-4 h-4" />} onClick={saveEditedRecord} loading={updating}>Save Changes</Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
