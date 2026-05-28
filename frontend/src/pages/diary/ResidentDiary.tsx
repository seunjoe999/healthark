import React, { useEffect, useState } from 'react'
import api from '../../api'
import { Spinner, EmptyState, Button, Input } from '../../components/ui'
import { Calendar, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'

export default function ResidentDiary() {
  const { user, isRole } = useAuth()
  const [serviceUsers, setServiceUsers] = useState<any[]>([])
  const [selectedSU, setSelectedSU] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    annualHealthDate: '', annualHealthNotes: '', annualHealthNa: false,
    gpReviewDate: '', gpReviewNotes: '', gpReviewNa: false,
    mentalHealthDate: '', mentalHealthNotes: '', mentalHealthNa: false,
    dentistDate: '', dentistNotes: '', dentistNa: false,
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
    if (!selectedSU) return
    const su = serviceUsers.find(s => s.id === selectedSU)
    if (su) {
      setForm({
        annualHealthDate: su.annual_health_date?.split('T')[0] || '',
        annualHealthNotes: su.annual_health_notes || '',
        annualHealthNa: su.annual_health_na || false,
        gpReviewDate: su.gp_review_date?.split('T')[0] || '',
        gpReviewNotes: su.gp_review_notes || '',
        gpReviewNa: su.gp_review_na || false,
        mentalHealthDate: su.mental_health_date?.split('T')[0] || '',
        mentalHealthNotes: su.mental_health_notes || '',
        mentalHealthNa: su.mental_health_na || false,
        dentistDate: su.dentist_date?.split('T')[0] || '',
        dentistNotes: su.dentist_notes || '',
        dentistNa: su.dentist_na || false,
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
        annual_health_date: form.annualHealthDate, annual_health_notes: form.annualHealthNotes, annual_health_na: form.annualHealthNa,
        gp_review_date: form.gpReviewDate, gp_review_notes: form.gpReviewNotes, gp_review_na: form.gpReviewNa,
        mental_health_date: form.mentalHealthDate, mental_health_notes: form.mentalHealthNotes, mental_health_na: form.mentalHealthNa,
        dentist_date: form.dentistDate, dentist_notes: form.dentistNotes, dentist_na: form.dentistNa,
      } : s))
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save')
    }
    setSaving(false)
  }

  const renderSection = (title: string, dateKey: string, notesKey: string, naKey: string) => {
    const isNa = (form as any)[naKey]
    return (
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 text-lg">{title}</h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isNa} onChange={e => set(naKey, e.target.checked)} className="rounded accent-purple-600 w-4 h-4" />
            <span className="text-sm font-medium text-slate-600">Not Applicable (N/A)</span>
          </label>
        </div>
        {!isNa && (
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Review Date</label>
              <input type="date" className="input w-full" value={(form as any)[dateKey]} onChange={e => set(dateKey, e.target.value)} />
            </div>
            <div className="md:col-span-2">
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
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-purple-600" />
            Resident Diary (Health Reviews)
          </h1>
          <p className="text-slate-500 text-sm mt-1">Track annual health, GP, mental health, and dentist reviews.</p>
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
          {renderSection('Annual Health Check', 'annualHealthDate', 'annualHealthNotes', 'annualHealthNa')}
          {renderSection('GP Review', 'gpReviewDate', 'gpReviewNotes', 'gpReviewNa')}
          {renderSection('Mental Health Review', 'mentalHealthDate', 'mentalHealthNotes', 'mentalHealthNa')}
          {renderSection('Dentist Review', 'dentistDate', 'dentistNotes', 'dentistNa')}

          <div className="mt-6 flex justify-end">
            <Button type="submit" variant="gold" loading={saving}>Save Health Reviews</Button>
          </div>
        </form>
      ) : (
        <EmptyState title="Select a resident" description="Choose a resident from the dropdown to manage their diary." />
      )}
    </div>
  )
}
