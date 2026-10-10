import React, { useEffect, useState, useRef } from 'react'
import QRCode from 'qrcode'
import api from '../../api'
import { Modal, Button, Spinner } from '../../components/ui'
import { QrCode, Download, MapPin, AlertTriangle, Search } from 'lucide-react'
import toast from 'react-hot-toast'


function PostcodeLookupField({ onFound, onLookup }: { onFound: (lat: string, lng: string) => void; onLookup: (pc: string) => void }) {
  const [pc, setPc] = React.useState('')
  return (
    <div className="flex gap-2">
      <input className="input flex-1 text-sm" placeholder="e.g. SW1A 1AA" value={pc}
        onChange={e => setPc(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onLookup(pc)} />
      <button type="button" onClick={() => onLookup(pc)}
        className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5">
        <Search className="w-3.5 h-3.5" /> Look up
      </button>
    </div>
  )
}

export function QRModal({ open, onClose, suId, suName }: { open: boolean; onClose: () => void; suId: string; suName: string }) {
  const [qrData, setQrData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [settingLocation, setSettingLocation] = useState(false)
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [radius, setRadius] = useState('200')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!open || !suId) return
    setLoading(true)
    api.get(`/clockin/generate/${suId}`).then(res => {
      setQrData(res.data.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [open, suId])

  useEffect(() => {
    if (!qrData?.qrUrl || !canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, qrData.qrUrl, {
      width: 200, margin: 1, color: { dark: '#151f35', light: '#ffffff' },
    }).catch(() => {})
  }, [qrData])

  const saveLocation = async () => {
    if (!lat || !lng) { toast.error('Please look up a postcode first'); return }
    try {
      await api.put(`/clockin/resident-location/${suId}`, { latitude: parseFloat(lat), longitude: parseFloat(lng), geofenceRadius: parseInt(radius) })
      toast.success('Location saved — staff must now be within ' + radius + 'm to clock in')
      setSettingLocation(false)
      const res = await api.get(`/clockin/generate/${suId}`)
      setQrData(res.data.data)
    } catch { toast.error('Failed to save location') }
  }

  const lookupPostcode = async (pc: string) => {
    const clean = pc.replace(/\s/g, '').toUpperCase()
    if (!clean) { toast.error('Enter a postcode'); return }
    try {
      const res = await fetch(`https://api.postcodes.io/postcodes/${clean}`)
      const data = await res.json()
      if (data.status !== 200) { toast.error('Postcode not found'); return }
      setLat(String(data.result.latitude))
      setLng(String(data.result.longitude))
      toast.success(`Found ${clean} — click Save to apply`)
    } catch { toast.error('Could not look up postcode') }
  }

  const clockInUrl = qrData?.qrUrl || ''
  const printUrl = qrData?.qrToken ? `/clockin/${qrData.qrToken}/print` : ''

  return (
    <Modal open={open} onClose={onClose} title={`QR Clock-in — ${suName}`} size="md">
      {loading ? <Spinner /> : (
        <div className="text-center">
          {/* QR code */}
          <div className="inline-block p-4 bg-white rounded-2xl border-2 border-slate-100 shadow-lg mb-4">
            <canvas ref={canvasRef} className="block" style={{ width: 200, height: 200 }} />
          </div>

          <p className="text-sm text-slate-600 mb-1 font-medium">Staff scan this QR code to clock in / out</p>
          <p className="text-xs text-slate-400 mb-4 font-mono break-all px-4">{clockInUrl}</p>

          {/* Copy link button */}
          <div className="flex gap-2 justify-center mb-5">
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(clockInUrl); toast.success('Link copied') }}>
              Copy clock-in link
            </Button>
            {printUrl && (
              <a href={printUrl} target="_blank" rel="noreferrer">
                <Button size="sm" variant="outline">🖨️ Print QR poster</Button>
              </a>
            )}
          </div>

          {/* Location status */}
          {qrData?.hasLocation ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 mb-4 flex items-center justify-center gap-2">
              <MapPin className="w-4 h-4" /> GPS location set — staff must be within 200m to clock in
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>No GPS location set. Staff can clock in from anywhere. Set a location to enable the geofence.</span>
            </div>
          )}

          {/* Set location */}
          {settingLocation ? (
            <div className="text-left bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Set location for {suName}</p>
              <p className="text-xs text-slate-500 mb-3">Enter the postcode of where this resident lives. Staff must be within range to clock in.</p>
              <PostcodeLookupField onFound={(la, ln) => { setLat(la); setLng(ln) }} onLookup={lookupPostcode} />
              <div className="mb-3 mt-3">
                <label className="label">Geofence radius (metres)</label>
                <input className="input text-sm" type="number" value={radius} onChange={e => setRadius(e.target.value)} />
              </div>
              {lat && lng && <p className="text-xs text-emerald-600 mb-3 font-medium">Location found — click Save to apply</p>}
              <div className="flex gap-2">
                <Button size="sm" onClick={saveLocation} icon={<MapPin className="w-3.5 h-3.5" />}>Save location</Button>
                <Button size="sm" variant="ghost" onClick={() => setSettingLocation(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="outline" icon={<MapPin className="w-3.5 h-3.5" />} onClick={() => setSettingLocation(true)}>
              {qrData?.hasLocation ? 'Update GPS location' : 'Set GPS location'}
            </Button>
          )}
        </div>
      )}
    </Modal>
  )
}
