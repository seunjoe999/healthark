﻿import React, { useState, useEffect } from 'react'
import { ShieldCheck, Plus, AlertTriangle, CheckCircle, Clock, Users, Check } from 'lucide-react'
import { Button, Modal, Input, Select, Textarea, Spinner, EmptyState, PrintButton } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import api from '../../api'
import clsx from 'clsx'

const DBS_TYPES = [
  { value: 'enhanced', label: 'Enhanced DBS' },
  { value: 'enhanced_barred', label: 'Enhanced + Barred List' },
  { value: 'standard', label: 'Standard DBS' },
  { value: 'basic', label: 'Basic DBS' },
]

const statusColor: Record<string, string> = {
  valid:         'badge-success',
  expiring_soon: 'badge-warning',
  expired:       'badge-critical',
  pending:       'badge-info',
}

const statusLabel: Record<string, string> = {
  valid: 'Valid', expiring_soon: 'Expiring Soon', expired: 'Expired', pending: 'Pending',
}

type Tab = 'overview' | 'dbs' | 'references' | 'right_to_work'

export default function DBSTracker() {
  const { isRole } = useAuth()
  const [tab, setTab] = useState<Tab>('overview')
  const [overview, setOverview] = useState<any[]>([])
  const [dbsRecords, setDbsRecords] = useState<any[]>([])
  const [references, setReferences] = useState<any[]>([])
  const [rtwDocs, setRtwDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [staff, setStaff] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [preview, setPreview] = useState<any>(null)

  const [dbsForm, setDbsForm] = useState({ staffId: '', dbsNumber: '', dbsType: 'enhanced', issueDate: '', expiryDate: '', updateService: false, notes: '' })
  const [refForm, setRefForm] = useState({ staffId: '', refereeName: '', refereePosition: '', refereeCompany: '', refereeEmail: '', receivedDate: '', status: 'pending' })
  const [rtwForm, setRtwForm] = useState({ staffId: '', documentType: '', documentNumber: '', expiryDate: '' })

  async function load() {
    setLoading(true)
    try {
      const [ov, dbs, refs, rtw, staffRes] = await Promise.all([
        api.get('/dbs/compliance-overview'),
        api.get('/dbs/dbs'),
        api.get('/dbs/references'),
        api.get('/dbs/right-to-work'),
        api.get('/staff'),
      ])
      setOverview(ov.data.data)
      setDbsRecords(dbs.data.data)
      setReferences(refs.data.data)
      setRtwDocs(rtw.data.data)
      setStaff(staffRes.data.data || staffRes.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function submitDBS(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/dbs/dbs', dbsForm)
      setShowAdd(false)
      load()
    } catch {}
    setSubmitting(false)
  }

  async function submitRef(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/dbs/references', refForm)
      setShowAdd(false)
      load()
    } catch {}
    setSubmitting(false)
  }

  async function submitRTW(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/dbs/right-to-work', rtwForm)
      setShowAdd(false)
      load()
    } catch {}
    setSubmitting(false)
  }

  const staffOptions = (staff as any[]).map((s: any) => ({ value: s.id, label: `${s.first_name} ${s.last_name}` }))

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Compliance Overview' },
    { key: 'dbs', label: 'DBS Records' },
    { key: 'references', label: 'References' },
    { key: 'right_to_work', label: 'Right to Work' },
  ]

  const expiringSoon = dbsRecords.filter(d => d.status === 'expiring_soon').length
  const expired = dbsRecords.filter(d => d.status === 'expired').length

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-amber-400" /> Staff Compliance
          </h1>
          <p className="text-slate-400 text-sm mt-1">DBS checks, references & right to work documents</p>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton />
          {isRole('home_manager', 'group_admin', 'deputy_manager', 'admin') && (
            <Button variant="gold" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>
              Add Document
            </Button>
          )}
        </div>
      </div>

      {(expiringSoon > 0 || expired > 0) && (
        <div className="flex gap-3 mb-5">
          {expired > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-sm text-rose-400">
              <AlertTriangle className="w-4 h-4" /> {expired} expired DBS certificate{expired > 1 ? 's' : ''}
            </div>
          )}
          {expiringSoon > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm text-amber-400">
              <Clock className="w-4 h-4" /> {expiringSoon} DBS expiring soon
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: '#1a1a1a' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={clsx('flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all', tab === t.key ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-200')}
            style={tab === t.key ? { background: 'linear-gradient(135deg, #e8b130, #d4961a)' } : {}}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <>
          {tab === 'overview' && (
            <div className="space-y-3">
              {overview.length === 0 ? <EmptyState title="No staff found" /> : overview.map(s => (
                <div key={s.id} className="card p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-slate-900"
                        style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)' }}>
                        {s.first_name?.[0]}{s.last_name?.[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{s.first_name} {s.last_name}</p>
                        <p className="text-xs text-slate-400 capitalize">{s.role?.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="text-center">
                        <div className={clsx('font-semibold', s.dbs_status === 'valid' ? 'text-emerald-400' : s.dbs_status === 'expired' ? 'text-rose-400' : 'text-amber-400')}>
                          {s.dbs_status ? s.dbs_status.replace('_', ' ') : 'No DBS'}
                        </div>
                        <div className="text-slate-500">DBS</div>
                      </div>
                      <div className="text-center">
                        <div className={clsx('font-semibold', s.refs_received >= 2 ? 'text-emerald-400' : 'text-amber-400')}>{s.refs_received}/2</div>
                        <div className="text-slate-500">References</div>
                      </div>
                      <div className="text-center">
                        <div className={clsx('font-semibold', s.rtw_docs > 0 ? 'text-emerald-400' : 'text-rose-400')}>{s.rtw_docs > 0 ? <Check className="w-4 h-4 mx-auto" /> : '—'}</div>
                        <div className="text-slate-500">RTW</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'dbs' && (
            <div className="space-y-3">
              {dbsRecords.length === 0 ? <EmptyState title="No DBS records" description="Add DBS certificates for your staff" /> : dbsRecords.map(d => (
                <div key={d.id} className="card p-4 cursor-pointer hover:border-amber-500/30 transition-all" onClick={() => setPreview({ ...d, _type: 'dbs' })}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={clsx('badge', statusColor[d.status])}>{statusLabel[d.status]}</span>
                        <span className="text-xs text-slate-400 capitalize">{d.dbs_type?.replace(/_/g, ' ')}</span>
                      </div>
                      <p className="font-semibold text-white">{d.staff_name}</p>
                      {d.dbs_number && <p className="text-xs text-slate-400">DBS No: {d.dbs_number}</p>}
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <div>Issued: {d.issue_date ? new Date(d.issue_date).toLocaleDateString() : '—'}</div>
                      {d.expiry_date && <div className={clsx('mt-1', d.status === 'expired' ? 'text-rose-400' : d.status === 'expiring_soon' ? 'text-amber-400' : '—')}>
                        Expires: {new Date(d.expiry_date).toLocaleDateString()}
                      </div>}
                      {d.update_service && <div className="text-emerald-400 mt-1 flex items-center gap-1 justify-end"><Check className="w-3 h-3" />Update Service</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'references' && (
            <div className="space-y-3">
              {references.length === 0 ? <EmptyState title="No references" description="Add reference records for staff members" /> : references.map(r => (
                <div key={r.id} className="card p-4 cursor-pointer hover:border-amber-500/30 transition-all" onClick={() => setPreview({ ...r, _type: 'ref' })}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={clsx('badge', statusColor[r.status])}>{statusLabel[r.status]}</span>
                        <span className="text-xs text-slate-400 capitalize">{r.reference_type}</span>
                      </div>
                      <p className="font-semibold text-white">{r.staff_name}</p>
                      <p className="text-sm text-slate-300">{r.referee_name}{r.referee_company ? ` Â· ${r.referee_company}` : '—'}</p>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      {r.received_date && <div>Received: {new Date(r.received_date).toLocaleDateString()}</div>}
                      {r.referee_email && <div className="mt-1">{r.referee_email}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'right_to_work' && (
            <div className="space-y-3">
              {rtwDocs.length === 0 ? <EmptyState title="No RTW documents" description="Add right to work documents for staff" /> : rtwDocs.map(d => (
                <div key={d.id} className="card p-4 cursor-pointer hover:border-amber-500/30 transition-all" onClick={() => setPreview({ ...d, _type: 'rtw' })}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={clsx('badge', statusColor[d.status])}>{statusLabel[d.status]}</span>
                      </div>
                      <p className="font-semibold text-white">{d.staff_name}</p>
                      <p className="text-sm text-slate-300">{d.document_type}{d.document_number ? ` Â· ${d.document_number}` : '—'}</p>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      {d.expiry_date && <div className={clsx(d.status === 'expired' ? 'text-rose-400' : '—')}>
                        Expires: {new Date(d.expiry_date).toLocaleDateString()}
                      </div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Preview Modal */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title="Document Details" size="lg">
        {preview && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-bold text-white text-lg">{preview.staff_name}</p>
              <span className={clsx('badge', statusColor[preview.status])}>{statusLabel[preview.status]}</span>
            </div>
            {preview._type === 'dbs' && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-slate-500">DBS Type</p><p className="text-white capitalize">{preview.dbs_type?.replace(/_/g, ' ')}</p></div>
                {preview.dbs_number && <div><p className="text-xs text-slate-500">Certificate No.</p><p className="text-white font-mono">{preview.dbs_number}</p></div>}
                <div><p className="text-xs text-slate-500">Issue Date</p><p className="text-white">{preview.issue_date ? new Date(preview.issue_date).toLocaleDateString() : '—'}</p></div>
                <div><p className="text-xs text-slate-500">Expiry Date</p><p className={preview.status === 'expired' ? 'text-rose-400' : preview.status === 'expiring_soon' ? 'text-amber-400' : 'text-white'}>{preview.expiry_date ? new Date(preview.expiry_date).toLocaleDateString() : 'No expiry'}</p></div>
                {preview.update_service && <div className="col-span-2 text-emerald-400 text-sm font-medium flex items-center gap-1"><Check className="w-3.5 h-3.5" />On DBS Update Service</div>}
                {preview.notes && <div className="col-span-2"><p className="text-xs text-slate-500 mb-1">Notes</p><p className="text-slate-300">{preview.notes}</p></div>}
              </div>
            )}
            {preview._type === 'ref' && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-slate-500">Referee</p><p className="text-white">{preview.referee_name}</p></div>
                {preview.referee_position && <div><p className="text-xs text-slate-500">Position</p><p className="text-white">{preview.referee_position}</p></div>}
                {preview.referee_company && <div><p className="text-xs text-slate-500">Company</p><p className="text-white">{preview.referee_company}</p></div>}
                {preview.referee_email && <div><p className="text-xs text-slate-500">Email</p><p className="text-white">{preview.referee_email}</p></div>}
                {preview.received_date && <div><p className="text-xs text-slate-500">Received</p><p className="text-white">{new Date(preview.received_date).toLocaleDateString()}</p></div>}
              </div>
            )}
            {preview._type === 'rtw' && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-slate-500">Document Type</p><p className="text-white">{preview.document_type}</p></div>
                {preview.document_number && <div><p className="text-xs text-slate-500">Document No.</p><p className="text-white font-mono">{preview.document_number}</p></div>}
                {preview.expiry_date && <div><p className="text-xs text-slate-500">Expiry</p><p className={preview.status === 'expired' ? 'text-rose-400' : 'text-white'}>{new Date(preview.expiry_date).toLocaleDateString()}</p></div>}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Add Document Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Compliance Document" size="lg">
        <div className="space-y-4">
          {/* Tab within modal */}
          <div className="flex gap-2 mb-4">
            {(['dbs', 'reference', 'rtw'] as const).map(t => (
              <button key={t} onClick={() => {}}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-all capitalize">
                {t === 'rtw' ? 'Right to Work' : t === 'dbs' ? 'DBS' : 'Reference'}
              </button>
            ))}
          </div>

          <form onSubmit={submitDBS} className="space-y-4">
            <Select label="Staff Member" options={staffOptions} placeholder="Select staff..." value={dbsForm.staffId}
              onChange={e => setDbsForm(f => ({ ...f, staffId: e.target.value }))} />
            <Select label="DBS Type" options={DBS_TYPES} value={dbsForm.dbsType}
              onChange={e => setDbsForm(f => ({ ...f, dbsType: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="DBS Certificate Number" value={dbsForm.dbsNumber}
                onChange={e => setDbsForm(f => ({ ...f, dbsNumber: e.target.value }))} />
              <Input label="Issue Date" type="date" value={dbsForm.issueDate} required
                onChange={e => setDbsForm(f => ({ ...f, issueDate: e.target.value }))} />
            </div>
            <Input label="Expiry Date (if applicable)" type="date" value={dbsForm.expiryDate}
              onChange={e => setDbsForm(f => ({ ...f, expiryDate: e.target.value }))} />
            <Textarea label="Notes" value={dbsForm.notes} onChange={e => setDbsForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit" variant="gold" loading={submitting}>Save DBS Record</Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  )
}

