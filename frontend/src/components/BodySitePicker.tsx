import React, { useState } from 'react'

// Shared zone list with BodyMap.tsx (daily records skin/pressure concerns) —
// kept as its own small copy here since this picker has a different job
// (picking one application site for a cream/patch dose, not logging a
// concern with type/description to daily_records).
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
  { id: 'upper_back', label: 'Upper back', x: 148, y: 88, r: 20, back: true },
  { id: 'lower_back', label: 'Lower back', x: 148, y: 128, r: 20, back: true },
  { id: 'buttocks', label: 'Buttocks', x: 148, y: 162, r: 18, back: true },
]

export default function BodySitePicker({ value, onChange }: { value: string; onChange: (zoneId: string, zoneLabel: string) => void }) {
  const [view, setView] = useState<'front' | 'back'>('front')
  const zones = BODY_ZONES.filter(z => view === 'back' ? z.back : !z.back)
  const selectedInfo = BODY_ZONES.find(z => z.id === value)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="label mb-0">Application site *</label>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
          <button type="button" onClick={() => setView('front')} className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${view === 'front' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Front</button>
          <button type="button" onClick={() => setView('back')} className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${view === 'back' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Back</button>
        </div>
      </div>
      {selectedInfo && (
        <div className="p-2 rounded-lg border-2 border-gold-400 bg-gold-50 text-xs font-semibold text-gold-800 inline-block">
          📍 {selectedInfo.label}
        </div>
      )}
      <svg width="220" height="235" viewBox="0 0 300 320" className="border border-slate-200 rounded-2xl bg-slate-50 mx-auto block">
        <ellipse cx="148" cy="38" rx="22" ry="26" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
        <rect x="110" y="62" width="76" height="100" rx="12" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
        <rect x="78" y="68" width="34" height="80" rx="10" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
        <rect x="186" y="68" width="34" height="80" rx="10" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
        <rect x="114" y="162" width="36" height="90" rx="10" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
        <rect x="148" y="162" width="36" height="90" rx="10" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
        <rect x="107" y="252" width="36" height="50" rx="8" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
        <rect x="155" y="252" width="36" height="50" rx="8" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
        {zones.map(zone => (
          <circle key={zone.id} cx={zone.x} cy={zone.y} r={zone.r}
            fill={value === zone.id ? '#e8b130' : 'transparent'}
            opacity={value === zone.id ? 0.5 : 0}
            className="cursor-pointer hover:fill-amber-300 hover:opacity-25 transition-all"
            onClick={() => onChange(zone.id, zone.label)} />
        ))}
        {zones.map(zone => (
          <circle key={`t${zone.id}`} cx={zone.x} cy={zone.y} r={zone.r} fill="transparent" className="cursor-pointer"
            onClick={() => onChange(zone.id, zone.label)}>
            <title>{zone.label}</title>
          </circle>
        ))}
      </svg>
    </div>
  )
}
