import React, { useState, useRef } from 'react'
import api from '../../../api'
import { Button } from '../../../components/ui'
import toast from 'react-hot-toast'

const BODY_ZONES = [
  { id: 'head', label: 'Head', x: 148, y: 18, r: 22 },
  { id: 'neck', label: 'Neck', x: 148, y: 52, r: 10 },
  { id: 'chest_l', label: 'Chest left', x: 120, y: 90, r: 18 },
  { id: 'chest_r', label: 'Chest right', x: 176, y: 90, r: 18 },
  { id: 'abdomen', label: 'Abdomen', x: 148, y: 128, r: 20 },
  { id: 'groin', label: 'Groin', x: 148, y: 162, r: 14 },
  { id: 'upper_arm_l', label: 'Upper arm left', x: 90, y: 88, r: 14 },
  { id: 'upper_arm_r', label: 'Upper arm right', x: 206, y: 88, r: 14 },
  { id: 'lower_arm_l', label: 'Lower arm left', x: 72, y: 125, r: 12 },
  { id: 'lower_arm_r', label: 'Lower arm right', x: 224, y: 125, r: 12 },
  { id: 'hand_l', label: 'Left hand', x: 60, y: 158, r: 10 },
  { id: 'hand_r', label: 'Right hand', x: 236, y: 158, r: 10 },
  { id: 'upper_leg_l', label: 'Upper leg left', x: 122, y: 205, r: 16 },
  { id: 'upper_leg_r', label: 'Upper leg right', x: 174, y: 205, r: 16 },
  { id: 'lower_leg_l', label: 'Lower leg left', x: 120, y: 252, r: 14 },
  { id: 'lower_leg_r', label: 'Lower leg right', x: 176, y: 252, r: 14 },
  { id: 'foot_l', label: 'Left foot', x: 115, y: 290, r: 12 },
  { id: 'foot_r', label: 'Right foot', x: 181, y: 290, r: 12 },
  // Back
  { id: 'upper_back', label: 'Upper back', x: 148, y: 88, r: 20, back: true },
  { id: 'lower_back', label: 'Lower back', x: 148, y: 128, r: 20, back: true },
  { id: 'buttocks', label: 'Buttocks', x: 148, y: 162, r: 18, back: true },
]

const CONCERN_TYPES = [
  { value: 'pressure_sore', label: 'Pressure sore', color: '#ef4444' },
  { value: 'bruise', label: 'Bruise', color: '#8b5cf6' },
  { value: 'wound', label: 'Wound/cut', color: '#f97316' },
  { value: 'rash', label: 'Rash/skin irritation', color: '#f59e0b' },
  { value: 'swelling', label: 'Swelling', color: '#3b82f6' },
  { value: 'other', label: 'Other concern', color: '#6b7280' },
]

export default function BodyMap({ suId, onSaved }: { suId: string; onSaved: () => void }) {
  const [view, setView] = useState<'front' | 'back'>('front')
  const [selectedZone, setSelectedZone] = useState<string | null>(null)
  const [concernType, setConcernType] = useState('pressure_sore')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<Array<{ zone: string; type: string; color: string }>>([])

  const zones = BODY_ZONES.filter(z => view === 'back' ? z.back : !z.back)
  const selectedZoneInfo = BODY_ZONES.find(z => z.id === selectedZone)
  const selectedColor = CONCERN_TYPES.find(c => c.value === concernType)?.color || '#ef4444'

  const save = async () => {
    if (!selectedZone) { toast.error('Click a body area first'); return }
    setSaving(true)
    try {
      await api.post('/daily-records', {
        suId,
        recordType: 'body_map',
        bodyZone: selectedZone,
        bodyZoneLabel: selectedZoneInfo?.label,
        concernType,
        description,
        view,
      })
      setSaved(prev => [...prev, { zone: selectedZone, type: concernType, color: selectedColor }])
      toast.success('Body concern recorded')
      setSelectedZone(null)
      setDescription('')
      onSaved()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      {/* Front/Back toggle */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        <button onClick={() => setView('front')} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${view === 'front' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Front</button>
        <button onClick={() => setView('back')} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${view === 'back' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Back</button>
      </div>

      <div className="flex gap-6 flex-wrap">
        {/* Body SVG */}
        <div className="flex-shrink-0">
          <p className="text-xs text-slate-400 mb-2 text-center">Click to mark a concern</p>
          <svg width="300" height="320" viewBox="0 0 300 320" className="border border-slate-200 rounded-2xl bg-slate-50">
            {/* Simple body outline */}
            <ellipse cx="148" cy="38" rx="22" ry="26" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
            <rect x="110" y="62" width="76" height="100" rx="12" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
            <rect x="78" y="68" width="34" height="80" rx="10" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
            <rect x="186" y="68" width="34" height="80" rx="10" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
            <rect x="114" y="162" width="36" height="90" rx="10" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
            <rect x="148" y="162" width="36" height="90" rx="10" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
            <rect x="107" y="252" width="36" height="50" rx="8" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
            <rect x="155" y="252" width="36" height="50" rx="8" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />

            {/* Saved concerns */}
            {saved.map((s, i) => {
              const zone = BODY_ZONES.find(z => z.id === s.zone)
              if (!zone) return null
              return <circle key={i} cx={zone.x} cy={zone.y} r={8} fill={s.color} opacity={0.7} />
            })}

            {/* Clickable zones */}
            {zones.map(zone => (
              <circle key={zone.id} cx={zone.x} cy={zone.y} r={zone.r}
                fill={selectedZone === zone.id ? selectedColor : 'transparent'}
                stroke={selectedZone === zone.id ? selectedColor : 'transparent'}
                opacity={selectedZone === zone.id ? 0.4 : 0}
                className="cursor-pointer hover:fill-gold-400 hover:opacity-20 transition-all"
                onClick={() => setSelectedZone(zone.id === selectedZone ? null : zone.id)}
              />
            ))}
            {/* Invisible click targets */}
            {zones.map(zone => (
              <circle key={`t${zone.id}`} cx={zone.x} cy={zone.y} r={zone.r}
                fill="transparent" className="cursor-pointer"
                onClick={() => setSelectedZone(zone.id === selectedZone ? null : zone.id)}
              >
                <title>{zone.label}</title>
              </circle>
            ))}
          </svg>
        </div>

        {/* Controls */}
        <div className="flex-1 min-w-48 space-y-4">
          {selectedZone ? (
            <>
              <div className="p-3 rounded-xl border-2 border-gold-400 bg-gold-50 text-sm font-semibold text-gold-800">
                📍 {selectedZoneInfo?.label}
              </div>
              <div>
                <label className="label">Type of concern</label>
                <div className="space-y-2">
                  {CONCERN_TYPES.map(ct => (
                    <label key={ct.value} className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${concernType === ct.value ? 'border-slate-400 bg-slate-50' : 'border-slate-200'}`}>
                      <input type="radio" name="concern" value={ct.value} checked={concernType === ct.value} onChange={() => setConcernType(ct.value)} />
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: ct.color }} />
                      <span className="text-sm font-medium text-slate-700">{ct.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input text-sm" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the concern — size, appearance, any changes..." />
              </div>
              <Button onClick={save} loading={saving} className="w-full">Record concern</Button>
            </>
          ) : (
            <div className="text-center pt-8">
              <p className="text-sm text-slate-400">Click on a body area to record a skin concern or injury</p>
              {saved.length > 0 && (
                <p className="text-xs text-emerald-600 font-semibold mt-3">{saved.length} concern(s) recorded this session</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
