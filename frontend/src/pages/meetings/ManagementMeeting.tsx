import React, { useEffect, useState } from 'react'
import { homesApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import MeetingsSection from '../../components/MeetingsSection'

export default function ManagementMeeting() {
  const { user } = useAuth()
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      setSelectedHome(user?.homeId || h[0]?.id || '')
    }).catch(() => {})
  }, [user])

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-8 space-y-4">
      {homes.length > 1 && (
        <select
          className="input w-full sm:w-64"
          value={selectedHome}
          onChange={e => setSelectedHome(e.target.value)}
        >
          {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
      )}
      {selectedHome && (
        <MeetingsSection meetingType="management" homeId={selectedHome} label="Management Meeting" />
      )}
    </div>
  )
}
