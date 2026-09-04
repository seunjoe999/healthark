﻿import React, { useState, useEffect } from 'react'
import { Droplets, Plus, Calendar, Users, Check } from 'lucide-react'
import { Button, Modal, Input, Select, Textarea, Spinner, EmptyState, PrintButton } from '../../components/ui'
import api from '../../api'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { LETTERHEAD_PRINT_CSS, fmtDate, esc, nl } from '../../utils/letterheadPrint'

const LOG_TABLE_CSS = `
  table.log{width:100%;border-collapse:collapse;margin-bottom:14px;font-family:Arial,sans-serif;font-size:10px;page-break-inside:auto}
  table.log th{text-align:left;background:#132a4f;color:#fff;border:1px solid #132a4f;padding:6px 8px;font-weight:700;font-size:8.5px;text-transform:uppercase;letter-spacing:.04em}
  table.log td{border:1px solid #999;padding:6px 8px;vertical-align:top;font-size:10px}
  table.log tr:nth-child(even) td{background:#f7f7f5}
`

function buildBathChartHtml(view: 'summary' | 'log', summary: any[], records: any[], suLabel: string): string {
  const rows = view === 'summary'
    ? summary.map(s => `
        <tr>
          <td>${esc(s.su_name)}</td>
          <td>${esc(s.room_number)}</td>
          <td style="text-transform:capitalize">${esc(s.bath_type?.replace(/_/g, ' '))}</td>
          <td>${fmtDate(s.bath_date)}</td>
          <td>${esc(s.given_by_name)}</td>
        </tr>
      `).join('')
    : records.map(r => `
        <tr>
          <td>${fmtDate(r.bath_date)}${r.bath_time ? '<br/>' + r.bath_time.substring(0, 5) : ''}</td>
          <td>${esc(r.su_name)}</td>
          <td style="text-transform:capitalize">${esc(r.bath_type?.replace(/_/g, ' '))}</td>
          <td style="text-transform:capitalize">${esc(r.assistance_level?.replace(/_/g, ' '))}</td>
          <td>${[r.hair_washed && 'Hair washed', r.nails_cut && 'Nails cut', r.shaved && 'Shaved'].filter(Boolean).join(', ') || '—'}</td>
          <td>${nl(r.skin_condition)}</td>
          <td>${nl(r.notes)}</td>
          <td>${esc(r.given_by_name)}</td>
        </tr>
      `).join('')

  const headerRow = view === 'summary'
    ? '<tr><th>Resident</th><th>Room</th><th>Last Type</th><th>Last Date</th><th>Given By</th></tr>'
    : '<tr><th>Date / Time</th><th>Resident</th><th>Type</th><th>Assistance</th><th>Care Given</th><th>Skin Condition</th><th>Notes</th><th>Given By</th></tr>'
  const colCount = view === 'summary' ? 5 : 8

  const body = `
    <div class="page">
      <div class="letterhead">
        <div>
          <div class="org-name">Comprehensive Care Ltd</div>
          <div class="org-addr">Ivy Business Centre, Office 3-13 Crown Street, Failsworth, Manchester, M35 9BG</div>
        </div>
        <div class="doc-meta">
          <div>Document ref: BATH-${fmtDate(new Date().toISOString())}</div>
          <div>Printed: <strong>${fmtDate(new Date().toISOString())}</strong></div>
        </div>
      </div>

      <div class="doc-title">Bath Chart</div>
      <div class="doc-subtitle">${esc(suLabel)} — ${view === 'summary' ? 'Last Bath Summary' : 'Full Log'}</div>

      <table class="idtable">
        <tr><td class="lbl">Records</td><td class="val">${view === 'summary' ? summary.length : records.length}</td></tr>
      </table>

      <h2 class="sec"><span class="num">1.</span>${view === 'summary' ? 'Summary' : 'Log'}</h2>
      <table class="log">
        ${headerRow}
        ${rows || `<tr><td colspan="${colCount}" style="text-align:center;color:#888">No records</td></tr>`}
      </table>

      <div class="footer">
        <span class="confid">CONFIDENTIAL — Resident health record</span>
        <span>Printed ${fmtDate(new Date().toISOString())}</span>
      </div>
    </div>
  `

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Bath Chart</title><style>${LETTERHEAD_PRINT_CSS}${LOG_TABLE_CSS}</style></head><body>${body}</body></html>`
}

const BATH_TYPES = [
  { value: 'shower', label: 'Shower' },
  { value: 'bath', label: 'Bath' },
  { value: 'bed_bath', label: 'Bed Bath' },
  { value: 'strip_wash', label: 'Strip Wash' },
  { value: 'hair_wash', label: 'Hair Wash Only' },
  { value: 'foot_soak', label: 'Foot Soak' },
]

const ASSISTANCE = [
  { value: 'independent', label: 'Independent' },
  { value: 'prompting', label: 'Prompting Only' },
  { value: 'minimal', label: 'Minimal Assistance' },
  { value: 'moderate', label: 'Moderate Assistance' },
  { value: 'full', label: 'Full Assistance' },
]

function daysSince(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return `${diff} days ago`
}

export default function BathChart() {
  const [view, setView] = useState<'summary' | 'log'>('summary')
  const [summary, setSummary] = useState<any[]>([])
  const [records, setRecords] = useState<any[]>([])
  const [serviceUsers, setServiceUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedSU, setSelectedSU] = useState('')

  const [form, setForm] = useState({
    suId: '', bathDate: new Date().toISOString().split('T')[0], bathTime: '',
    bathType: 'shower', assistanceLevel: 'moderate',
    hairWashed: false, nailsCut: false, shaved: false,
    skinCondition: '', notes: '',
  })

  async function load() {
    setLoading(true)
    try {
      const [sumRes, suRes] = await Promise.all([
        api.get('/bath-chart/summary'),
        api.get('/service-users'),
      ])
      setSummary(sumRes.data.data)
      setServiceUsers(suRes.data.data || [])
    } catch {}
    setLoading(false)
  }

  async function loadLog() {
    try {
      const params: any = {}
      if (selectedSU) params.suId = selectedSU
      const res = await api.get('/bath-chart', { params })
      setRecords(res.data.data)
    } catch {}
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (view === 'log') loadLog() }, [view, selectedSU])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/bath-chart', form)
      setShowAdd(false)
      setForm({ suId: '', bathDate: new Date().toISOString().split('T')[0], bathTime: '', bathType: 'shower', assistanceLevel: 'moderate', hairWashed: false, nailsCut: false, shaved: false, skinCondition: '', notes: '' })
      load()
      if (view === 'log') loadLog()
    } catch {}
    setSubmitting(false)
  }

  const suOptions = serviceUsers.map((s: any) => ({ value: s.id, label: `${s.first_name} ${s.last_name}` }))

  function handlePrint() {
    const suLabel = view === 'log' && selectedSU
      ? (suOptions.find(o => o.value === selectedSU)?.label || 'Selected resident')
      : 'All service users'
    const html = buildBathChartHtml(view, summary, records, suLabel)
    const w = window.open('', '_blank')
    if (!w) { toast.error('Pop-up blocked — please allow pop-ups for this site and try again'); return }
    w.document.write(html)
    w.document.close()
    w.focus()
    w.print()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Droplets className="w-6 h-6 text-amber-400" /> Bath Chart
          </h1>
          <p className="text-slate-400 text-sm mt-1">Personal hygiene and bathing records</p>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton onClick={handlePrint} />
          <Button variant="gold" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>
            Log Bath / Shower
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: '#1a1a1a' }}>
        {(['summary', 'log'] as const).map(t => (
          <button key={t} onClick={() => setView(t)}
            className={clsx('px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize', view === t ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-200')}
            style={view === t ? { background: 'linear-gradient(135deg, #e8b130, #d4961a)' } : {}}>
            {t === 'summary' ? 'Last Bath Summary' : 'Full Log'}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <>
          {view === 'summary' && (
            summary.length === 0 ? <EmptyState title="No bath records yet" description="Log the first bath or shower" /> : (
              <div className="grid gap-3 md:grid-cols-2">
                {summary.map((s: any) => {
                  const days = parseInt(s.days_since || '0')
                  const urgent = days >= 3
                  const warn = days === 2
                  return (
                    <div key={s.su_id} className={clsx('card p-4', urgent && 'border-rose-500/40', warn && 'border-amber-500/40')}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-slate-900"
                            style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)' }}>
                            {s.su_name?.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{s.su_name}</p>
                            {s.room_number && <p className="text-xs text-slate-400">Room {s.room_number}</p>}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={clsx('text-sm font-bold', urgent ? 'text-rose-400' : warn ? 'text-amber-400' : 'text-emerald-400')}>
                            {daysSince(s.bath_date)}
                          </div>
                          <div className="text-xs text-slate-400 capitalize">{s.bath_type?.replace('_', ' ')}</div>
                          {s.given_by_name && <div className="text-xs text-slate-500 mt-0.5">by {s.given_by_name}</div>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}

          {view === 'log' && (
            <div>
              <select className="input w-64 mb-4" value={selectedSU} onChange={e => setSelectedSU(e.target.value)}>
                <option value="">All Service Users</option>
                {serviceUsers.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                ))}
              </select>

              {records.length === 0 ? <EmptyState title="No records found" /> : (
                <div className="space-y-3">
                  {records.map(r => (
                    <div key={r.id} className="card p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="badge badge-info capitalize">{r.bath_type?.replace('_', ' ')}</span>
                            <span className="text-xs text-slate-400 capitalize">{r.assistance_level?.replace('_', ' ')}</span>
                          </div>
                          <p className="font-semibold text-white">{r.su_name}</p>
                          <div className="flex gap-3 mt-1 text-xs text-slate-400">
                            {r.hair_washed && <span className="text-emerald-400 flex items-center gap-0.5"><Check className="w-3 h-3" />Hair washed</span>}
                            {r.nails_cut && <span className="text-emerald-400 flex items-center gap-0.5"><Check className="w-3 h-3" />Nails cut</span>}
                            {r.shaved && <span className="text-emerald-400 flex items-center gap-0.5"><Check className="w-3 h-3" />Shaved</span>}
                          </div>
                          {r.skin_condition && <p className="text-xs text-amber-400 mt-1">Skin: {r.skin_condition}</p>}
                          {r.notes && <p className="text-xs text-slate-400 mt-1">{r.notes}</p>}
                        </div>
                        <div className="text-right text-xs text-slate-400">
                          <div className="text-white font-medium">{new Date(r.bath_date).toLocaleDateString('en-GB')}</div>
                          {r.bath_time && <div>{r.bath_time.substring(0,5)}</div>}
                          <div className="mt-1">{r.given_by_name}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Log Bath / Shower" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Service User" options={suOptions} placeholder="Select service user..." value={form.suId}
            onChange={e => setForm(f => ({ ...f, suId: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date" type="date" value={form.bathDate} required
              onChange={e => setForm(f => ({ ...f, bathDate: e.target.value }))} />
            <Input label="Time (optional)" type="time" value={form.bathTime}
              onChange={e => setForm(f => ({ ...f, bathTime: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Type" options={BATH_TYPES} value={form.bathType}
              onChange={e => setForm(f => ({ ...f, bathType: e.target.value }))} />
            <Select label="Assistance Level" options={ASSISTANCE} value={form.assistanceLevel}
              onChange={e => setForm(f => ({ ...f, assistanceLevel: e.target.value }))} />
          </div>
          <div className="flex gap-6">
            {[
              { key: 'hairWashed', label: 'Hair Washed' },
              { key: 'nailsCut', label: 'Nails Cut' },
              { key: 'shaved', label: 'Shaved' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={(form as any)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                  className="w-4 h-4 rounded" />
                <span className="text-sm text-slate-300">{label}</span>
              </label>
            ))}
          </div>
          <Input label="Skin Condition (optional)" placeholder="e.g. dry skin on arms" value={form.skinCondition}
            onChange={e => setForm(f => ({ ...f, skinCondition: e.target.value }))} />
          <Textarea label="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" variant="gold" loading={submitting}>Save Record</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

