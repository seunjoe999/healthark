import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { Heart, Phone, MapPin, Calendar, FileText, Loader2, AlertTriangle } from 'lucide-react'

export default function FamilyView() {
  const { token } = useParams<{ token: string }>()
  const [resident, setResident] = useState<any>(null)
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    fetch(`/api/family/${token}`)
      .then(r => r.json())
      .then(data => {
        if (!data.success) { setError(data.error || 'Not found'); return }
        setResident(data.data.resident)
        setRecords(data.data.records || [])
      })
      .catch(() => setError('Could not load resident information'))
      .finally(() => setLoading(false))
  }, [token])

  const bgStyle = { minHeight: '100vh', background: 'linear-gradient(135deg, #0d1526 0%, #151f35 40%, #1e2d4a 100%)' }

  if (loading) {
    return (
      <div style={bgStyle} className="flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
      </div>
    )
  }

  if (error || !resident) {
    return (
      <div style={bgStyle} className="flex items-center justify-center p-6">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-white text-xl font-semibold mb-2">Link not found</h2>
          <p className="text-slate-400 text-sm">{error || 'This family portal link is invalid or has expired.'}</p>
        </div>
      </div>
    )
  }

  const name = resident.preferred_name || `${resident.first_name} ${resident.last_name}`

  return (
    <div style={bgStyle} className="min-h-screen py-8 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <img src="/logo.jpeg" alt="CompCare Hub" className="w-12 h-12 rounded-xl mx-auto mb-3 shadow-lg" style={{ background: 'white', padding: '4px', objectFit: 'contain' }} />
          <p className="text-slate-400 text-xs uppercase tracking-wider">Family Portal</p>
        </div>

        {/* Resident card */}
        <div className="rounded-3xl p-6 mb-4" style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-slate-900 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)' }}>
              {name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-white text-xl font-bold">{name}</h1>
              <p className="text-slate-400 text-sm flex items-center gap-1 mt-0.5">
                <Heart className="w-3.5 h-3.5 text-rose-400" /> {resident.home_name}
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {resident.date_of_birth && (
              <div className="flex items-center gap-2 text-slate-300">
                <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span>Date of birth: {format(new Date(resident.date_of_birth), 'd MMMM yyyy')}</span>
              </div>
            )}
            {resident.admission_date && (
              <div className="flex items-center gap-2 text-slate-300">
                <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span>Admitted: {format(new Date(resident.admission_date), 'd MMMM yyyy')}</span>
              </div>
            )}
            {resident.home_address && (
              <div className="flex items-center gap-2 text-slate-300">
                <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span>{resident.home_address}</span>
              </div>
            )}
            {resident.home_phone && (
              <div className="flex items-center gap-2 text-slate-300">
                <Phone className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <a href={`tel:${resident.home_phone}`} className="text-amber-300 hover:text-amber-200">{resident.home_phone}</a>
              </div>
            )}
          </div>
        </div>

        {/* Recent records */}
        <div className="rounded-3xl p-6" style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" /> Recent care notes
          </h2>
          {records.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">No recent records to display</p>
          ) : (
            <div className="space-y-3">
              {records.map((r: any, i: number) => (
                <div key={i} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-amber-300 uppercase tracking-wide">
                      {(r.record_type || '').replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-slate-500">
                      {r.record_date ? format(new Date(r.record_date), 'd MMM yyyy') : ''}
                      {r.shift ? ` · ${r.shift}` : ''}
                    </span>
                  </div>
                  {r.notes && <p className="text-slate-300 text-sm">{r.notes}</p>}
                </div>
              ))}
            </div>
          )}
          <p className="text-slate-600 text-xs text-center mt-4">Showing last 7 days of care notes</p>
        </div>

        <p className="text-slate-600 text-xs text-center mt-6">Powered by CompCare Hub</p>
      </div>
    </div>
  )
}
