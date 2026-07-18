import React, { useEffect, useState } from 'react'
import api from '../../api'
import { suApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, Button } from '../../components/ui'
import toast from 'react-hot-toast'
import { ClipboardList, Save, Printer, CheckCircle, Clock, AlertCircle, Plus } from 'lucide-react'

const REFERRAL_TYPES = ['GP visit', 'District Nurse', 'Physiotherapy', 'Occupational Therapy', 'Dietitian', 'SALT (Speech & Language)', 'Chiropodist/Podiatrist', 'Optician', 'Dentist', 'Mental Health/Psychiatry', 'Palliative Care', 'Community Matron', 'Hospital Consultant', 'Continence Nurse', 'Tissue Viability', 'Other']
const URGENCY = ['Routine', 'Urgent (within 24h)', 'Emergency (same day)']
const STATUSES = ['Pending', 'Appointment booked', 'Seen', 'No response', 'Declined', 'Cancelled']

export default function GPReferral() {
  const { user } = useAuth()
  const [residents, setResidents] = useState<any[]>([])
  const [selectedSu, setSelectedSu] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [referralType, setReferralType] = useState('')
  const [referralTypeOther, setReferralTypeOther] = useState('')
  const [urgency, setUrgency] = useState('Routine')
  const [reason, setReason] = useState('')
  const [referredTo, setReferredTo] = useState('')
  const [appointmentDate, setAppointmentDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const [referrals, setReferrals] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.homeId) return
    suApi.list(user.homeId, { status: 'live' }).then(r => setResidents(r.data.data || [])).catch(() => {})
  }, [user])

  useEffect(() => {
    if (!selectedSu) return
    setLoading(true)
    api.get(`/clinical/gp-referrals/${selectedSu}`)
      .then(r => setReferrals(r.data.data || []))
      .catch(() => setReferrals([]))
      .finally(() => setLoading(false))
  }, [selectedSu])

  const save = async () => {
    if (!selectedSu || !referralType || !reason) return
    setSaving(true)
    try {
      const type = referralType === 'Other' ? referralTypeOther : referralType
      await api.post('/clinical/gp-referrals', {
        suId: selectedSu, homeId: user?.homeId, referralType: type,
        urgency, reason, referredTo, appointmentDate: appointmentDate || null,
        notes, staffId: user?.id,
      })
      toast.success('Referral logged')
      const r = await api.get(`/clinical/gp-referrals/${selectedSu}`)
      setReferrals(r.data.data || [])
      setShowForm(false); setReferralType(''); setReferralTypeOther(''); setUrgency('Routine'); setReason(''); setReferredTo(''); setAppointmentDate(''); setNotes('')
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to save')
    } finally { setSaving(false) }
  }

  const updateStatus = async (id: string, status: string, outcome?: string) => {
    setUpdatingId(id)
    try {
      await api.patch(`/clinical/gp-referrals/${id}`, { status, outcome })
      const r = await api.get(`/clinical/gp-referrals/${selectedSu}`)
      setReferrals(r.data.data || [])
    } catch { toast.error('Failed to update') }
    finally { setUpdatingId(null) }
  }

  const getStatusInfo = (status: string) => {
    if (status === 'Seen') return { color: '#166534', bg: '#f0fdf4', Icon: CheckCircle }
    if (status === 'Pending' || status === 'Appointment booked') return { color: '#854d0e', bg: '#fefce8', Icon: Clock }
    return { color: '#6b7280', bg: '#f9fafb', Icon: AlertCircle }
  }

  const URGENCY_COLORS: Record<string, string> = {
    'Routine': '#475569', 'Urgent (within 24h)': '#9a3412', 'Emergency (same day)': '#7f1d1d'
  }

  const openCount = referrals.filter(r => r.status === 'Pending' || r.status === 'Appointment booked').length

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-indigo-600" />
            GP / Referral Tracker
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Track referrals to GP, district nurses, allied health professionals and specialists</p>
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-2 bg-white">
          <Printer className="w-4 h-4" /> Print
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">Service User</label>
            <select className="input w-full max-w-xs" value={selectedSu} onChange={e => { setSelectedSu(e.target.value); setShowForm(false) }}>
              <option value="">— Select resident —</option>
              {residents.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
            </select>
          </div>
          {openCount > 0 && (
            <div className="text-right">
              <p className="text-xs text-slate-400">Open referrals</p>
              <p className="text-2xl font-black text-amber-600">{openCount}</p>
            </div>
          )}
        </div>
      </div>

      {selectedSu && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-all">
              <Plus className="w-4 h-4" /> New Referral
            </button>
          </div>

          {showForm && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-5">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">New Referral / Professional Visit</h2>
              </div>
              <div className="px-5 py-5 space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">Referral Type</label>
                  <div className="flex flex-wrap gap-1.5">
                    {REFERRAL_TYPES.map(t => (
                      <button key={t} onClick={() => setReferralType(t)}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                          referralType === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                        }`}>{t}</button>
                    ))}
                  </div>
                  {referralType === 'Other' && (
                    <input type="text" className="input w-full mt-2" placeholder="Specify referral type..." value={referralTypeOther} onChange={e => setReferralTypeOther(e.target.value)} />
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">Urgency</label>
                  <div className="flex gap-2">
                    {URGENCY.map(u => (
                      <button key={u} onClick={() => setUrgency(u)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex-1 ${
                          urgency === u ? 'text-white border-transparent' : 'bg-white text-slate-600 border-slate-200'
                        }`}
                        style={urgency === u ? { background: URGENCY_COLORS[u] } : {}}>
                        {u}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea className="input w-full" rows={2} placeholder="Reason for referral / clinical concern..." value={reason} onChange={e => setReason(e.target.value)} required />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Referred to (name / team)</label>
                    <input type="text" className="input w-full" placeholder="e.g. Dr Smith / CMHT" value={referredTo} onChange={e => setReferredTo(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Appointment date (if known)</label>
                    <input type="date" className="input w-full" value={appointmentDate} onChange={e => setAppointmentDate(e.target.value)} />
                  </div>
                </div>

                <textarea className="input w-full" rows={2} placeholder="Additional notes..." value={notes} onChange={e => setNotes(e.target.value)} />
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl">Cancel</button>
                  <Button icon={<Save className="w-4 h-4" />} onClick={save} loading={saving} disabled={!referralType || !reason}>Save Referral</Button>
                </div>
              </div>
            </div>
          )}

          {loading ? <div className="flex justify-center py-8"><Spinner /></div>
            : referrals.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No referrals logged yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {referrals.map((ref: any) => {
                  const si = getStatusInfo(ref.status)
                  return (
                    <div key={ref.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                      <div className="px-5 py-4 flex items-start gap-4">
                        <si.Icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: si.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-slate-800">{ref.referral_type}</p>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: URGENCY_COLORS[ref.urgency] || '#475569' }}>{ref.urgency}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: si.bg, color: si.color }}>{ref.status}</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">{ref.reason}</p>
                          {ref.referred_to && <p className="text-xs text-slate-400 mt-0.5">Referred to: {ref.referred_to}</p>}
                          {ref.appointment_date && <p className="text-xs text-slate-400">Appointment: {format(new Date(ref.appointment_date), 'd MMM yyyy')}</p>}
                          <p className="text-[10px] text-slate-400 mt-1">{ref.referred_at ? format(new Date(ref.referred_at), 'd MMM yyyy') : ''}{ref.staff_name ? ` · by ${ref.staff_name}` : ''}</p>
                          {ref.notes && <p className="text-xs text-slate-500 italic mt-1">{ref.notes}</p>}
                          {ref.outcome && <p className="text-xs text-emerald-700 font-semibold mt-1">Outcome: {ref.outcome}</p>}
                        </div>
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          {ref.status !== 'Seen' && (
                            <button onClick={() => {
                              const outcome = ref.status !== 'Seen' ? prompt('Outcome / notes from appointment:') || '' : ''
                              updateStatus(ref.id, 'Seen', outcome)
                            }}
                              disabled={updatingId === ref.id}
                              className="text-xs font-bold px-3 py-1.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700">
                              Mark Seen
                            </button>
                          )}
                          <select className="input text-xs py-1 pr-6" value={ref.status}
                            onChange={e => updateStatus(ref.id, e.target.value)}
                            disabled={updatingId === ref.id}>
                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
        </>
      )}
    </div>
  )
}
