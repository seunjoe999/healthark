import React, { useEffect, useState } from 'react'
import { homesApi } from '../../api'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, EmptyState, Button, Modal, Input, Select } from '../../components/ui'
import { Plus, AlertTriangle, CheckCircle, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Safeguarding() {
  const { user, isRole } = useAuth()
  const [concerns, setConcerns] = useState<any[]>([])
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [sus, setSus] = useState<any[]>([])

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
    })
  }, [user])

  useEffect(() => {
    if (!selectedHome) return
    setLoading(true)
    Promise.all([
      api.get('/safeguarding', { params: { homeId: selectedHome } }),
      api.get('/service-users', { params: { homeId: selectedHome, status: 'live' } }),
    ]).then(([scRes, suRes]) => {
      setConcerns(scRes.data.data || [])
      setSus(suRes.data.data || [])
    }).catch(console.error).finally(() => setLoading(false))
  }, [selectedHome])

  const acknowledge = async (id: string) => {
    try {
      await api.put(`/safeguarding/${id}/acknowledge`)
      const res = await api.get('/safeguarding', { params: { homeId: selectedHome } })
      setConcerns(res.data.data || [])
      toast.success('Safeguarding concern acknowledged')
    } catch { toast.error('Failed to acknowledge') }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-red-600" /> Safeguarding
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{concerns.length} concern{concerns.length !== 1 ? 's' : ''} recorded</p>
        </div>
        <div className="flex gap-3">
          {homes.length > 1 && (
            <select className="input w-auto" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
              {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>Record concern</Button>
        </div>
      </div>

      {loading ? <Spinner /> : concerns.length === 0 ? (
        <EmptyState title="No safeguarding concerns recorded" description="Record a concern when a safeguarding issue arises"
          action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>Record concern</Button>} />
      ) : (
        <div className="space-y-3">
          {concerns.map((c: any) => (
            <div key={c.id} className="bg-white rounded-xl border border-slate-100 shadow-sm">
              <button onClick={() => setSelected(selected?.id === c.id ? null : c)}
                className="w-full p-5 text-left hover:bg-slate-50">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className={`w-4 h-4 ${c.manager_ack ? 'text-green-500' : 'text-red-600'}`} />
                      <h3 className="font-semibold text-slate-900">{c.su_name}</h3>
                      {c.manager_ack
                        ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Acknowledged</span>
                        : <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Pending review</span>
                      }
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2">{c.overview}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {format(new Date(c.incident_date), 'd MMM yyyy')} · Recorded by {c.created_by_name}
                    </p>
                  </div>
                </div>
              </button>

              {selected?.id === c.id && (
                <div className="px-5 pb-5 border-t border-slate-50 space-y-4 pt-4">
                  <Field label="Location" value={c.incident_location} />
                  <Field label="Incident overview" value={c.overview} />
                  <Field label="Witnesses" value={c.witnesses} />
                  <Field label="Medical attention required" value={c.medical_required ? `Yes — ${c.medical_details || ''}` : 'No'} />
                  <Field label="Immediate actions taken" value={c.immediate_actions} />
                  <Field label="Decisions / rights breached" value={c.decisions_breached} />
                  <Field label="Lessons learnt" value={c.lessons_learnt} />
                  <Field label="Outside agencies contacted" value={c.outside_agency ? `Yes — ${c.agency_details || ''}` : 'No'} />
                  <Field label="Management recommendations" value={c.management_recs} />
                  <Field label="Prevention actions" value={c.prevention_actions} />
                  {!c.manager_ack && isRole('home_manager', 'group_admin') && (
                    <Button size="sm" icon={<CheckCircle className="w-4 h-4" />} onClick={() => acknowledge(c.id)}>
                      Acknowledge this concern
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AddConcernModal open={addOpen} onClose={() => setAddOpen(false)} sus={sus} homeId={selectedHome}
        onSaved={async () => {
          setAddOpen(false)
          const res = await api.get('/safeguarding', { params: { homeId: selectedHome } })
          setConcerns(res.data.data || [])
          toast.success('Safeguarding concern recorded')
        }} />
    </div>
  )
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-slate-700 whitespace-pre-line">{value}</p>
    </div>
  )
}

function AddConcernModal({ open, onClose, sus, homeId, onSaved }: { open: boolean; onClose: () => void; sus: any[]; homeId: string; onSaved: () => void }) {
  const [form, setForm] = useState({ suId: '', incidentDate: new Date().toISOString().split('T')[0], incidentTime: '', suLocation: '', incidentLocation: '', overview: '', witnesses: '', medicalRequired: false, medicalDetails: '', injuryDetails: '', immediateActions: '', decisionsBReached: '', lessonsLearnt: '', outsideAgency: false, agencyDetails: '', managementRecs: '', preventionActions: '' })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))
  const suOptions = sus.map(su => ({ value: su.id, label: `${su.first_name || su.firstName} ${su.last_name || su.lastName}` }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try { await api.post('/safeguarding', { ...form, homeId }); onSaved() }
    catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Record safeguarding concern" size="xl">
      <form onSubmit={save} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium">
          ⚠ Complete all fields as accurately and promptly as possible. This record cannot be deleted.
        </div>
        <Select label="Service user *" required value={form.suId} onChange={e => set('suId', e.target.value)} options={suOptions} placeholder="Select resident" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Date of incident *" type="date" required value={form.incidentDate} onChange={e => set('incidentDate', e.target.value)} />
          <Input label="Time of incident" type="time" value={form.incidentTime} onChange={e => set('incidentTime', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Where was the service user" value={form.suLocation} onChange={e => set('suLocation', e.target.value)} placeholder="e.g. Their bedroom" />
          <Input label="Where did it happen" value={form.incidentLocation} onChange={e => set('incidentLocation', e.target.value)} placeholder="e.g. Communal lounge" />
        </div>
        <div><label className="label">Incident overview *</label><textarea required className="input" rows={4} value={form.overview} onChange={e => set('overview', e.target.value)} /></div>
        <Input label="Witnesses" value={form.witnesses} onChange={e => set('witnesses', e.target.value)} />
        <div className="flex items-center gap-2"><input type="checkbox" checked={form.medicalRequired} onChange={e => set('medicalRequired', e.target.checked)} className="rounded" /><label className="text-sm">Medical attention was required</label></div>
        {form.medicalRequired && <Input label="Medical details" value={form.medicalDetails} onChange={e => set('medicalDetails', e.target.value)} />}
        <div><label className="label">Immediate actions taken *</label><textarea required className="input" rows={3} value={form.immediateActions} onChange={e => set('immediateActions', e.target.value)} /></div>
        <div><label className="label">What decisions or rights were breached</label><textarea className="input" rows={3} value={form.decisionsBReached} onChange={e => set('decisionsBReached', e.target.value)} /></div>
        <div><label className="label">Lessons learnt</label><textarea className="input" rows={2} value={form.lessonsLearnt} onChange={e => set('lessonsLearnt', e.target.value)} /></div>
        <div className="flex items-center gap-2"><input type="checkbox" checked={form.outsideAgency} onChange={e => set('outsideAgency', e.target.checked)} className="rounded" /><label className="text-sm">Outside agency was contacted</label></div>
        {form.outsideAgency && <Input label="Agency details" value={form.agencyDetails} onChange={e => set('agencyDetails', e.target.value)} />}
        <div><label className="label">Management recommendations</label><textarea className="input" rows={3} value={form.managementRecs} onChange={e => set('managementRecs', e.target.value)} /></div>
        <div><label className="label">Actions to prevent recurrence</label><textarea className="input" rows={3} value={form.preventionActions} onChange={e => set('preventionActions', e.target.value)} /></div>
        <div className="flex gap-3 justify-end pt-2 sticky bottom-0 bg-white">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="danger" loading={loading}>Submit safeguarding concern</Button>
        </div>
      </form>
    </Modal>
  )
}
