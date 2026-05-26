import React, { useEffect, useState } from 'react'
import api, { homesApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { Spinner, Button, Modal, Input } from '../../components/ui'
import { MapPin, QrCode, CheckCircle, AlertTriangle, Save, Users } from 'lucide-react'
import toast from 'react-hot-toast'

interface Resident {
  id: string
  first_name: string
  last_name: string
  room_number: string | null
  qr_token: string
  qrUrl: string
  latitude: number | null
  longitude: number | null
  geofence_radius: number
  hasLocation: boolean
}

export default function ClockInAdmin() {
  const { user } = useAuth()
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [residents, setResidents] = useState<Resident[]>([])
  const [loading, setLoading] = useState(false)
  const [locationModal, setLocationModal] = useState<Resident | null>(null)
  const [qrModal, setQrModal] = useState<Resident | null>(null)
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [savingLocation, setSavingLocation] = useState(false)

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || []
      setHomes(h)
      const homeId = user?.homeId || h[0]?.id || ''
      setSelectedHome(homeId)
    })
  }, [user])

  useEffect(() => {
    if (!selectedHome) return
    loadResidents()
  }, [selectedHome])

  const loadResidents = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/clockin/residents/${selectedHome}`)
      setResidents(res.data.data || [])
    } catch {
      toast.error('Failed to load residents')
    } finally {
      setLoading(false)
    }
  }

  const openLocationModal = (r: Resident) => {
    setLocationModal(r)
    setLat(r.latitude ? String(r.latitude) : '')
    setLng(r.longitude ? String(r.longitude) : '')
  }

  const saveLocation = async () => {
    if (!locationModal) return
    const latNum = parseFloat(lat)
    const lngNum = parseFloat(lng)
    if (isNaN(latNum) || isNaN(lngNum)) {
      toast.error('Enter valid latitude and longitude')
      return
    }
    setSavingLocation(true)
    try {
      await api.put(`/clockin/resident-location/${locationModal.id}`, { latitude: latNum, longitude: lngNum })
      toast.success(`Location saved for ${locationModal.first_name}`)
      setLocationModal(null)
      loadResidents()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save location')
    } finally {
      setSavingLocation(false)
    }
  }

  const printQr = (r: Resident) => {
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(r.qrUrl)}&color=151f35&bgcolor=ffffff`
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(`<html><body style="margin:0;text-align:center;font-family:sans-serif;padding:20px">
        <h2 style="margin-bottom:4px">${r.first_name} ${r.last_name}</h2>
        ${r.room_number ? `<p style="margin:0 0 12px;color:#555;font-size:14px">Room / Apartment: ${r.room_number}</p>` : '<p style="margin:0 0 12px;color:#555;font-size:14px">Clock-In QR Code</p>'}
        <img src="${qrImageUrl}" style="width:280px;height:280px;display:block;margin:0 auto 12px"/>
        <p style="font-size:11px;color:#888">Scan to clock in / clock out</p>
      </body></html>`)
      w.print()
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-slate-900 flex items-center gap-2">
            <QrCode className="w-6 h-6 text-purple-600" /> Clock-In Management
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Manage QR codes and geofence locations per resident apartment</p>
        </div>
        {homes.length > 1 && (
          <select className="input w-auto text-sm" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
            {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        )}
      </div>

      {/* Info box */}
      <div className="mb-6 bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">How it works</p>
        <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
          <li>Each resident apartment has its own QR code and geofence location</li>
          <li>Set the apartment location — staff must be within 200m to clock in</li>
          <li>Print and display each resident's QR code inside their apartment</li>
          <li>Staff scan the QR code to clock in/out for that resident</li>
        </ul>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : residents.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-slate-600">No live residents found</p>
          <p className="text-sm mt-1">Add residents in Service User profiles first</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Resident', 'Room / Apartment', 'Geofence', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {residents.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{r.first_name} {r.last_name}</p>
                  </td>
                  <td className="px-4 py-3">
                    {r.room_number
                      ? <span className="font-medium text-slate-700">Room {r.room_number}</span>
                      : <span className="text-slate-300 italic text-xs">Not assigned</span>}
                  </td>
                  <td className="px-4 py-3">
                    {r.hasLocation ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                        <AlertTriangle className="w-3 h-3" /> Not set
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openLocationModal(r)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                        <MapPin className="w-3 h-3" /> Set Location
                      </button>
                      <button onClick={() => setQrModal(r)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors">
                        <QrCode className="w-3 h-3" /> QR Code
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Location Modal */}
      {locationModal && (
        <Modal open={!!locationModal} onClose={() => setLocationModal(null)}
          title={`Set Location — ${locationModal.first_name} ${locationModal.last_name}`}>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Find the apartment coordinates on{' '}
              <a href="https://maps.google.com" target="_blank" rel="noreferrer" className="text-purple-600 underline">
                Google Maps
              </a>{' '}
              — right-click the location and copy the numbers shown.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Latitude" placeholder="e.g. 6.5244" value={lat} onChange={e => setLat(e.target.value)} />
              <Input label="Longitude" placeholder="e.g. 3.3792" value={lng} onChange={e => setLng(e.target.value)} />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setLocationModal(null)}>Cancel</Button>
              <Button loading={savingLocation} onClick={saveLocation} icon={<Save className="w-4 h-4" />}>
                Save Location
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* QR Modal */}
      {qrModal && (
        <Modal open={!!qrModal} onClose={() => setQrModal(null)}
          title={`QR Code — ${qrModal.first_name} ${qrModal.last_name}`}>
          <div className="flex flex-col items-center gap-4">
            {qrModal.room_number && (
              <p className="text-sm text-slate-500 font-medium">Room / Apartment: {qrModal.room_number}</p>
            )}
            <div className="p-4 bg-white rounded-2xl border-2 border-slate-100 shadow-sm">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrModal.qrUrl)}&color=151f35&bgcolor=ffffff`}
                alt="Clock-in QR code"
                className="w-48 h-48"
              />
            </div>
            <p className="text-xs text-slate-400 text-center px-4 break-all">{qrModal.qrUrl}</p>
            {!qrModal.hasLocation && (
              <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-100 px-3 py-2 rounded-lg text-xs w-full">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                No geofence set — set the apartment location so staff location is verified on clock-in
              </div>
            )}
            <Button onClick={() => printQr(qrModal)} className="w-full">Print QR Code</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
