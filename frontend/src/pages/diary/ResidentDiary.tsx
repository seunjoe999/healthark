import React, { useEffect, useState } from 'react'
import api from '../../api'
import { Spinner, EmptyState, Button, Input } from '../../components/ui'
import { Calendar, User, AlertTriangle, Plus, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'

export default function ResidentDiary() {
  const { user, isRole } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [serviceUsers, setServiceUsers] = useState<any[]>([])
  const [selectedSU, setSelectedSU] = useState(searchParams.get('su') || '')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [incidents, setIncidents] = useState<any[]>([])
  const [incidentsLoading, setIncidentsLoading] = useState(false)

  const [form, setForm] = useState({
    annualHealthDate: '', annualHealthNotes: '', annualHealthNa: false, annualHealthDueDate: '',
    gpReviewDate: '', gpReviewNotes: '', gpReviewNa: false, gpReviewDueDate: '',
    mentalHealthDate: '', mentalHealthNotes: '', mentalHealthNa: false, mentalHealthDueDate: '',
    dentistDate: '', dentistNotes: '', dentistNa: false, dentistDueDate: '',
    opticianDate: '', opticianNotes: '', opticianNa: false, opticianDueDate: '',
  })

  useEffect(() => {
    api.get('/service-users', { params: { homeId: user?.homeId } })
      .then(res => {
        setServiceUsers(res.data.data || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [user])

  useEffect(() => {
    if (!selectedSU) { setIncidents([]); return }
    setIncidentsLoading(true)
    api.get('/incidents', { params: { suId: selectedSU, homeId: user?.homeId } })
      .then(res => setIncidents(res.data.data || []))
      .catch(() => setIncidents([]))
      .finally(() => setIncidentsLoading(false))
  }, [selectedSU, user])

  useEffect(() => {
    if (!selectedSU) return
    const su = serviceUsers.find(s => s.id === selectedSU)
    if (su) {
      setForm({
        annualHealthDate: su.annual_health_date?.split('T')[0] || '',
        annualHealthNotes: su.annual_health_notes || '',
        annualHealthNa: su.annual_health_na || false,
        annualHealthDueDate: su.annual_health_due_date?.split('T')[0] || '',
        gpReviewDate: su.gp_review_date?.split('T')[0] || '',
        gpReviewNotes: su.gp_review_notes || '',
        gpReviewNa: su.gp_review_na || false,
        gpReviewDueDate: su.gp_review_due_date?.split('T')[0] || '',
        mentalHealthDate: su.mental_health_date?.split('T')[0] || '',
        mentalHealthNotes: su.mental_health_notes || '',
        mentalHealthNa: su.mental_health_na || false,
        mentalHealthDueDate: su.mental_health_due_date?.split('T')[0] || '',
        dentistDate: su.dentist_date?.split('T')[0] || '',
        dentistNotes: su.dentist_notes || '',
        dentistNa: su.dentist_na || false,
        dentistDueDate: su.dentist_due_date?.split('T')[0] || '',
        opticianDate: su.optician_date?.split('T')[0] || '',
        opticianNotes: su.optician_notes || '',
        opticianNa: su.optician_na || false,
        opticianDueDate: su.optician_due_date?.split('T')[0] || '',
      })
    }
  }, [selectedSU, serviceUsers])

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSU) return
    setSaving(true)
    try {
      await api.put(`/service-users/${selectedSU}`, form)
      toast.success('Health reviews saved')
      // Update local state
      setServiceUsers(prev => prev.map(s => s.id === selectedSU ? {
        ...s,
        annual_health_date: form.annualHealthDate, annual_health_notes: form.annualHealthNotes, annual_health_na: form.annualHealthNa, annual_health_due_date: form.annualHealthDueDate,
        gp_review_date: form.gpReviewDate, gp_review_notes: form.gpReviewNotes, gp_review_na: form.gpReviewNa, gp_review_due_date: form.gpReviewDueDate,
        mental_health_date: form.mentalHealthDate, mental_health_notes: form.mentalHealthNotes, mental_health_na: form.mentalHealthNa, mental_health_due_date: form.mentalHealthDueDate,
        dentist_date: form.dentistDate, dentist_notes: form.dentistNotes, dentist_na: form.dentistNa, dentist_due_date: form.dentistDueDate,
        optician_date: form.opticianDate, optician_notes: form.opticianNotes, optician_na: form.opticianNa, optician_due_date: form.opticianDueDate,
      } : s))
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save')
    }
    setSaving(false)
  }

  const renderSection = (title: string, dateKey: string, notesKey: string, naKey: string, dueDateKey: string) => {
    const isNa = (form as any)[naKey]
    const dueDate = (form as any)[dueDateKey]
    const isOverdue = dueDate && dueDate < format(new Date(), 'yyyy-MM-dd')
    return (
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 text-lg flex items-center gap-2">
            {title}
            {!isNa && isOverdue && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                <AlertTriangle className="w-3 h-3" /> Overdue
              </span>
            )}
          </h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isNa} onChange={e => set(naKey, e.target.checked)} className="rounded accent-purple-600 w-4 h-4" />
            <span className="text-sm font-medium text-slate-600">Not Applicable (N/A)</span>
          </label>
        </div>
        {!isNa && (
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Last Review Date</label>
              <input type="date" className="input w-full" value={(form as any)[dateKey]} onChange={e => set(dateKey, e.target.value)} />
            </div>
            <div className="md:col-span-1">
              <label className={`text-xs font-semibold uppercase tracking-wider mb-1 block ${isOverdue ? 'text-rose-600' : 'text-slate-500'}`}>Next Review Due Date</label>
              <input type="date" className={`input w-full ${isOverdue ? 'border-rose-300 text-rose-700' : ''}`} value={dueDate} onChange={e => set(dueDateKey, e.target.value)} />
            </div>
            <div className="md:col-span-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Notes</label>
              <input type="text" className="input w-full" placeholder="Add a little note..." value={(form as any)[notesKey]} onChange={e => set(notesKey, e.target.value)} />
            </div>
          </div>
        )}
        {isNa && <p className="text-sm text-slate-400 italic">This review is marked as Not Applicable for this resident.</p>}
      </div>
    )
  }

  if (loading) return <div className="p-8"><Spinner /></div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold uppercase flex items-center gap-2" style={{ color: '#e8b130' }}>
            <Calendar className="w-6 h-6" style={{ color: '#e8b130' }} />
            RESIDENTS HEALTH CHECK
          </h1>
          <p className="text-slate-500 text-sm mt-1">Track annual health, GP, mental health, dentist, and optician reviews.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex items-center gap-4">
        <User className="w-5 h-5 text-slate-400" />
        <select className="input flex-1 font-semibold text-slate-800" value={selectedSU} onChange={e => setSelectedSU(e.target.value)}>
          <option value="" disabled>-- Select a resident --</option>
          {serviceUsers.map(su => (
            <option key={su.id} value={su.id}>{su.first_name} {su.last_name}</option>
          ))}
        </select>
      </div>

      {selectedSU ? (
        <form onSubmit={save}>
          {renderSection('Annual Health Check', 'annualHealthDate', 'annualHealthNotes', 'annualHealthNa', 'annualHealthDueDate')}
          {renderSection('GP Review', 'gpReviewDate', 'gpReviewNotes', 'gpReviewNa', 'gpReviewDueDate')}
          {renderSection('Mental Health Review', 'mentalHealthDate', 'mentalHealthNotes', 'mentalHealthNa', 'mentalHealthDueDate')}
          {renderSection('Dentist Review', 'dentistDate', 'dentistNotes', 'dentistNa', 'dentistDueDate')}
          {renderSection('Optician Review', 'opticianDate', 'opticianNotes', 'opticianNa', 'opticianDueDate')}

          <div className="mt-6 flex justify-end">
            <Button type="submit" variant="gold" loading={saving}>Save Health Reviews</Button>
          </div>
        </form>
      ) : (
        <EmptyState title="Select a resident" description="Choose a resident from the dropdown to manage their diary." />
      )}

      {selectedSU && (
        <div className="mt-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" /> Incidents
            </h3>
            <button
              type="button"
              onClick={() => navigate('/incidents')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
            >
              <Plus className="w-4 h-4" /> Log New Incident
            </button>
          </div>
          {incidentsLoading ? (
            <Spinner />
          ) : incidents.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No incidents recorded for this resident.</p>
          ) : (
            <div className="space-y-2">
              {incidents.slice(0, 10).map((inc: any) => (
                <div key={inc.id} className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-100">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-red-700 uppercase tracking-wide capitalize">
                        {(inc.incident_type || 'incident').replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-slate-400">
                        {inc.record_date ? format(new Date(inc.record_date), 'd MMM yyyy') : ''}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 truncate">{inc.description || inc.notes || '—'}</p>
                  </div>
                </div>
              ))}
              {incidents.length > 10 && (
                <button
                  type="button"
                  onClick={() => navigate('/incidents')}
                  className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium mt-1"
                >
                  <ExternalLink className="w-3 h-3" /> View all {incidents.length} incidents
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
