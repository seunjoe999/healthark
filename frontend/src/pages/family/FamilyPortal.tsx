import React, { useEffect, useState } from 'react'
import { homesApi, suApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { Spinner } from '../../components/ui'
import { Users2, Copy, CheckCircle, Eye, Link2, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

export default function FamilyPortal() {
  const { user } = useAuth()
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [residents, setResidents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const baseUrl = window.location.origin

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
    suApi.list(selectedHome, { status: 'live' }).then(res => {
      setResidents(res.data.data || [])
    }).finally(() => setLoading(false))
  }, [selectedHome])

  const getFamilyLink = (su: any) => `${baseUrl}/family/${su.qr_token || su.id}`

  const copyLink = async (su: any) => {
    await navigator.clipboard.writeText(getFamilyLink(su))
    setCopiedId(su.id)
    toast.success('Family link copied')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const openFullPreview = (su: any) => {
    window.open(getFamilyLink(su), '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-slate-900 flex items-center gap-2">
            <Users2 className="w-6 h-6 text-purple-600" /> Family Portal
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Share read-only wellbeing updates with families</p>
        </div>
        {homes.length > 1 && (
          <select className="input w-auto text-sm" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
            {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        )}
      </div>

      {/* How it works */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
        <p className="text-sm font-semibold text-blue-900 mb-1 flex items-center gap-2"><Link2 className="w-4 h-4" /> How it works</p>
        <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
          <li>Each resident has a unique private link — share it with their family members</li>
          <li>Families see daily wellbeing notes, activities, and care updates (no sensitive medical data)</li>
          <li>Links are read-only and require no login</li>
          <li>You can reset a link at any time to revoke access</li>
        </ul>
      </div>

      {loading ? <div className="flex justify-center py-12"><Spinner /></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {residents.map((su: any) => {
            const name = `${su.first_name} ${su.last_name}`
            const link = getFamilyLink(su)
            const copied = copiedId === su.id

            return (
              <div key={su.id} className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-slate-700 text-sm"
                    style={{ background: 'linear-gradient(135deg, #e8b130 0%, #d4961a 100%)' }}>
                    {su.first_name?.[0]}{su.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900">{name}</p>
                    <p className="text-xs text-slate-400 capitalize">{su.room_number ? `Room ${su.room_number}` : 'No room assigned'}</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">Live</span>
                </div>

                {/* Link preview */}
                <div className="bg-slate-50 rounded-xl p-3 mb-3 flex items-center gap-2">
                  <Link2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <p className="text-xs text-slate-500 truncate flex-1">{link}</p>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => copyLink(su)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors ${copied ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                    {copied ? <><CheckCircle className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy link</>}
                  </button>
                  <button onClick={() => openFullPreview(su)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors">
                    <Eye className="w-3.5 h-3.5" /> Full preview
                  </button>
                  <a href={link} target="_blank" rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {residents.length === 0 && !loading && (
        <div className="text-center py-12 text-slate-400">
          <Users2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No live residents found</p>
        </div>
      )}

    </div>
  )
}
