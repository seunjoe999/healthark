import React, { useEffect, useState, useCallback } from 'react'
import api, { suApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, Button, Modal } from '../../components/ui'
import { UniformFilterBar } from '../../components/ui/FilterBar'
import toast from 'react-hot-toast'
import { Droplet, Save, Printer, AlertTriangle, Download, Eye, Edit } from 'lucide-react'
import { openLetterheadPrint, buildLetterheadPage, fmtDate, esc, type PrintSection } from '../../utils/letterheadPrint'

const CATHETER_TYPES = ['Urethral', 'Suprapubic', 'Intermittent']
const URINE_COLOURS = ['Clear/pale yellow (normal)', 'Dark yellow', 'Amber/brown', 'Pink/red (haematuria)', 'Cloudy', 'Offensive smell']
const COMPLICATIONS = ['Leakage/bypassing', 'Blockage/no drainage', 'Blood in urine', 'Infection signs (fever/pain)', 'Catheter fallen out', 'Visible debris', 'Skin irritation at site', 'Pain/discomfort']
const ACTIONS = ['Bag emptied and measured', 'Bag changed', 'Catheter cleaned (ANTT)', 'Leg bag to night bag', 'Night bag to leg bag', 'Catheter flushed', 'Catheter changed', 'GP/nurse informed', 'TWOC commenced']

function parseList(val: any): string[] {
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return val ? [val] : []
    }
  }
  return []
}

export default function CatheterCare() {
  const { user } = useAuth()
  const [residents, setResidents] = useState<any[]>([])
  const [selectedSu, setSelectedSu] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Catheter details (setup)
  const [showSetup, setShowSetup] = useState(false)
  const [catheterType, setCatheterType] = useState('')
  const [cathSize, setCathSize] = useState('')
  const [insertedDate, setInsertedDate] = useState('')
  const [changeDate, setChangeDate] = useState('')
  const [batchNo, setBatchNo] = useState('')

  // Daily log
  const [urineColour, setUrineColour] = useState('')
  const [urineAmount, setUrineAmount] = useState('')
  const [complications, setComplications] = useState<string[]>([])
  const [actions, setActions] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Clickable completed form view / edit modal state
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null)
  const [editCatheterType, setEditCatheterType] = useState('')
  const [editCathSize, setEditCathSize] = useState('')
  const [editInsertedDate, setEditInsertedDate] = useState('')
  const [editChangeDate, setEditChangeDate] = useState('')
  const [editBatchNo, setEditBatchNo] = useState('')
  const [editUrineColour, setEditUrineColour] = useState('')
  const [editUrineAmount, setEditUrineAmount] = useState('')
  const [editComplications, setEditComplications] = useState<string[]>([])
  const [editActions, setEditActions] = useState<string[]>([])
  const [editNotes, setEditNotes] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (!user?.homeId) return
    suApi.list(user.homeId, { status: 'live' }).then(r => setResidents(r.data.data || [])).catch(() => {})
  }, [user])

  const loadRecords = useCallback(async () => {
    if (!user?.homeId) return
    setLoading(true)
    try {
      const r = await api.get('/clinical/catheter', {
        params: {
          homeId: user.homeId,
          suId: selectedSu || undefined,
          from: dateFrom || undefined,
          to: dateTo || undefined,
          search: search.trim() || undefined,
        },
      })
      setHistory(r.data.data || [])
    } catch {
      if (selectedSu) {
        try {
          const r2 = await api.get(`/clinical/catheter/${selectedSu}`)
          setHistory(r2.data.data || [])
        } catch {
          setHistory([])
        }
      } else {
        setHistory([])
      }
    } finally {
      setLoading(false)
    }
  }, [user?.homeId, selectedSu, dateFrom, dateTo, search])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  const toggle = (val: string, list: string[], setList: (v: string[]) => void) =>
    setList(list.includes(val) ? list.filter(x => x !== val) : [...list, val])

  const hasComplications = complications.length > 0

  const save = async () => {
    if (!selectedSu) {
      toast.error('Please select a Service User above to log a new entry')
      return
    }
    if (!urineColour) {
      toast.error('Please select Urine Appearance')
      return
    }
    setSaving(true)
    try {
      await api.post('/clinical/catheter', {
        suId: selectedSu,
        homeId: user?.homeId,
        catheterType: showSetup || !latestSetup ? catheterType : latestSetup?.catheter_type,
        cathSize: showSetup || !latestSetup ? cathSize : latestSetup?.cath_size,
        insertedDate: showSetup || !latestSetup ? insertedDate : latestSetup?.inserted_date,
        changeDate: showSetup || !latestSetup ? changeDate : latestSetup?.change_date,
        batchNo: showSetup || !latestSetup ? batchNo : latestSetup?.batch_no,
        urineColour,
        urineAmountMl: urineAmount ? parseFloat(urineAmount) : null,
        complications,
        actions,
        notes,
        staffId: user?.id,
      })
      toast.success('Catheter care record saved')
      await loadRecords()
      setUrineColour('')
      setUrineAmount('')
      setComplications([])
      setActions([])
      setNotes('')
      setShowSetup(false)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const openRecordModal = (rec: any) => {
    setSelectedRecord(rec)
    setEditCatheterType(rec.catheter_type || '')
    setEditCathSize(rec.cath_size || '')
    setEditInsertedDate(rec.inserted_date ? String(rec.inserted_date).slice(0, 10) : '')
    setEditChangeDate(rec.change_date ? String(rec.change_date).slice(0, 10) : '')
    setEditBatchNo(rec.batch_no || '')
    setEditUrineColour(rec.urine_colour || '')
    setEditUrineAmount(rec.urine_amount_ml != null ? String(rec.urine_amount_ml) : '')
    setEditComplications(parseList(rec.complications))
    setEditActions(parseList(rec.actions))
    setEditNotes(rec.notes || '')
  }

  const saveEditedRecord = async () => {
    if (!selectedRecord) return
    setUpdating(true)
    try {
      await api.put(`/clinical/catheter/${selectedRecord.id}`, {
        catheterType: editCatheterType,
        cathSize: editCathSize,
        insertedDate: editInsertedDate || null,
        changeDate: editChangeDate || null,
        batchNo: editBatchNo,
        urineColour: editUrineColour,
        urineAmountMl: editUrineAmount !== '' ? parseFloat(editUrineAmount) : null,
        complications: editComplications,
        actions: editActions,
        notes: editNotes,
      })
      toast.success('Catheter care entry updated')
      setSelectedRecord(null)
      await loadRecords()
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to update entry')
    } finally {
      setUpdating(false)
    }
  }

  const residentHistory = selectedSu ? history.filter(h => h.su_id === selectedSu) : history
  const latestSetup = residentHistory.find(h => h.catheter_type)
  const nextChange = latestSetup?.change_date ? new Date(latestSetup.change_date) : null
  const daysToChange = nextChange ? Math.ceil((nextChange.getTime() - Date.now()) / 86400000) : null

  const printSingleRecord = (rec: any) => {
    const comps = parseList(rec.complications)
    const acts = parseList(rec.actions)
    const body = buildLetterheadPage({
      docTitle: 'Completed Catheter Care Record',
      docSubtitle: 'Individual completed clinical care form',
      docRefPrefix: 'CC',
      docRefId: String(rec.id || '—').slice(0, 8),
      residentName: rec.su_name || 'Resident',
      sections: [
        {
          title: 'Catheter Care Form Details',
          inner: `<table class="fields">
            <tr><th>Resident</th><td>${esc(rec.su_name || '—')}</td></tr>
            <tr><th>Date &amp; Time Recorded</th><td>${rec.recorded_at ? fmtDate(rec.recorded_at) : '—'}</td></tr>
            <tr><th>Recorded By</th><td>${esc(rec.staff_name || '—')}</td></tr>
            <tr><th>Catheter Type</th><td>${esc(rec.catheter_type || '—')}</td></tr>
            <tr><th>Size (Fr)</th><td>${rec.cath_size ? `Fr ${esc(rec.cath_size)}` : '—'}</td></tr>
            <tr><th>Date Inserted</th><td>${rec.inserted_date ? fmtDate(rec.inserted_date) : '—'}</td></tr>
            <tr><th>Next Change Due</th><td>${rec.change_date ? fmtDate(rec.change_date) : '—'}</td></tr>
            <tr><th>Batch Number</th><td>${esc(rec.batch_no || '—')}</td></tr>
            <tr><th>Urine Appearance</th><td>${esc(rec.urine_colour || '—')}</td></tr>
            <tr><th>Amount Drained</th><td>${rec.urine_amount_ml != null ? `${esc(rec.urine_amount_ml)} ml` : '—'}</td></tr>
            <tr><th>Complications Selected</th><td>${comps.length ? esc(comps.join(', ')) : 'None reported'}</td></tr>
            <tr><th>Care Actions Completed</th><td>${acts.length ? esc(acts.join(', ')) : '—'}</td></tr>
            <tr><th>Clinical Notes</th><td>${esc(rec.notes || '—')}</td></tr>
          </table>`,
        },
      ],
    })
    openLetterheadPrint(`${rec.su_name || 'Resident'} — Catheter Care Entry`, body)
  }

  const handlePrint = () => {
    const resident = residents.find(r => r.id === selectedSu)
    const residentName = resident ? `${resident.first_name} ${resident.last_name}` : 'All Service Users'
    const sections: PrintSection[] = []

    if (selectedSu && latestSetup) {
      sections.push({
        title: 'Catheter Details',
        inner: `<table class="fields">
          <tr><th>Type</th><td>${esc(latestSetup.catheter_type)}</td></tr>
          <tr><th>Size</th><td>Fr ${esc(latestSetup.cath_size || '—')}</td></tr>
          <tr><th>Date Inserted</th><td>${latestSetup.inserted_date ? fmtDate(latestSetup.inserted_date) : '—'}</td></tr>
          <tr><th>Next Change Due</th><td>${latestSetup.change_date ? fmtDate(latestSetup.change_date) : '—'}</td></tr>
        </table>`,
      })
    }

    if (history.length) {
      const rows = history.map((h: any) => {
        const comps = parseList(h.complications)
        const acts = parseList(h.actions)
        return `
        <tr>
          <th>${h.recorded_at ? fmtDate(h.recorded_at) : '—'}<br/><span style="font-weight:700;font-size:10px">${esc(h.su_name || '')}</span>${h.staff_name ? `<br/><span style="font-weight:400;font-size:8.5px">By ${esc(h.staff_name)}</span>` : ''}</th>
          <td>
            <strong>Urine:</strong> ${esc(h.urine_colour || '—')}${h.urine_amount_ml != null ? ` · ${esc(h.urine_amount_ml)} ml` : ''}
            ${h.catheter_type ? `<br/><strong>Catheter:</strong> ${esc(h.catheter_type)}${h.cath_size ? ` (Fr ${esc(h.cath_size)})` : ''}` : ''}
            ${comps.length ? `<br/><strong style="color:#b91c1c">Complications:</strong> ${esc(comps.join(', '))}` : ''}
            ${acts.length ? `<br/><strong>Actions:</strong> ${esc(acts.join(', '))}` : ''}
            ${h.notes ? `<br/><em>${esc(h.notes)}</em>` : ''}
          </td>
        </tr>`
      }).join('')
      sections.push({ title: `Catheter Care Logs (${history.length})`, inner: `<table class="fields">${rows}</table>` })
    } else {
      sections.push({ title: 'Catheter Care Log', inner: `<p class="body-text muted">No catheter care records recorded for the selected filters.</p>` })
    }

    const body = buildLetterheadPage({
      docTitle: 'Catheter Care Log',
      docSubtitle: 'Urinary catheter management and daily care record',
      docRefPrefix: 'CC',
      docRefId: selectedSu || format(new Date(), 'yyyyMMdd'),
      residentName,
      sections,
    })
    openLetterheadPrint(`${residentName} — Catheter Care Log`, body)
  }

  const handleDownloadCsv = () => {
    const headers = ['Date & Time', 'Service User', 'Catheter Type', 'Size (Fr)', 'Urine Appearance', 'Amount (ml)', 'Complications', 'Actions Completed', 'Notes', 'Recorded By']
    const rows = history.map((h: any) => [
      h.recorded_at ? format(new Date(h.recorded_at), 'yyyy-MM-dd HH:mm') : '',
      h.su_name || '',
      h.catheter_type || '',
      h.cath_size || '',
      h.urine_colour || '',
      h.urine_amount_ml ?? '',
      parseList(h.complications).join('; '),
      parseList(h.actions).join('; '),
      h.notes || '',
      h.staff_name || '',
    ])
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `catheter-care-log-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const suOptions = residents.map(r => ({ value: r.id, label: `${r.first_name} ${r.last_name}` }))

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Droplet className="w-6 h-6 text-blue-500" />
            Catheter Care Log
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Filter by resident or date range, print/export logs, and click any completed entry below to view or edit the full form
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-300 rounded-lg px-3.5 py-2 bg-white shadow-sm"
          >
            <Download className="w-4 h-4 text-blue-600" /> Download CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 text-xs font-semibold text-white rounded-lg px-3.5 py-2 shadow-sm"
            style={{ background: '#2563eb' }}
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Uniform Filter Bar — Service User, Search, Date From, Date To */}
      <UniformFilterBar
        className="mb-5"
        personLabel="Service User"
        personAllLabel="All Service Users"
        personValue={selectedSu}
        onPersonChange={setSelectedSu}
        personOptions={suOptions}
        searchPlaceholder="Search resident, staff, urine colour, catheter type, notes..."
        searchValue={search}
        onSearchChange={setSearch}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        onClear={() => {
          setSelectedSu('')
          setSearch('')
          setDateFrom('')
          setDateTo('')
        }}
        shownCount={history.length}
      />

      {!selectedSu && (
        <div className="bg-blue-500/10 border border-blue-500/25 rounded-xl px-4 py-3 mb-5 flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-semibold text-blue-600">
            Select a <strong>Service User</strong> in the filter bar above to record a new daily Catheter Care entry, or click any completed record below to inspect/edit it.
          </span>
        </div>
      )}

      {selectedSu && (
        <>
          {daysToChange !== null && daysToChange <= 7 && (
            <div className={`flex items-start gap-2 p-3 rounded-xl mb-4 border ${daysToChange <= 2 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
              <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${daysToChange <= 2 ? 'text-red-600' : 'text-amber-600'}`} />
              <p className={`text-xs font-semibold ${daysToChange <= 2 ? 'text-red-700' : 'text-amber-700'}`}>
                Catheter change {daysToChange <= 0 ? 'OVERDUE' : `due in ${daysToChange} day${daysToChange === 1 ? '' : 's'}`} — {nextChange ? format(nextChange, 'd MMM yyyy') : ''}
              </p>
            </div>
          )}

          {latestSetup && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 mb-5 flex flex-wrap gap-4 items-center">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Type</p>
                <p className="text-sm font-bold text-slate-700">{latestSetup.catheter_type}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Size</p>
                <p className="text-sm font-bold text-slate-700">Fr {latestSetup.cath_size}</p>
              </div>
              {latestSetup.inserted_date && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Inserted</p>
                  <p className="text-sm font-bold text-slate-700">{format(new Date(latestSetup.inserted_date), 'd MMM yyyy')}</p>
                </div>
              )}
              {latestSetup.change_date && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Next Change</p>
                  <p className="text-sm font-bold text-slate-700">{format(new Date(latestSetup.change_date), 'd MMM yyyy')}</p>
                </div>
              )}
              <button onClick={() => setShowSetup(true)} className="ml-auto text-xs text-blue-600 font-semibold">
                Update catheter details
              </button>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Daily Care Entry — {format(new Date(), 'd MMM yyyy, HH:mm')}</h2>
            </div>
            <div className="px-5 py-5 space-y-5">
              {(!latestSetup || showSetup) && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-3">Catheter Details</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1 block">Type</label>
                      <select className="input w-full" value={catheterType} onChange={e => setCatheterType(e.target.value)}>
                        <option value="">Select...</option>
                        {CATHETER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1 block">Size (Fr)</label>
                      <input type="text" className="input w-full" placeholder="e.g. 14" value={cathSize} onChange={e => setCathSize(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1 block">Date Inserted</label>
                      <input type="date" className="input w-full" value={insertedDate} onChange={e => setInsertedDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1 block">Next Change Date</label>
                      <input type="date" className="input w-full" value={changeDate} onChange={e => setChangeDate(e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-slate-500 mb-1 block">Batch Number</label>
                      <input type="text" className="input w-full" placeholder="Catheter batch/lot number" value={batchNo} onChange={e => setBatchNo(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">Urine Appearance *</label>
                <div className="flex flex-wrap gap-2">
                  {URINE_COLOURS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setUrineColour(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        urineColour === c
                          ? c.includes('Pink') || c.includes('Cloudy') || c.includes('Offensive')
                            ? 'bg-red-600 text-white border-red-600'
                            : c.includes('Dark') || c.includes('Amber')
                              ? 'bg-amber-500 text-white border-amber-500'
                              : 'bg-green-600 text-white border-green-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">Amount Drained (ml)</label>
                <input
                  type="number"
                  className="input w-40"
                  placeholder="e.g. 350"
                  value={urineAmount}
                  onChange={e => setUrineAmount(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">Complications Observed</label>
                <div className="flex flex-wrap gap-2">
                  {COMPLICATIONS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggle(c, complications, setComplications)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        complications.includes(c)
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-red-300'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {hasComplications && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 font-medium">
                    Complications noted — inform registered nurse / GP promptly and document actions taken below.
                  </p>
                </div>
              )}

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">Care Actions Completed</label>
                <div className="flex flex-wrap gap-2">
                  {ACTIONS.map(a => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggle(a, actions, setActions)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        actions.includes(a)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1 block">Notes</label>
                <textarea
                  className="input w-full"
                  rows={2}
                  placeholder="Additional clinical observations..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={save} loading={saving} disabled={!urineColour} icon={<Save className="w-4 h-4" />}>
                  Save Entry
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Always-visible, clickable list of Completed Catheter Care Records */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-semibold text-slate-800">Completed Catheter Care Records ({history.length})</h3>
            <p className="text-xs text-slate-500 mt-0.5">Click any row to open the full completed form, inspect all selected options, edit, or print</p>
          </div>
        </div>
        {loading ? (
          <div className="p-8 flex justify-center"><Spinner /></div>
        ) : history.length === 0 ? (
          <p className="p-8 text-sm text-slate-400 text-center">No catheter care records match the current filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-left">
                  {['Date & Time', 'Service User', 'Urine Appearance', 'Volume', 'Complications', 'Actions Completed', 'Recorded By', ''].map(h => (
                    <th key={h} className="px-4 py-3 font-semibold text-slate-600 uppercase tracking-wide text-[11px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((h: any) => {
                  const comps = parseList(h.complications)
                  const acts = parseList(h.actions)
                  return (
                    <tr
                      key={h.id}
                      onClick={() => openRecordModal(h)}
                      className="cursor-pointer hover:bg-blue-50/60 transition-colors"
                      title="Click to view or edit completed form"
                    >
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap font-medium">
                        {h.recorded_at ? format(new Date(h.recorded_at), 'dd MMM yyyy HH:mm') : '—'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                        {h.su_name || residents.find(r => r.id === h.su_id)?.first_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">{h.urine_colour || '—'}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {h.urine_amount_ml != null ? `${h.urine_amount_ml} ml` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {comps.length ? (
                          <span className="text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full font-semibold">
                            {comps.join(', ')}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-medium">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{acts.join(', ') || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{h.staff_name || '—'}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => openRecordModal(h)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100"
                        >
                          <Eye className="w-3.5 h-3.5" /> View / Edit
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Clickable Completed Form View & Edit Modal */}
      <Modal
        open={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        title={`Completed Catheter Care Form — ${selectedRecord?.su_name || 'Resident'}`}
        size="lg"
      >
        {selectedRecord && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-slate-400 uppercase font-bold block text-[10px]">Resident</span>
                <span className="font-bold text-slate-900 text-sm">{selectedRecord.su_name || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-bold block text-[10px]">Recorded At</span>
                <span className="font-semibold text-slate-700">
                  {selectedRecord.recorded_at ? format(new Date(selectedRecord.recorded_at), 'dd MMM yyyy, HH:mm') : '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-bold block text-[10px]">Recorded By</span>
                <span className="font-semibold text-slate-700">{selectedRecord.staff_name || '—'}</span>
              </div>
              <button
                type="button"
                onClick={() => printSingleRecord(selectedRecord)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                <Printer className="w-3.5 h-3.5" /> Print Form
              </button>
            </div>

            <div className="bg-blue-50/70 rounded-xl p-4 border border-blue-100">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-3">Catheter Setup Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Type</label>
                  <select className="input w-full" value={editCatheterType} onChange={e => setEditCatheterType(e.target.value)}>
                    <option value="">Not specified</option>
                    {CATHETER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Size (Fr)</label>
                  <input type="text" className="input w-full" value={editCathSize} onChange={e => setEditCathSize(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Date Inserted</label>
                  <input type="date" className="input w-full" value={editInsertedDate} onChange={e => setEditInsertedDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Next Change Date</label>
                  <input type="date" className="input w-full" value={editChangeDate} onChange={e => setEditChangeDate(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Batch Number</label>
                  <input type="text" className="input w-full" value={editBatchNo} onChange={e => setEditBatchNo(e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2 block">Urine Appearance *</label>
              <div className="flex flex-wrap gap-2">
                {URINE_COLOURS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditUrineColour(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      editUrineColour === c
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Amount Drained (ml)</label>
              <input
                type="number"
                className="input w-44"
                value={editUrineAmount}
                onChange={e => setEditUrineAmount(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2 block">Complications Selected</label>
              <div className="flex flex-wrap gap-2">
                {COMPLICATIONS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggle(c, editComplications, setEditComplications)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      editComplications.includes(c)
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-red-300'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2 block">Care Actions Selected</label>
              <div className="flex flex-wrap gap-2">
                {ACTIONS.map(a => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggle(a, editActions, setEditActions)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      editActions.includes(a)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1 block">Notes</label>
              <textarea
                className="input w-full"
                rows={3}
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={() => setSelectedRecord(null)}>Close</Button>
              <Button onClick={saveEditedRecord} loading={updating} icon={<Edit className="w-4 h-4" />}>
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
