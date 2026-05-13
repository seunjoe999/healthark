import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

export default function PrintQR() {
  const { token } = useParams<{ token: string }>()
  const [suInfo, setSuInfo] = useState<any>(null)
  const clockInUrl = `${window.location.origin}/clockin/${token}`

  useEffect(() => {
    if (!token) return
    fetch(`/api/clockin/qr/${token}`)
      .then(r => r.json())
      .then(d => { if (d.success) setSuInfo(d.data) })
  }, [token])

  useEffect(() => {
    if (suInfo) setTimeout(() => window.print(), 500)
  }, [suInfo])

  if (!suInfo) return <div className="flex items-center justify-center h-screen"><p className="text-slate-500">Loading...</p></div>

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="max-w-sm w-full text-center border-2 border-gray-800 rounded-2xl p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Clock In / Out</h1>
          <p className="text-slate-500 text-sm">CompCare Hub</p>
        </div>

        <div className="bg-slate-50 rounded-xl p-6 mb-6 border border-slate-200">
          <div className="text-5xl mb-3">👤</div>
          <h2 className="text-xl font-bold text-slate-900">{suInfo.name}</h2>
          <p className="text-slate-500 text-sm mt-1">{suInfo.homeName}</p>
          {suInfo.address && <p className="text-slate-400 text-xs mt-1">{suInfo.address}</p>}
        </div>

        {/* QR code placeholder — in production use qrcode.react */}
        <div className="bg-gray-900 rounded-2xl p-6 mb-6 flex items-center justify-center mx-auto w-48 h-48">
          <div className="text-center">
            <div className="text-white text-xs mb-2 font-mono break-all opacity-70">{token?.substring(0, 8)}...</div>
            <div className="grid grid-cols-8 gap-0.5">
              {Array.from({ length: 64 }).map((_, i) => (
                <div key={i} className={`w-2 h-2 ${Math.random() > 0.4 ? 'bg-white' : 'bg-transparent'}`} />
              ))}
            </div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-xl p-4 mb-6 text-left border border-blue-200">
          <p className="text-xs font-bold text-blue-800 mb-1">Instructions for staff:</p>
          <ol className="text-xs text-blue-700 space-y-1">
            <li>1. Scan this QR code with your phone camera</li>
            <li>2. Sign in to CompCare Hub if prompted</li>
            <li>3. Select Clock In or Clock Out</li>
            <li>4. Allow location access when asked</li>
            <li>5. You must be within 200m of this location</li>
          </ol>
        </div>

        <div className="text-xs text-slate-400 border-t border-slate-100 pt-4">
          <p className="font-mono break-all">{clockInUrl}</p>
          <p className="mt-2">Or visit the URL above on your phone</p>
        </div>

        <style>{`@media print { body { margin: 0; } .no-print { display: none; } }`}</style>
      </div>

      <div className="no-print fixed bottom-4 left-1/2 -translate-x-1/2">
        <button onClick={() => window.print()} className="bg-gray-900 text-white px-6 py-2.5 rounded-xl text-sm font-medium">
          🖨️ Print this page
        </button>
      </div>
    </div>
  )
}
