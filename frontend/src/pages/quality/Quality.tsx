import React, { useEffect, useState } from 'react'
import { homesApi, suApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Input, Select, Card, SectionHeading } from '../../components/ui'
import { Star, AlertTriangle, MessageSquare, Plus, Lock, Users, Brain } from 'lucide-react'
import toast from 'react-hot-toast'

type QATab = 'qa' | 'capacity' | 'professionals' | 'sensitive'

const QA_TYPES = [{ value: 'complaint', label: 'Complaint' }, { value: 'compliment', label: 'Compliment' }, { value: 'feedback', label: 'Feedback' }, { value: 'suggestion', label: 'Suggestion' }, { value: 'concern', label: 'Concern' }]
const SEVERITIES = [{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]

export default function Quality() {
  const { user, isRole } = useAuth()
  const [sus, setSus] = useState<any[]>([])
  const [selectedSu, setSelectedSu] = useState<any>(null)
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [tab, setTab] = useState<QATab>('qa')
  const [qaRecords, setQaRecords] = useState<any[]>([])
  const [capacityRecords, setCapacityRecords] = useState<any[]>([])
  const [professionals, setProfessionals] = useState<any[]>([])
  const [sensitiveNotes, setSensitiveNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [addQAOpen, setAddQAOpen] = useState(false)
  const [addCapacityOpen, setAddCapacityOpen] = useState(false)
  const [addProfOpen, setAddProfOpen] = useState(false)
  const [addNoteOpen, setAddNoteOpen] = useState(false)
  const [search, setSearch] = useState('')

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
    // Load home-level QA records
    api.get('/quality', { params: { homeId: selectedHome } }).then(res => setQaRecords(res.data.data || []))
  }, [selectedHome])

  const selectSu = async (su: any) => {
    setSelectedSu(su)
    setLoading(true)
    try {
      const [capRes, profRes, noteRes] = await Promise.all([
        api.get(`/quality/capacity/${su.id}`),
        api.get(`/quality/professionals/${su.id}`),
        api.get(`/quality/sensitive-notes/${su.id}`),
      ])
      setCapacityRecords(capRes.data.data || [])
      setProfessionals(profRes.data.data || [])
      setSensitiveNotes(noteRes.data.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const getName = (su: any) => `${su.first_name || su.firstName || ''} ${su.last_name || su.lastName || ''}`.trim()
  const filteredSus = sus.filter(su => getName(su).toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex h-full">
      {/* Left — SU selector */}
      <div className="w-72 flex-shrink-0 bg-white border-r border-slate-100 flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 mb-3">Quality & Compliance</h2>
          {homes.length > 1 && <select className="input mb-2 text-sm" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>{homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select>}
          <input className="input text-sm" placeholder="Search residents..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="p-3 border-b border-slate-100">
          <button onClick={() => setSelectedSu(null)} className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${!selectedSu ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
            🏠 Home-level QA
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredSus.map(su => {
            const name = getName(su)
            const isSelected = selectedSu?.id === su.id
            return (
              <button key={su.id} onClick={() => selectSu(su)}
                className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-purple-50 border-l-2 border-l-purple-600' : ''}`}>
                <p className={`text-sm font-medium truncate ${isSelected ? 'text-purple-900' : 'text-slate-800'}`}>{name}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right */}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          {!selectedSu ? (
            <>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-xl text-slate-900">Home-level Quality Records</h2>
                <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setAddQAOpen(true)}>Record complaint / compliment</Button>
              </div>
              {qaRecords.length === 0 ? (
                <EmptyState title="No QA records yet" description="Record complaints, compliments, feedback and concerns"
                  action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddQAOpen(true)}>Add record</Button>} />
              ) : (
                <div className="space-y-3">
                  {qaRecords.map((r: any) => (
                    <div key={r.id} className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {r.record_type === 'compliment' ? <Star className="w-4 h-4 text-gold-500" /> : <AlertTriangle className="w-4 h-4 text-rose-500" />}
                          <span className={`badge ${r.record_type === 'compliment' ? 'badge-success' : r.record_type === 'complaint' ? 'badge-critical' : 'badge-info'}`}>{r.record_type}</span>
                          {r.su_name && <span className="text-xs text-slate-500">· {r.su_name}</span>}
                        </div>
                        <span className="text-xs text-slate-400">{format(new Date(r.created_at), 'd MMM yyyy')}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800">{r.summary}</p>
                      {r.detail && <p className="text-sm text-slate-600 mt-1">{r.detail}</p>}
                      {r.action_taken && <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-1.5 mt-2">Action: {r.action_taken}</p>}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className="font-display text-xl text-slate-900 mb-4">{getName(selectedSu)}</h2>
              <div className="flex gap-1 bg-white rounded-2xl border border-slate-100 p-1 mb-5">
                {[
                  { key: 'capacity', label: 'Capacity Assessment', icon: <Brain className="w-3.5 h-3.5" /> },
                  { key: 'professionals', label: 'Professionals', icon: <Users className="w-3.5 h-3.5" /> },
                  { key: 'sensitive', label: 'Sensitive Notes', icon: <Lock className="w-3.5 h-3.5" /> },
                ].map(t => (
                  <button key={t.key} onClick={() => setTab(t.key as QATab)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${tab === t.key ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              {loading ? <Spinner /> : tab === 'capacity' ? (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-slate-800">Capacity Assessments ({capacityRecords.length})</h3>
                    <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setAddCapacityOpen(true)}>Add assessment</Button>
                  </div>
                  {capacityRecords.length === 0 ? <EmptyState title="No capacity assessments" description="Document mental capacity decisions" action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddCapacityOpen(true)}>Add assessment</Button>} /> : (
                    <div className="space-y-3">
                      {capacityRecords.map((r: any) => (
                        <Card key={r.id} className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-slate-900">{r.decision_area}</h4>
                            <span className={`badge ${r.has_capacity === true ? 'badge-success' : r.has_capacity === false ? 'badge-critical' : 'badge-info'}`}>
                              {r.has_capacity === true ? 'Has capacity' : r.has_capacity === false ? 'Lacks capacity' : 'Under review'}
                            </span>
                          </div>
                          {r.best_interest_decision && <p className="text-sm text-slate-600 mb-1"><strong>Best interest:</strong> {r.best_interest_decision}</p>}
                          {r.consulted_with && <p className="text-sm text-slate-600 mb-1"><strong>Consulted:</strong> {r.consulted_with}</p>}
                          {r.outcome && <p className="text-sm text-slate-600"><strong>Outcome:</strong> {r.outcome}</p>}
                          <p className="text-xs text-slate-400 mt-2">Assessed by {r.assessed_by_name} · {format(new Date(r.created_at), 'd MMM yyyy')}</p>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ) : tab === 'professionals' ? (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-slate-800">Professional Involvement ({professionals.length})</h3>
                    <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setAddProfOpen(true)}>Add professional</Button>
                  </div>
                  {professionals.length === 0 ? <EmptyState title="No professionals listed" description="Add GPs, social workers, advocates, and other professionals" action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddProfOpen(true)}>Add professional</Button>} /> : (
                    <div className="space-y-3">
                      {professionals.map((p: any) => (
                        <Card key={p.id} className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-slate-900">{p.full_name}</p>
                              <p className="text-sm text-slate-600">{p.role_title}{p.organisation && ` · ${p.organisation}`}</p>
                              <div className="flex gap-3 mt-1 text-xs text-slate-400">
                                {p.phone && <span>📞 {p.phone}</span>}
                                {p.email && <span>✉ {p.email}</span>}
                              </div>
                              {p.notes && <p className="text-xs text-slate-500 mt-1">{p.notes}</p>}
                            </div>
                            <Button size="sm" variant="ghost" onClick={async () => {
                              await api.delete(`/quality/professionals/${p.id}`)
                              const res = await api.get(`/quality/professionals/${selectedSu.id}`)
                              setProfessionals(res.data.data || [])
                              toast.success('Removed')
                            }}>Remove</Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-slate-500" />
                      <h3 className="font-semibold text-slate-800">Sensitive Notes ({sensitiveNotes.length})</h3>
                    </div>
                    <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setAddNoteOpen(true)}>Add note</Button>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700 font-medium">
                    🔒 These notes are confidential and visible to managers only
                  </div>
                  {sensitiveNotes.length === 0 ? <EmptyState title="No sensitive notes" description="Document confidential information securely" action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddNoteOpen(true)}>Add note</Button>} /> : (
                    <div className="space-y-3">
                      {sensitiveNotes.map((n: any) => (
                        <Card key={n.id} className="p-4">
                          <p className="text-sm text-slate-800 whitespace-pre-line">{n.note}</p>
                          <p className="text-xs text-slate-400 mt-2">{n.created_by_name} · {format(new Date(n.created_at), 'd MMM yyyy, HH:mm')}</p>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddQAModal open={addQAOpen} onClose={() => setAddQAOpen(false)} sus={sus} homeId={selectedHome}
        onSaved={async () => { setAddQAOpen(false); const res = await api.get('/quality', { params: { homeId: selectedHome } }); setQaRecords(res.data.data || []); toast.success('Record added') }} />

      {selectedSu && (
        <>
          <AddCapacityModal open={addCapacityOpen} onClose={() => setAddCapacityOpen(false)} suId={selectedSu.id}
            onSaved={async () => { setAddCapacityOpen(false); const res = await api.get(`/quality/capacity/${selectedSu.id}`); setCapacityRecords(res.data.data || []); toast.success('Assessment recorded') }} />
          <AddProfessionalModal open={addProfOpen} onClose={() => setAddProfOpen(false)} suId={selectedSu.id}
            onSaved={async () => { setAddProfOpen(false); const res = await api.get(`/quality/professionals/${selectedSu.id}`); setProfessionals(res.data.data || []); toast.success('Professional added') }} />
          <AddSensitiveNoteModal open={addNoteOpen} onClose={() => setAddNoteOpen(false)} suId={selectedSu.id}
            onSaved={async () => { setAddNoteOpen(false); const res = await api.get(`/quality/sensitive-notes/${selectedSu.id}`); setSensitiveNotes(res.data.data || []); toast.success('Note saved') }} />
        </>
      )}
    </div>
  )
}

function AddQAModal({ open, onClose, sus, homeId, onSaved }: { open: boolean; onClose: () => void; sus: any[]; homeId: string; onSaved: () => void }) {
  const [form, setForm] = useState({ recordType: 'complaint', suId: '', summary: '', detail: '', actionTaken: '', reportedBy: '', severity: 'low' })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const suOptions = sus.map(su => ({ value: su.id, label: `${su.first_name || su.firstName} ${su.last_name || su.lastName}` }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try { await api.post('/quality', { homeId, ...form, suId: form.suId || null }); onSaved() }
    catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Record complaint / compliment" size="md">
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Select label="Type *" required value={form.recordType} onChange={e => set('recordType', e.target.value)} options={QA_TYPES} />
          <Select label="Severity" value={form.severity} onChange={e => set('severity', e.target.value)} options={SEVERITIES} />
        </div>
        <Select label="Linked to resident (optional)" value={form.suId} onChange={e => set('suId', e.target.value)} options={suOptions} placeholder="Select resident (optional)" />
        <Input label="Summary *" required value={form.summary} onChange={e => set('summary', e.target.value)} placeholder="Brief summary of the issue..." />
        <div><label className="label">Full details</label><textarea className="input" rows={3} value={form.detail} onChange={e => set('detail', e.target.value)} /></div>
        <div><label className="label">Action taken</label><textarea className="input" rows={2} value={form.actionTaken} onChange={e => set('actionTaken', e.target.value)} /></div>
        <Input label="Reported by" value={form.reportedBy} onChange={e => set('reportedBy', e.target.value)} placeholder="Who raised this..." />
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Save record</Button>
        </div>
      </form>
    </Modal>
  )
}

function AddCapacityModal({ open, onClose, suId, onSaved }: { open: boolean; onClose: () => void; suId: string; onSaved: () => void }) {
  const [form, setForm] = useState({ decisionArea: '', hasCapacity: '', bestInterestDecision: '', consultedWith: '', outcome: '', reviewDate: '' })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const hasCapacity = form.hasCapacity === 'yes' ? true : form.hasCapacity === 'no' ? false : null
      await api.post('/quality/capacity', { suId, ...form, hasCapacity }); onSaved()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Capacity Assessment" size="md">
      <form onSubmit={save} className="space-y-4">
        <Input label="Decision area *" required value={form.decisionArea} onChange={e => set('decisionArea', e.target.value)} placeholder="e.g. Financial decisions, medical treatment, living arrangements..." />
        <Select label="Does the person have capacity?" value={form.hasCapacity} onChange={e => set('hasCapacity', e.target.value)}
          options={[{ value: 'yes', label: 'Yes — has capacity' }, { value: 'no', label: 'No — lacks capacity' }, { value: 'unclear', label: 'Unclear — further assessment needed' }]} placeholder="Select outcome" />
        <div><label className="label">Best interest decision (if lacking capacity)</label><textarea className="input" rows={3} value={form.bestInterestDecision} onChange={e => set('bestInterestDecision', e.target.value)} /></div>
        <Input label="Who was consulted" value={form.consultedWith} onChange={e => set('consultedWith', e.target.value)} placeholder="Family, advocate, social worker..." />
        <div><label className="label">Outcome</label><textarea className="input" rows={2} value={form.outcome} onChange={e => set('outcome', e.target.value)} /></div>
        <Input label="Review date" type="date" value={form.reviewDate} onChange={e => set('reviewDate', e.target.value)} />
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Save assessment</Button>
        </div>
      </form>
    </Modal>
  )
}

function AddProfessionalModal({ open, onClose, suId, onSaved }: { open: boolean; onClose: () => void; suId: string; onSaved: () => void }) {
  const [form, setForm] = useState({ roleTitle: '', fullName: '', organisation: '', phone: '', email: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try { await api.post('/quality/professionals', { suId, ...form }); onSaved() }
    catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add professional">
      <form onSubmit={save} className="space-y-4">
        <Input label="Role / title *" required value={form.roleTitle} onChange={e => set('roleTitle', e.target.value)} placeholder="e.g. GP, Social Worker, Advocate, Care Coordinator..." />
        <Input label="Full name *" required value={form.fullName} onChange={e => set('fullName', e.target.value)} />
        <Input label="Organisation" value={form.organisation} onChange={e => set('organisation', e.target.value)} placeholder="NHS Trust, Local Authority..." />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Phone" value={form.phone} onChange={e => set('phone', e.target.value)} />
          <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Add professional</Button>
        </div>
      </form>
    </Modal>
  )
}

function AddSensitiveNoteModal({ open, onClose, suId, onSaved }: { open: boolean; onClose: () => void; suId: string; onSaved: () => void }) {
  const [note, setNote] = useState('')
  const [category, setCategory] = useState('general')
  const [loading, setLoading] = useState(false)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try { await api.post('/quality/sensitive-notes', { suId, note, category }); onSaved() }
    catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add sensitive note" size="md">
      <form onSubmit={save} className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium">
          <Lock className="w-4 h-4" /> This note is confidential — visible to managers only
        </div>
        <Select label="Category" value={category} onChange={e => setCategory(e.target.value)}
          options={[{ value: 'general', label: 'General' }, { value: 'legal', label: 'Legal' }, { value: 'financial', label: 'Financial' }, { value: 'safeguarding', label: 'Safeguarding' }, { value: 'medical', label: 'Medical' }]} />
        <div><label className="label">Note *</label><textarea required className="input" rows={5} value={note} onChange={e => setNote(e.target.value)} placeholder="Document sensitive information here..." /></div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading} icon={<Lock className="w-4 h-4" />}>Save confidential note</Button>
        </div>
      </form>
    </Modal>
  )
}
