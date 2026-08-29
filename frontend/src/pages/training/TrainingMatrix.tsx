import React, { useEffect, useState, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Button, Select, Spinner, Modal, Input } from '../../components/ui'
import {
  Grid3X3, Printer, CheckCircle, AlertTriangle, XCircle, MinusCircle,
  ChevronRight, ExternalLink, Plus,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import api from '../../api'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { esc, fmtDate } from '../../utils/letterheadPrint'

// ── Types ─────────────────────────────────────────────────────────
interface StaffRow { id: string; name: string; role: string }
interface CellData { status: 'current' | 'expiring' | 'expired' | 'missing'; expiry_date: string | null }
interface MatrixData {
  staff: StaffRow[]
  trainingTypes: string[]
  matrix: Record<string, Record<string, CellData>>
}

// ── Constants ─────────────────────────────────────────────────────
const ABBREV: Record<string, string> = {
  'Manual Handling': 'Manual H.',
  'Fire Safety': 'Fire Safety',
  'First Aid': 'First Aid',
  'Safeguarding': 'Safeguarding',
  'Food Hygiene': 'Food Hygiene',
  'Infection Control': 'Infection Ctrl',
  'MCA/DoLS': 'MCA/DoLS',
  'Medication': 'Medication',
  'Dementia Care': 'Dementia',
}

const STATUS_CONFIG = {
  current: {
    bg: 'rgba(74,222,128,0.2)',
    border: 'rgba(74,222,128,0.4)',
    text: '#4ade80',
    symbol: '✓',
    label: 'Current',
  },
  expiring: {
    bg: 'rgba(251,191,36,0.2)',
    border: 'rgba(251,191,36,0.4)',
    text: '#fbbf24',
    symbol: '!',
    label: 'Expiring Soon',
  },
  expired: {
    bg: 'rgba(239,68,68,0.2)',
    border: 'rgba(239,68,68,0.4)',
    text: '#ef4444',
    symbol: '✗',
    label: 'Expired',
  },
  missing: {
    bg: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.1)',
    text: '#64748b',
    symbol: '–',
    label: 'Not Recorded',
  },
}

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'care_staff', label: 'Care Staff' },
  { value: 'senior_carer', label: 'Senior Carer' },
  { value: 'team_leader', label: 'Team Leader' },
  { value: 'deputy_manager', label: 'Deputy Manager' },
  { value: 'home_manager', label: 'Home Manager' },
  { value: 'admin', label: 'Admin' },
]

function formatRole(role: string) {
  return role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ── Cell popover ──────────────────────────────────────────────────
interface PopoverProps {
  trainingType: string
  cell: CellData
  onClose: () => void
  style: React.CSSProperties
}

function CellPopover({ trainingType, cell, onClose, style }: PopoverProps) {
  const navigate = useNavigate()
  const cfg = STATUS_CONFIG[cell.status]
  return (
    <div
      style={{
        ...style,
        position: 'fixed',
        zIndex: 50,
        background: '#1a2540',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 10,
        padding: '12px 14px',
        minWidth: 200,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-sm font-semibold text-white">{trainingType}</span>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xs">✕</button>
      </div>
      <div className="flex items-center gap-1.5 mb-2">
        <span
          style={{ color: cfg.text, background: cfg.bg, border: `1px solid ${cfg.border}` }}
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
        >
          {cfg.label}
        </span>
      </div>
      {cell.expiry_date && (
        <p className="text-xs text-slate-400">
          Expiry: <span className="text-slate-200">{format(parseISO(cell.expiry_date), 'd MMM yyyy')}</span>
        </p>
      )}
      {!cell.expiry_date && cell.status === 'missing' && (
        <p className="text-xs text-slate-400">No training record found.</p>
      )}
      <button
        onClick={() => navigate('/training')}
        className="mt-3 flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
      >
        Go to Training <ExternalLink className="w-3 h-3" />
      </button>
    </div>
  )
}

const MATRIX_PRINT_CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Georgia,'Cambria','Times New Roman',serif;color:#1a1a1a;font-size:11px;line-height:1.4;background:#fff}
  .page{padding:12mm}

  .letterhead{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2.5px solid #132a4f;padding-bottom:8px;margin-bottom:10px}
  .org-name{font-size:14px;font-weight:700;color:#132a4f}
  .org-addr{font-size:9px;color:#444;margin-top:2px;font-family:Arial,sans-serif}
  .doc-meta{text-align:right;font-size:9px;color:#444;font-family:Arial,sans-serif;line-height:1.5}
  .doc-title{font-family:Arial,sans-serif;font-weight:700;font-size:15px;color:#132a4f;margin-bottom:2px}
  .doc-sub{font-family:Arial,sans-serif;font-size:9.5px;color:#555;margin-bottom:14px}

  table.matrix{border-collapse:collapse;width:100%;font-family:Arial,sans-serif}
  table.matrix th, table.matrix td{border:1px solid #999;font-size:8.5px;padding:4px 5px;text-align:center}
  table.matrix th{background:#f2f2f0;color:#132a4f;font-weight:700}
  table.matrix td.name{text-align:left;font-weight:700}
  table.matrix td.name .role{font-weight:400;color:#555;font-size:8px;display:block}
  table.matrix td.current{background:#d1fae5;color:#065f46;font-weight:700}
  table.matrix td.expiring{background:#fef3c7;color:#92400e;font-weight:700}
  table.matrix td.expired{background:#fee2e2;color:#991b1b;font-weight:700}
  table.matrix td.missing{background:#f3f4f6;color:#666}

  .legend{margin-top:10px;font-family:Arial,sans-serif;font-size:8px;color:#333;display:flex;gap:14px;flex-wrap:wrap}
  .footer{margin-top:14px;padding-top:6px;border-top:1px solid #999;display:flex;justify-content:space-between;font-family:Arial,sans-serif;font-size:8px;color:#555}
  .footer .confid{font-weight:700;color:#132a4f}

  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    @page{margin:0;size:A4 landscape}
  }
`

function printTrainingMatrix(staff: StaffRow[], trainingTypes: string[], matrix: Record<string, Record<string, CellData>>, roleFilter: string) {
  const symbol: Record<string, string> = { current: '✓', expiring: '!', expired: '✗', missing: '–' }
  const rows = staff.map(s => {
    const cells = matrix[s.id] || {}
    return `
      <tr>
        <td class="name">${esc(s.name)}<span class="role">${esc(formatRole(s.role))}</span></td>
        ${trainingTypes.map(t => {
          const cell = cells[t] ?? { status: 'missing', expiry_date: null }
          return `<td class="${cell.status}" title="${cell.expiry_date ? `Expires ${fmtDate(cell.expiry_date)}` : ''}">${symbol[cell.status]}</td>`
        }).join('')}
      </tr>
    `
  }).join('')

  const body = `
    <div class="page">
      <div class="letterhead">
        <div>
          <div class="org-name">Comprehensive Care Ltd</div>
          <div class="org-addr">Ivy Business Centre, Office 3-13 Crown Street, Failsworth, Manchester, M35 9BG</div>
        </div>
        <div class="doc-meta">
          <div>Document ref: TM-${format(new Date(), 'yyyyMMdd')}</div>
          <div>Printed: <strong>${fmtDate(new Date().toISOString())}</strong></div>
        </div>
      </div>
      <div class="doc-title">Mandatory Training Compliance Matrix</div>
      <div class="doc-sub">${roleFilter ? `Filtered by role: ${esc(formatRole(roleFilter))}` : 'All staff roles'}</div>
      <table class="matrix">
        <thead>
          <tr>
            <th style="text-align:left">Staff Member</th>
            ${trainingTypes.map(t => `<th>${esc(ABBREV[t] ?? t)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="legend">
        <span><strong>Key:</strong></span>
        <span>✓ Current</span>
        <span>! Expiring Soon</span>
        <span>✗ Expired</span>
        <span>– Not Recorded</span>
      </div>
      <div class="footer">
        <span class="confid">CONFIDENTIAL — Staff training record</span>
        <span>Printed ${fmtDate(new Date().toISOString())}</span>
      </div>
    </div>
  `

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Training Compliance Matrix</title><style>${MATRIX_PRINT_CSS}</style></head><body>${body}</body></html>`
  const w = window.open('', '_blank')
  if (!w) { toast.error('Pop-up blocked — please allow pop-ups for this site and try again'); return }
  w.document.write(html)
  w.document.close()
  w.focus()
  w.print()
}

// ── Main component ────────────────────────────────────────────────
export default function TrainingMatrix() {
  const { user } = useAuth()
  const [data, setData] = useState<MatrixData | null>(null)
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ staffId: '', courseName: '', completedDate: new Date().toISOString().split('T')[0], expiryDate: '' })
  const [saving, setSaving] = useState(false)
  const [trainingTypes, setTrainingTypes] = useState<{ id: string; name: string }[]>([])
  const [manageTypesOpen, setManageTypesOpen] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')
  const [addingType, setAddingType] = useState(false)
  const [popover, setPopover] = useState<{
    staffId: string
    trainingType: string
    cell: CellData
    x: number
    y: number
  } | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    load()
    loadTrainingTypes()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await api.get('/training-matrix')
      setData(res.data.data)
    } catch {}
    setLoading(false)
  }

  function loadTrainingTypes() {
    api.get('/training-types').then(res => setTrainingTypes(res.data.data || [])).catch(() => {})
  }

  async function addTrainingType() {
    if (!newTypeName.trim()) return
    setAddingType(true)
    try {
      await api.post('/training-types', { name: newTypeName.trim() })
      setNewTypeName('')
      loadTrainingTypes()
      toast.success('Training section added')
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to add training section') }
    finally { setAddingType(false) }
  }

  async function removeTrainingType(id: string) {
    try { await api.delete(`/training-types/${id}`); loadTrainingTypes() } catch { toast.error('Failed to remove') }
  }

  async function saveTrainingRecord(e: React.FormEvent) {
    e.preventDefault()
    if (!addForm.staffId || !addForm.courseName || !addForm.completedDate) { toast.error('Staff, training name and completed date are required'); return }
    setSaving(true)
    try {
      await api.post('/staff-hr/training', addForm)
      toast.success('Training record added')
      setAddOpen(false)
      setAddForm({ staffId: '', courseName: '', completedDate: new Date().toISOString().split('T')[0], expiryDate: '' })
      await load()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to add training record') }
    finally { setSaving(false) }
  }

  function handleCellClick(
    e: React.MouseEvent,
    staffId: string,
    trainingType: string,
    cell: CellData
  ) {
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setPopover({ staffId, trainingType, cell, x: rect.left, y: rect.bottom + 6 })
  }

  // Derived stats
  const filteredStaff = data
    ? data.staff.filter(s => !roleFilter || s.role === roleFilter)
    : []

  const stats = React.useMemo(() => {
    if (!data) return { fullyCompliant: 0, withGaps: 0, expiring: 0 }
    let fullyCompliant = 0, withGaps = 0, expiring = 0
    for (const s of filteredStaff) {
      const cells = data.matrix[s.id] || {}
      const statuses = data.trainingTypes.map(t => cells[t]?.status ?? 'missing')
      const hasGap = statuses.some(st => st === 'expired' || st === 'missing')
      const hasExpiring = statuses.some(st => st === 'expiring')
      if (!hasGap) fullyCompliant++
      else withGaps++
      if (hasExpiring) expiring++
    }
    return { fullyCompliant, withGaps, expiring }
  }, [data, filteredStaff])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 text-slate-400 text-center">Failed to load training matrix.</div>
    )
  }

  return (
    <div
      className="p-4 md:p-6 space-y-5"
      onClick={(e) => {
        if (popover && !(e.target as HTMLElement).closest('[data-popover]')) setPopover(null)
      }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}
          >
            <Grid3X3 className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Mandatory Training Matrix</h1>
            <p className="text-xs text-slate-400">Compliance overview for all mandatory training</p>
          </div>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Button
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setAddOpen(true)}
          >
            Add training record
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Printer className="w-4 h-4" />}
            onClick={() => printTrainingMatrix(filteredStaff, data.trainingTypes, data.matrix, roleFilter)}
          >
            Print
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Fully Compliant', value: stats.fullyCompliant, color: '#4ade80', bg: 'rgba(74,222,128,0.08)', icon: <CheckCircle className="w-4 h-4 text-emerald-400" /> },
          { label: 'Staff with Gaps', value: stats.withGaps, color: '#ef4444', bg: 'rgba(239,68,68,0.08)', icon: <XCircle className="w-4 h-4 text-rose-400" /> },
          { label: 'Items Expiring', value: stats.expiring, color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', icon: <AlertTriangle className="w-4 h-4 text-amber-400" /> },
        ].map(({ label, value, color, bg, icon }) => (
          <div
            key={label}
            className="rounded-xl p-3 flex items-center gap-3"
            style={{ background: bg, border: `1px solid rgba(255,255,255,0.06)` }}
          >
            {icon}
            <div>
              <p className="text-xl font-bold" style={{ color }}>{value}</p>
              <p className="text-xs text-slate-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Legend + filter row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div
                className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.text }}
              >
                {cfg.symbol}
              </div>
              <span className="text-xs text-slate-400">{cfg.label}</span>
            </div>
          ))}
        </div>
        <div className="w-40">
          <Select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            options={ROLE_OPTIONS}
            placeholder="Filter by role"
          />
        </div>
      </div>

      {/* Print note */}
      <p className="text-xs text-slate-500 print:hidden flex items-center gap-1">
        <Printer className="w-3 h-3" />
        Print this page for your compliance records.
      </p>

      {/* Grid */}
      {filteredStaff.length === 0 ? (
        <div className="rounded-xl p-8 text-center text-slate-400"
          style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
          No staff found{roleFilter ? ' for this role' : ''}.
        </div>
      ) : (
        <div
          ref={tableRef}
          className="rounded-xl overflow-hidden"
          style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[700px]">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th
                    className="text-left px-4 py-3 text-xs font-semibold text-slate-400 sticky left-0"
                    style={{ background: '#111111', minWidth: 180 }}
                  >
                    Staff Member
                  </th>
                  {data.trainingTypes.map(t => (
                    <th
                      key={t}
                      className="text-center px-2 py-3 text-xs font-semibold text-slate-400"
                      style={{ minWidth: 80 }}
                      title={t}
                    >
                      {ABBREV[t] ?? t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((s, idx) => {
                  const cells = data.matrix[s.id] || {}
                  return (
                    <tr
                      key={s.id}
                      style={{
                        borderBottom: idx < filteredStaff.length - 1
                          ? '1px solid rgba(255,255,255,0.04)'
                          : 'none',
                      }}
                    >
                      {/* Staff name cell */}
                      <td
                        className="px-4 py-2.5 sticky left-0"
                        style={{ background: '#111111' }}
                      >
                        <div>
                          <p className="text-sm font-medium text-white leading-tight">{s.name}</p>
                          <span className="text-xs text-slate-500">{formatRole(s.role)}</span>
                        </div>
                      </td>
                      {/* Training cells */}
                      {data.trainingTypes.map(t => {
                        const cell = cells[t] ?? { status: 'missing', expiry_date: null }
                        const cfg = STATUS_CONFIG[cell.status as keyof typeof STATUS_CONFIG]
                        const isActive = popover?.staffId === s.id && popover?.trainingType === t
                        return (
                          <td key={t} className="text-center px-2 py-2">
                            <button
                              onClick={e => handleCellClick(e, s.id, t, cell as CellData)}
                              title={
                                cell.expiry_date
                                  ? `${t}: ${cfg.label} — expires ${format(parseISO(cell.expiry_date), 'd MMM yyyy')}`
                                  : `${t}: ${cfg.label}`
                              }
                              className="w-8 h-8 rounded-lg mx-auto flex items-center justify-center text-xs font-bold transition-transform hover:scale-110 focus:outline-none"
                              style={{
                                background: cfg.bg,
                                border: `1px solid ${isActive ? cfg.text : cfg.border}`,
                                color: cfg.text,
                              }}
                            >
                              {cfg.symbol}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Popover */}
      {popover && (
        <div data-popover>
          <CellPopover
            trainingType={popover.trainingType}
            cell={popover.cell}
            onClose={() => setPopover(null)}
            style={{
              left: Math.min(popover.x, window.innerWidth - 220),
              top: Math.min(popover.y, window.innerHeight - 160),
            }}
          />
        </div>
      )}

      {/* Manual training record modal */}
      {addOpen && (
        <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add training record">
          <form onSubmit={saveTrainingRecord} className="space-y-4">
            <Select label="Staff member *" value={addForm.staffId} onChange={e => setAddForm(p => ({ ...p, staffId: e.target.value }))}
              options={[{ value: '', label: 'Select staff member...' }, ...data.staff.map(s => ({ value: s.id, label: `${s.name} (${formatRole(s.role)})` }))]} />
            <div>
              <Select label="Name of training *" value={addForm.courseName} onChange={e => setAddForm(p => ({ ...p, courseName: e.target.value }))}
                options={[{ value: '', label: 'Select training section...' }, ...trainingTypes.map(t => ({ value: t.name, label: t.name })), { value: '__custom__', label: 'Other (type below)' }]} />
              {addForm.courseName === '__custom__' && (
                <Input label="Custom training name *" required value={''} onChange={e => setAddForm(p => ({ ...p, courseName: e.target.value }))} placeholder="e.g. Manual Handling, Fire Safety..." className="mt-2" />
              )}
              <button type="button" onClick={() => setManageTypesOpen(o => !o)} className="text-xs text-purple-600 hover:text-purple-700 font-medium mt-1">
                + Manage training sections
              </button>
              {manageTypesOpen && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 mt-2">
                  {trainingTypes.length === 0 && <p className="text-xs text-slate-400">No training sections yet</p>}
                  {trainingTypes.map(t => (
                    <div key={t.id} className="flex items-center justify-between text-sm text-slate-700">
                      <span>{t.name}</span>
                      <button type="button" onClick={() => removeTrainingType(t.id)} className="text-xs text-rose-500 hover:text-rose-700">Remove</button>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <input className="flex-1 border border-slate-300 rounded-lg px-2 py-1.5 text-sm" placeholder="New training section name"
                      value={newTypeName} onChange={e => setNewTypeName(e.target.value)} />
                    <button type="button" disabled={addingType} onClick={addTrainingType}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">Add</button>
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Date training completed *" type="date" required value={addForm.completedDate} onChange={e => setAddForm(p => ({ ...p, completedDate: e.target.value }))} />
              <Input label="Expiry date of training" type="date" value={addForm.expiryDate} onChange={e => setAddForm(p => ({ ...p, expiryDate: e.target.value }))} />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" loading={saving}>Save</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  )
}
