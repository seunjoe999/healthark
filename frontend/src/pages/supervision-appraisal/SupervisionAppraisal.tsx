import React, { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api'
import { Spinner, EmptyState, Button, Modal, Input, Select } from '../../components/ui'
import { Plus, User, Award, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface SupervisionRecord {
  id: string
  staff_id: string
  staff_name: string
  supervisor_id: string
  supervisor_name: string
  supervision_date: string
  supervision_type: string
  summary?: string
  strengths?: string
  areas_for_improvement?: string
  action_points?: string
  next_date?: string
}

interface AppraisalRecord {
  id: string
  staff_id: string
  staff_name: string
  appraiser_id: string
  appraiser_name: string
  appraisal_date: string
  rating?: string
  performance_summary?: string
  comments?: string
  goals?: string
  next_review_date?: string
}

export default function SupervisionAppraisal() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'supervision' | 'appraisal'>('supervision')
  const [supervisions, setSupervisions] = useState<SupervisionRecord[]>([])
  const [appraisals, setAppraisals] = useState<AppraisalRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [detailModal, setDetailModal] = useState<any>(null)

  const loadSupervisions = useCallback(async () => {
    if (!user?.homeId) return
    setLoading(true)
    try {
      const res = await api.get(`/supervision?homeId=${user.homeId}`)
      setSupervisions(res.data.data || [])
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to load supervisions')
    } finally {
      setLoading(false)
    }
  }, [user?.homeId])

  const loadAppraisals = useCallback(async () => {
    if (!user?.homeId) return
    setLoading(true)
    try {
      const res = await api.get(`/appraisal?homeId=${user.homeId}`)
      setAppraisals(res.data.data || [])
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to load appraisals')
    } finally {
      setLoading(false)
    }
  }, [user?.homeId])

  useEffect(() => {
    if (tab === 'supervision') loadSupervisions()
    else loadAppraisals()
  }, [tab, loadSupervisions, loadAppraisals])

  const handleDelete = async (id: string, type: 'supervision' | 'appraisal') => {
    if (!confirm('Delete this record?')) return
    try {
      const endpoint = type === 'supervision' ? `/supervision/${id}` : `/appraisal/${id}`
      await api.delete(endpoint)
      toast.success('Record deleted')
      if (type === 'supervision') loadSupervisions()
      else loadAppraisals()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to delete')
    }
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Supervision & Appraisals</h1>
          <p className="text-sm text-slate-500 mt-1">Staff supervision records and performance appraisals</p>
        </div>
        <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setCreateModalOpen(true)}>New Record</Button>
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white border-b border-slate-200 px-6 flex gap-0">
        {[
          { key: 'supervision', label: 'Supervisions', icon: User },
          { key: 'appraisal', label: 'Appraisals', icon: Award },
        ].map(t => {
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => setTab(t.key as any)} className={`px-4 py-2.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${ tab === t.key ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Spinner />
          </div>
        ) : tab === 'supervision' ? (
          supervisions.length === 0 ? (
            <EmptyState title="No supervisions" description="No supervision records found" action={<Button onClick={() => setCreateModalOpen(true)}>Create Record</Button>} />
          ) : (
            <div className="p-6 space-y-3">
              {supervisions.map(s => (
                <div key={s.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-sm transition-shadow">
                  <div className="p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50" onClick={() => setDetailModal({ ...s, type: 'supervision' })}>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800">{s.staff_name}</p>
                      <p className="text-xs text-slate-500 mt-1">Supervisor: {s.supervisor_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-slate-600">{s.supervision_type}</p>
                      <p className="text-sm text-slate-700">{new Date(s.supervision_date).toLocaleDateString()}</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); handleDelete(s.id, 'supervision'); }} className="text-slate-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          appraisals.length === 0 ? (
            <EmptyState title="No appraisals" description="No appraisal records found" action={<Button onClick={() => setCreateModalOpen(true)}>Create Record</Button>} />
          ) : (
            <div className="p-6 space-y-3">
              {appraisals.map(a => (
                <div key={a.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-sm transition-shadow">
                  <div className="p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50" onClick={() => setDetailModal({ ...a, type: 'appraisal' })}>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800">{a.staff_name}</p>
                      <p className="text-xs text-slate-500 mt-1">Appraiser: {a.appraiser_name}</p>
                    </div>
                    <div className="text-right">
                      {a.rating && <p className="text-sm font-bold text-slate-800">{a.rating}</p>}
                      <p className="text-sm text-slate-700">{new Date(a.appraisal_date).toLocaleDateString()}</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); handleDelete(a.id, 'appraisal'); }} className="text-slate-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* ── Modals ── */}
      <CreateRecordModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} homeId={user?.homeId || ''} type={tab} onSaved={() => tab === 'supervision' ? loadSupervisions() : loadAppraisals()} />
      {detailModal && <RecordDetailModal record={detailModal} onClose={() => setDetailModal(null)} />}
    </div>
  )
}

function CreateRecordModal({ open, onClose, homeId, type, onSaved }: { open: boolean; onClose: () => void; homeId: string; type: 'supervision' | 'appraisal'; onSaved: () => void }) {
  const [form, setForm] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [staff, setStaff] = useState<any[]>([])

  useEffect(() => {
    if (open) {
      api.get(`/staff?homeId=${homeId}`).then(res => setStaff(res.data.data || []))
      if (type === 'supervision') {
        setForm({ staffId: '', supervisorId: '', supervisionDate: '', supervisionType: 'routine', summary: '', strengths: '', areasForImprovement: '', actionPoints: '', nextDate: '' })
      } else {
        setForm({ staffId: '', appraiserId: '', appraisalDate: '', rating: 'good', performanceSummary: '', comments: '', goals: '', nextReviewDate: '' })
      }
    }
  }, [open, homeId, type])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.staffId || !form[type === 'supervision' ? 'supervisorId' : 'appraiserId'] || !(type === 'supervision' ? form.supervisionDate : form.appraisalDate)) {
      toast.error('Please fill required fields')
      return
    }
    setLoading(true)
    try {
      const endpoint = type === 'supervision' ? '/supervision' : '/appraisal'
      await api.post(endpoint, { homeId, ...form })
      toast.success('Record created')
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const supervisorOptions = staff.filter(s => s.role === 'team_leader' || s.role === 'manager').map(s => ({ value: s.id, label: `${s.first_name} ${s.last_name}` }))
  const staffOptions = staff.map(s => ({ value: s.id, label: `${s.first_name} ${s.last_name}` }))

  return (
    <Modal open={open} onClose={onClose} title={`Create ${type === 'supervision' ? 'Supervision' : 'Appraisal'} Record`} size="lg">
      <form onSubmit={save} className="space-y-4 max-h-96 overflow-y-auto">
        <Select label="Staff Member *" required value={form.staffId} onChange={e => setForm((p: any) => ({ ...p, staffId: e.target.value }))} options={staffOptions} placeholder="Select staff" />
        <Select label={type === 'supervision' ? 'Supervisor *' : 'Appraiser *'} required value={form[type === 'supervision' ? 'supervisorId' : 'appraiserId']} onChange={e => setForm((p: any) => ({ ...p, [type === 'supervision' ? 'supervisorId' : 'appraiserId']: e.target.value }))} options={supervisorOptions} placeholder="Select supervisor/appraiser" />
        <Input label={type === 'supervision' ? 'Supervision Date *' : 'Appraisal Date *'} type="date" required value={form[type === 'supervision' ? 'supervisionDate' : 'appraisalDate']} onChange={e => setForm((p: any) => ({ ...p, [type === 'supervision' ? 'supervisionDate' : 'appraisalDate']: e.target.value }))} />
        
        {type === 'supervision' ? (
          <>
            <Select label="Type *" required value={form.supervisionType} onChange={e => setForm((p: any) => ({ ...p, supervisionType: e.target.value }))} options={[ { value: 'routine', label: 'Routine' }, { value: 'formal', label: 'Formal' }, { value: 'informal', label: 'Informal' }]} />
            <textarea className="input" placeholder="Summary..." rows={2} value={form.summary} onChange={e => setForm((p: any) => ({ ...p, summary: e.target.value }))} />
            <textarea className="input" placeholder="Strengths..." rows={2} value={form.strengths} onChange={e => setForm((p: any) => ({ ...p, strengths: e.target.value }))} />
            <textarea className="input" placeholder="Areas for improvement..." rows={2} value={form.areasForImprovement} onChange={e => setForm((p: any) => ({ ...p, areasForImprovement: e.target.value }))} />
            <textarea className="input" placeholder="Action points..." rows={2} value={form.actionPoints} onChange={e => setForm((p: any) => ({ ...p, actionPoints: e.target.value }))} />
            <Input label="Next supervision date" type="date" value={form.nextDate} onChange={e => setForm((p: any) => ({ ...p, nextDate: e.target.value }))} />
          </>
        ) : (
          <>
            <Select label="Rating" value={form.rating} onChange={e => setForm((p: any) => ({ ...p, rating: e.target.value }))} options={[ { value: 'excellent', label: 'Excellent' }, { value: 'good', label: 'Good' }, { value: 'satisfactory', label: 'Satisfactory' }, { value: 'needs_improvement', label: 'Needs Improvement' }]} />
            <textarea className="input" placeholder="Performance summary..." rows={2} value={form.performanceSummary} onChange={e => setForm((p: any) => ({ ...p, performanceSummary: e.target.value }))} />
            <textarea className="input" placeholder="Comments..." rows={2} value={form.comments} onChange={e => setForm((p: any) => ({ ...p, comments: e.target.value }))} />
            <textarea className="input" placeholder="Goals for next year..." rows={2} value={form.goals} onChange={e => setForm((p: any) => ({ ...p, goals: e.target.value }))} />
            <Input label="Next review date" type="date" value={form.nextReviewDate} onChange={e => setForm((p: any) => ({ ...p, nextReviewDate: e.target.value }))} />
          </>
        )}
        
        <div className="flex gap-3 justify-end pt-2 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Create Record</Button>
        </div>
      </form>
    </Modal>
  )
}

function RecordDetailModal({ record, onClose }: { record: any; onClose: () => void }) {
  const isSupervision = record.type === 'supervision'

  return (
    <Modal open={true} onClose={onClose} title={isSupervision ? 'Supervision Detail' : 'Appraisal Detail'} size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-slate-50 rounded">
            <p className="text-xs font-semibold text-slate-600 mb-1">Staff</p>
            <p className="font-semibold text-slate-800">{record.staff_name}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded">
            <p className="text-xs font-semibold text-slate-600 mb-1">{isSupervision ? 'Supervisor' : 'Appraiser'}</p>
            <p className="font-semibold text-slate-800">{isSupervision ? record.supervisor_name : record.appraiser_name}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-slate-50 rounded">
            <p className="text-xs font-semibold text-slate-600 mb-1">Date</p>
            <p className="font-semibold text-slate-800">{new Date(isSupervision ? record.supervision_date : record.appraisal_date).toLocaleDateString()}</p>
          </div>
          {isSupervision && (
            <div className="p-3 bg-slate-50 rounded">
              <p className="text-xs font-semibold text-slate-600 mb-1">Type</p>
              <p className="font-semibold text-slate-800">{record.supervision_type}</p>
            </div>
          )}
          {!isSupervision && record.rating && (
            <div className="p-3 bg-slate-50 rounded">
              <p className="text-xs font-semibold text-slate-600 mb-1">Rating</p>
              <p className="font-bold text-slate-800">{record.rating}</p>
            </div>
          )}
        </div>

        {(isSupervision ? record.summary : record.performance_summary) && (
          <div className="p-3 bg-blue-50 rounded border border-blue-200">
            <p className="text-xs font-semibold text-blue-700 mb-1">{isSupervision ? 'Summary' : 'Performance Summary'}</p>
            <p className="text-sm text-blue-600">{isSupervision ? record.summary : record.performance_summary}</p>
          </div>
        )}

        {isSupervision && record.strengths && (
          <div className="p-3 bg-green-50 rounded border border-green-200">
            <p className="text-xs font-semibold text-green-700 mb-1">Strengths</p>
            <p className="text-sm text-green-600">{record.strengths}</p>
          </div>
        )}

        {isSupervision && record.areasForImprovement && (
          <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
            <p className="text-xs font-semibold text-yellow-700 mb-1">Areas for Improvement</p>
            <p className="text-sm text-yellow-600">{record.areasForImprovement}</p>
          </div>
        )}

        {isSupervision && record.nextDate && (
          <div className="p-3 bg-slate-50 rounded">
            <p className="text-xs font-semibold text-slate-600 mb-1">Next Supervision</p>
            <p className="text-sm text-slate-700">{new Date(record.nextDate).toLocaleDateString()}</p>
          </div>
        )}

        {!isSupervision && record.nextReviewDate && (
          <div className="p-3 bg-slate-50 rounded">
            <p className="text-xs font-semibold text-slate-600 mb-1">Next Review</p>
            <p className="text-sm text-slate-700">{new Date(record.nextReviewDate).toLocaleDateString()}</p>
          </div>
        )}

        <div className="flex gap-3 justify-end pt-2 border-t">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  )
}
