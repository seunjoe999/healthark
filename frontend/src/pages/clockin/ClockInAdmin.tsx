import React, { useEffect, useState } from 'react'
import api, { homesApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { Spinner } from '../../components/ui'
import { MapPin, Plus, Trash2, QrCode, CheckCircle, AlertTriangle, RefreshCw, Building2, LocateFixed, Edit2, X, Save } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ClockInAdmin() {
  const { user } = useAuth()
  const [homes, setHomes] = useState<any[]>([])
  const [selectedHome, setSelectedHome] = useState('')
  const [postcodes, setPostcodes] = useState<any[]>([])
  const [qrData, setQrData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [newPostcode, setNewPostcode] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [adding, setAdding] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [manualLat, setManualLat] = useState('')
  const [manualLng, setManualLng] = useState('')
  const [savingManual, setSavingManual] = useState(false)

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
    loadPostcodes()
    loadQr()
  }, [selectedHome])

  const loadPostcodes = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/clockin/postcodes/${selectedHome}`)
      setPostcodes(res.data.data || [])
    } catch { toast.error('Failed to load postcodes') }
    finally { setLoading(false) }
  }

  const loadQr = async () => {
    try {
      const res = await api.get(`/clockin/home-qr/${selectedHome}`)
      setQrData(res.data.data)
    } catch {}
  }

  const geocodeHomeAddress = async () => {
    if (!selectedHome) return
    setGeocoding(true)
    try {
      const res = await api.post(`/clockin/geocode-home/${selectedHome}`)
      const { latitude, longitude } = res.data.data
      setQrData((prev: any) => ({ ...prev, latitude, longitude, isGeocoded: true }))
      setManualMode(false)
      toast.success('Address geocoded — clock-in geofence is now active')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not auto-geocode. Try entering coordinates manually.')
      setManualMode(true)
    } finally { setGeocoding(false) }
  }

  const saveManualCoords = async () => {
    const lat = parseFloat(manualLat)
    const lng = parseFloat(manualLng)
    if (isNaN(lat) || isNaN(lng)) { toast.error('Enter valid latitude and longitude'); return }
    setSavingManual(true)
    try {
      await api.put(`/clockin/home-location/${selectedHome}`, { latitude: lat, longitude: lng })
      setQrData((prev: any) => ({ ...prev, latitude: lat, longitude: lng, isGeocoded: true }))
      setManualMode(false)
      toast.success('Location saved — geofence is now active')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save location')
    } finally { setSavingManual(false) }
  }

  const addPostcode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPostcode.trim()) return
    setAdding(true)
    try {
      await api.post('/clockin/postcodes', {
        homeId: selectedHome,
        postcode: newPostcode.trim(),
        label: newLabel.trim() || undefined,
      })
      setNewPostcode('')
      setNewLabel('')
      await loadPostcodes()
      toast.success('Extra location added')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to add postcode')
    } finally { setAdding(false) }
  }

  const removePostcode = async (id: string, postcode: string) => {
    if (!window.confirm(`Remove postcode ${postcode}?`)) return
    try {
      await api.delete(`/clockin/postcodes/${id}`)
      setPostcodes(prev => prev.filter(p => p.id !== id))
      toast.success('Postcode removed')
    } catch { toast.error('Failed to remove') }
  }

  const qrImageUrl = qrData?.qrUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrData.qrUrl)}&color=151f35&bgcolor=ffffff`
    : null

  const fullAddress = [qrData?.address1, qrData?.address2, qrData?.address3, qrData?.postcode].filter(Boolean).join(', ')

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-slate-900 flex items-center gap-2">
            <QrCode className="w-6 h-6 text-purple-600" /> Clock-In Management
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Manage QR codes and geofence location for each care home</p>
        </div>
        {homes.length > 1 && (
          <select className="input w-auto text-sm" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
            {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        )}
      </div>

      {/* Home address geofence — primary section */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Care Home Address</h2>
              <p className="text-xs text-slate-400 mt-0.5">Staff must be within 200m of this address to clock in</p>
              {fullAddress ? (
                <p className="text-sm text-slate-700 mt-2 font-medium">{fullAddress}</p>
              ) : (
                <p className="text-sm text-amber-600 mt-2">No address set — update the home details in Settings</p>
              )}
            </div>
          </div>

          <div className="flex-shrink-0 text-right">
            {qrData?.isGeocoded && !manualMode ? (
              <div className="flex flex-col items-end gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full">
                  <CheckCircle className="w-3.5 h-3.5" /> Geofence active
                </span>
                <p className="text-xs text-slate-400">
                  {parseFloat(qrData.latitude).toFixed(5)}, {parseFloat(qrData.longitude).toFixed(5)}
                </p>
                <div className="flex gap-2">
                  <button onClick={geocodeHomeAddress} disabled={geocoding}
                    className="text-xs text-slate-400 hover:text-purple-600 underline transition-colors disabled:opacity-50">
                    {geocoding ? 'Re-geocoding…' : 'Re-geocode'}
                  </button>
                  <span className="text-slate-300">·</span>
                  <button onClick={() => { setManualMode(true); setManualLat(String(qrData.latitude)); setManualLng(String(qrData.longitude)) }}
                    className="text-xs text-slate-400 hover:text-purple-600 underline transition-colors">
                    Edit manually
                  </button>
                </div>
              </div>
            ) : !manualMode ? (
              <div className="flex flex-col items-end gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full">
                  <AlertTriangle className="w-3.5 h-3.5" /> Not set
                </span>
                <button onClick={geocodeHomeAddress} disabled={geocoding || !qrData?.postcode}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-colors"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                  <LocateFixed className="w-4 h-4" />
                  {geocoding ? 'Geocoding…' : 'Auto-detect from address'}
                </button>
                <button onClick={() => setManualMode(true)}
                  className="text-xs text-slate-400 hover:text-purple-600 underline transition-colors">
                  Enter coordinates manually
                </button>
              </div>
            ) : null}
          </div>
          </div>

        {/* Manual coordinate entry */}
        {manualMode && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 mb-3">
              Find your coordinates on <a href="https://maps.google.com" target="_blank" rel="noreferrer" className="text-purple-600 underline">Google Maps</a> — right-click the location and copy the numbers shown.
            </p>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-xs font-medium text-slate-600 block mb-1">Latitude</label>
                <input className="input text-sm" placeholder="e.g. 6.5244" value={manualLat} onChange={e => setManualLat(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-slate-600 block mb-1">Longitude</label>
                <input className="input text-sm" placeholder="e.g. 3.3792" value={manualLng} onChange={e => setManualLng(e.target.value)} />
              </div>
              <button onClick={saveManualCoords} disabled={savingManual}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                <Save className="w-4 h-4" /> {savingManual ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setManualMode(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QR Code panel */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6">
          <h2 className="font-semibold text-slate-900 mb-1 flex items-center gap-2"><QrCode className="w-4 h-4 text-purple-600" /> Staff Clock-In QR Code</h2>
          <p className="text-xs text-slate-400 mb-5">Print or display this QR code at the care home. Staff scan it to clock in/out.</p>

          {qrImageUrl ? (
            <div className="flex flex-col items-center">
              <div className="p-4 bg-white rounded-2xl border-2 border-slate-100 mb-4 shadow-sm">
                <img src={qrImageUrl} alt="Clock-in QR code" className="w-56 h-56" />
              </div>
              <p className="text-xs text-slate-500 text-center mb-4 break-all px-2">{qrData?.qrUrl}</p>
              <button
                onClick={() => { const w = window.open('', '_blank'); if (w && qrImageUrl) { w.document.write(`<html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh"><img src="${qrImageUrl}" style="width:400px;height:400px"/></body></html>`); w.print(); } }}
                className="w-full py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                Print QR
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40">
              <Spinner />
            </div>
          )}
        </div>

        {/* Extra postcodes panel */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2"><MapPin className="w-4 h-4 text-purple-600" /> Extra Locations</h2>
            <button onClick={loadPostcodes} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors" title="Refresh">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-slate-400 mb-4">Optional — add extra postcodes if the home has multiple entrances or buildings. Staff within 200m of any of these can also clock in.</p>

          {/* Add form */}
          <form onSubmit={addPostcode} className="flex gap-2 mb-4">
            <div className="flex-1 space-y-2">
              <input
                className="input text-sm"
                placeholder="Postcode (e.g. SW1A 1AA)"
                value={newPostcode}
                onChange={e => setNewPostcode(e.target.value.toUpperCase())}
              />
              <input
                className="input text-sm"
                placeholder="Label (optional, e.g. Back entrance)"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={adding || !newPostcode.trim()}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white flex-shrink-0 self-start disabled:opacity-50 transition-colors"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
              {adding ? '...' : <Plus className="w-4 h-4" />}
            </button>
          </form>

          {/* Postcode list */}
          {loading ? <Spinner /> : postcodes.length === 0 ? (
            <div className="text-center py-6 text-slate-400">
              <MapPin className="w-7 h-7 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No extra locations added</p>
            </div>
          ) : (
            <div className="space-y-2">
              {postcodes.map((pc: any) => (
                <div key={pc.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{pc.postcode}</p>
                    {pc.label && <p className="text-xs text-slate-500">{pc.label}</p>}
                    {pc.latitude && pc.longitude ? (
                      <p className="text-xs text-emerald-600 flex items-center gap-1 mt-0.5">
                        <CheckCircle className="w-3 h-3" /> Geocoded
                      </p>
                    ) : (
                      <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="w-3 h-3" /> Not geocoded
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => removePostcode(pc.id, pc.postcode)}
                    className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info box */}
      <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">How it works</p>
        <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
          <li>Click <strong>"Set geofence from address"</strong> above to activate location-based clock-in</li>
          <li>Staff scan the QR code or use the clock-in widget on their dashboard</li>
          <li>Their GPS location is checked — they must be within 200m of the care home address</li>
          <li>Add extra locations below if the home has multiple entrances or car parks</li>
        </ul>
      </div>
    </div>
  )
}
