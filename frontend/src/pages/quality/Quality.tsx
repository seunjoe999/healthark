import React, { useEffect, useState } from 'react'
import { homesApi, suApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Input, Select, Card } from '../../components/ui'
import { Plus, Users, Brain, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

type QATab = 'capacity' | 'professionals'

export default function Quality() {
  const { user } = useAuth()
  const [sus, setSus] = useState<any[]>([])
  const [selectedSu, setSelectedSu] = useState<any>(null)
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [tab, setTab] = useState<QATab>('capacity')
  const [capacityRecords, setCapacityRecords] = useState<any[]>([])
  const [professionals, setProfessionals] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [addCapacityOpen, setAddCapacityOpen] = useState(false)
  const [addProfOpen, setAddProfOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(true)

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

  const selectSu = async (su: any) => {
    setSelectedSu(su)
    setMobileSidebarOpen(false)
    setLoading(true)
    try {
      const [capRes, profRes] = await Promise.all([
        api.get(`/quality/capacity/${su.id}`),
        api.get(`/quality/professionals/${su.id}`),
      ])
      setCapacityRecords(capRes.data.data || [])
      setProfessionals(profRes.data.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const getName = (su: any) => `${su.first_name || su.firstName || ''} ${su.last_name || su.lastName || ''}`.trim()
  const filteredSus = sus.filter(su => getName(su).toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* Left — SU selector */}
      <div className={`${mobileSidebarOpen ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-72 md:flex-shrink-0 bg-white border-b md:border-b-0 md:border-r border-slate-100`}>
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 mb-3">Quality & Compliance</h2>
          {homes.length > 1 && <select className="input mb-2 text-sm" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>{homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select>}
          <input className="input text-sm" placeholder="Search residents..." value={search} onChange={e => setSearch(e.target.value)} />
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
      <div className={`${!mobileSidebarOpen || !selectedSu ? 'flex' : 'hidden'} md:flex flex-col flex-1 overflow-y-auto bg-slate-50`}>
        {selectedSu && (
          <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-white/10" style={{ background: '#111' }}>
            <button onClick={() => setMobileSidebarOpen(true)} className="text-amber-400 text-sm font-medium flex items-center gap-1">
              ← Back
            </button>
            <span className="text-white text-sm font-semibold">{getName(selectedSu)}</span>
          </div>
        )}
        <div className="p-6 flex-1">
        <div className="max-w-4xl mx-auto">
          {!selectedSu ? (
            <EmptyState title="Select a resident" description="Choose a resident from the list to view their capacity assessments and professional involvement records" />
          ) : (
            <>
              <h2 className="font-display text-xl text-slate-900 mb-4">{getName(selectedSu)}</h2>
              <div className="flex gap-1 bg-white rounded-2xl border border-slate-100 p-1 mb-5">
                {[
                  { key: 'capacity', label: 'Capacity Assessment', icon: <Brain className="w-3.5 h-3.5" /> },
                  { key: 'professionals', label: 'Professionals', icon: <Users className="w-3.5 h-3.5" /> },
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
                            <div className="flex items-center gap-2">
                              <span className={`badge ${r.has_capacity === true ? 'badge-success' : r.has_capacity === false ? 'badge-critical' : 'badge-info'}`}>
                                {r.has_capacity === true ? 'Has capacity' : r.has_capacity === false ? 'Lacks capacity' : 'Under review'}
                              </span>
                              <button onClick={async () => {
                                if (!window.confirm('Delete this assessment?')) return
                                try { await api.delete(`/quality/capacity/${r.id}`); const res = await api.get(`/quality/capacity/${selectedSu.id}`); setCapacityRecords(res.data.data || []); toast.success('Deleted') }
                                catch { toast.error('Failed to delete') }
                              }} className="p-1 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
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
              ) : null}
            </>
          )}
        </div>
      </div>
      </div>

      {/* Modals */}
      {selectedSu && (
        <>
          <AddCapacityModal open={addCapacityOpen} onClose={() => setAddCapacityOpen(false)} suId={selectedSu.id}
            onSaved={async () => { setAddCapacityOpen(false); const res = await api.get(`/quality/capacity/${selectedSu.id}`); setCapacityRecords(res.data.data || []); toast.success('Assessment recorded') }} />
          <AddProfessionalModal open={addProfOpen} onClose={() => setAddProfOpen(false)} suId={selectedSu.id}
            onSaved={async () => { setAddProfOpen(false); const res = await api.get(`/quality/professionals/${selectedSu.id}`); setProfessionals(res.data.data || []); toast.success('Professional added') }} />
        </>
      )}
    </div>
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
