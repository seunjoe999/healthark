import React, { useEffect, useState } from 'react'
import api from '../../api'
import { suApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Spinner, Button } from '../../components/ui'
import toast from 'react-hot-toast'
import { Heart, Save, Printer, BookOpen } from 'lucide-react'
import { openLetterheadPrint, buildLetterheadPage, fmtDate, esc, type PrintSection } from '../../utils/letterheadPrint'

const COMFORT_MEASURES = ['Mouth care every 2 hours', 'Eye care', 'Pressure area care', 'Repositioning (comfort)', 'Pain assessment every 4h', 'Nutrition/hydration as tolerated', 'Syringe driver in place']
const SYMPTOMS = ['Pain', 'Breathlessness', 'Agitation/restlessness', 'Nausea', 'Secretions', 'Constipation', 'Urinary retention']
const SPIRITUAL = ['Christian', 'Muslim', 'Hindu', 'Sikh', 'Jewish', 'Buddhist', 'No religion', 'Unknown']
const PREFERRED_PLACE = ['Care home (current)', 'Hospital', 'Home (family)', 'Hospice']

export default function EndOfLife() {
  const { user } = useAuth()
  const [residents, setResidents] = useState<any[]>([])
  const [selectedSu, setSelectedSu] = useState('')
  const [plan, setPlan] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)

  // Form state
  const [dnarStatus, setDnarStatus] = useState<'Yes' | 'No' | 'Unknown'>('Unknown')
  const [respectForm, setRespectForm] = useState(false)
  const [preferredPlace, setPreferredPlace] = useState('')
  const [comfortMeasures, setComfortMeasures] = useState<string[]>([])
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [spiritualNeeds, setSpiritualNeeds] = useState('')
  const [culturalNeeds, setCulturalNeeds] = useState('')
  const [familyContact, setFamilyContact] = useState('')
  const [familyInformed, setFamilyInformed] = useState(false)
  const [gp, setGp] = useState('')
  const [syringeDriver, setSyringeDriver] = useState(false)
  const [lastDaysCommenced, setLastDaysCommenced] = useState(false)
  const [lastDaysDate, setLastDaysDate] = useState('')
  const [additionalWishes, setAdditionalWishes] = useState('')
  const [notes, setNotes] = useState('')

  // Comfort rounding log
  const [roundingNotes, setRoundingNotes] = useState('')
  const [roundingSymptoms, setRoundingSymptoms] = useState<string[]>([])
  const [savingRound, setSavingRound] = useState(false)
  const [roundingHistory, setRoundingHistory] = useState<any[]>([])

  useEffect(() => {
    if (!user?.homeId) return
    suApi.list(user.homeId, { status: 'live' }).then(r => setResidents(r.data.data || [])).catch(() => {})
  }, [user])

  useEffect(() => {
    if (!selectedSu) return
    setLoading(true)
    api.get(`/clinical/eol/${selectedSu}`)
      .then(r => {
        setPlan(r.data.data?.plan || null)
        setRoundingHistory(r.data.data?.rounding || [])
        if (r.data.data?.plan) populateForm(r.data.data.plan)
      })
      .catch(() => { setPlan(null); setRoundingHistory([]) })
      .finally(() => setLoading(false))
  }, [selectedSu])

  const populateForm = (p: any) => {
    setDnarStatus(p.dnar_status || 'Unknown')
    setRespectForm(p.respect_form || false)
    setPreferredPlace(p.preferred_place || '')
    setComfortMeasures(p.comfort_measures || [])
    setSymptoms(p.symptoms_to_manage || [])
    setSpiritualNeeds(p.spiritual_needs || '')
    setCulturalNeeds(p.cultural_needs || '')
    setFamilyContact(p.family_contact || '')
    setFamilyInformed(p.family_informed || false)
    setGp(p.gp || '')
    setSyringeDriver(p.syringe_driver || false)
    setLastDaysCommenced(p.last_days_commenced || false)
    setLastDaysDate(p.last_days_date || '')
    setAdditionalWishes(p.additional_wishes || '')
    setNotes(p.notes || '')
  }

  const toggle = (val: string, list: string[], setList: (v: string[]) => void) =>
    setList(list.includes(val) ? list.filter(x => x !== val) : [...list, val])

  const save = async () => {
    if (!selectedSu) return
    setSaving(true)
    try {
      await api.post('/clinical/eol', {
        suId: selectedSu, homeId: user?.homeId,
        dnarStatus, respectForm, preferredPlace, comfortMeasures,
        symptomsToManage: symptoms, spiritualNeeds, culturalNeeds,
        familyContact, familyInformed, gp, syringeDriver,
        lastDaysCommenced, lastDaysDate, additionalWishes, notes,
        updatedBy: user?.id,
      })
      toast.success('End of Life Care Plan saved')
      const r = await api.get(`/clinical/eol/${selectedSu}`)
      setPlan(r.data.data?.plan || null)
      setEditing(false)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to save')
    } finally { setSaving(false) }
  }

  const saveRounding = async () => {
    if (!selectedSu) return
    setSavingRound(true)
    try {
      await api.post('/clinical/eol-rounding', {
        suId: selectedSu, homeId: user?.homeId,
        symptoms: roundingSymptoms, notes: roundingNotes, staffId: user?.id,
      })
      toast.success('Comfort rounding recorded')
      const r = await api.get(`/clinical/eol/${selectedSu}`)
      setRoundingHistory(r.data.data?.rounding || [])
      setRoundingNotes(''); setRoundingSymptoms([])
    } catch (e: any) {
      toast.error('Failed to save')
    } finally { setSavingRound(false) }
  }

  const handlePrint = () => {
    const resident = residents.find(r => r.id === selectedSu)
    const residentName = resident ? `${resident.first_name} ${resident.last_name}` : 'Resident'
    const sections: PrintSection[] = []

    if (plan) {
      sections.push({
        title: 'End of Life Care Plan',
        inner: `
          <div class="risk-box${plan.dnar_status === 'Yes' ? ' high' : ''}">
            <span class="rb-label">DNAR Status</span>
            <span class="rb-value">${esc(plan.dnar_status)}</span>
          </div>
          <table class="fields">
            <tr><th>ReSPECT Form</th><td>${plan.respect_form ? 'In place' : 'Not in place'}</td></tr>
            <tr><th>Preferred Place of Death</th><td>${esc(plan.preferred_place)}</td></tr>
            <tr><th>Family Contact</th><td>${esc(plan.family_contact)}</td></tr>
            <tr><th>Family Informed</th><td>${plan.family_informed ? 'Yes' : 'No'}</td></tr>
            <tr><th>GP</th><td>${esc(plan.gp)}</td></tr>
            <tr><th>Comfort Measures</th><td>${esc((plan.comfort_measures || []).join(', '))}</td></tr>
            <tr><th>Symptoms to Manage</th><td>${esc((plan.symptoms_to_manage || []).join(', '))}</td></tr>
            <tr><th>Spiritual Needs</th><td>${esc(plan.spiritual_needs)}</td></tr>
            <tr><th>Cultural Needs</th><td>${esc(plan.cultural_needs)}</td></tr>
            <tr><th>Syringe Driver</th><td>${plan.syringe_driver ? 'In place' : 'Not in place'}</td></tr>
            <tr><th>Last Days of Life Care</th><td>${plan.last_days_commenced ? `Commenced${plan.last_days_date ? ' ' + fmtDate(plan.last_days_date) : ''}` : 'Not commenced'}</td></tr>
            <tr><th>Plan Updated</th><td>${plan.updated_at ? fmtDate(plan.updated_at) : '—'}</td></tr>
          </table>
          ${plan.additional_wishes ? `<h3 class="sub">Resident's Wishes / Advance Directives</h3><p class="body-text">${esc(plan.additional_wishes)}</p>` : ''}
          ${plan.notes ? `<h3 class="sub">Clinical Notes</h3><p class="body-text">${esc(plan.notes)}</p>` : ''}
        `,
      })
    }

    if (roundingHistory.length) {
      const rows = roundingHistory.map((h: any) => `
        <tr><th>${h.recorded_at ? fmtDate(h.recorded_at) : '—'}${h.staff_name ? `<br/><span style="font-weight:400;font-size:8.5px">${esc(h.staff_name)}</span>` : ''}</th>
        <td>${(h.symptoms || []).length ? `<strong>${esc((h.symptoms || []).join(', '))}</strong><br/>` : ''}${esc(h.notes)}</td></tr>
      `).join('')
      sections.push({ title: 'Comfort Rounding Log', inner: `<table class="fields">${rows}</table>` })
    }

    if (!sections.length) sections.push({ title: 'End of Life Care Plan', inner: `<p class="body-text muted">No end of life care plan recorded yet for this resident.</p>` })

    const body = buildLetterheadPage({
      docTitle: 'End of Life Care Plan', docSubtitle: 'ReSPECT / DNAR / Comfort care record',
      docRefPrefix: 'EOL', docRefId: selectedSu || '—', residentName, sections,
    })
    openLetterheadPrint(`${residentName} — End of Life Care Plan`, body)
  }

  const StatusBadge = ({ val }: { val: string }) => {
    const c = val === 'Yes' ? '#dc2626' : val === 'No' ? '#16a34a' : '#6b7280'
    return <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: c }}>{val}</span>
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-violet-600" />
            End of Life Care Plan
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">ReSPECT / DNAR / Comfort care plan and rounding record</p>
        </div>
        <button onClick={handlePrint} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-2 bg-white">
          <Printer className="w-4 h-4" /> Print
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5">
        <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">Service User</label>
        <select className="input w-full max-w-xs" value={selectedSu} onChange={e => { setSelectedSu(e.target.value); setEditing(false) }}>
          <option value="">— Select resident —</option>
          {residents.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
        </select>
      </div>

      {loading && <div className="flex justify-center py-8"><Spinner /></div>}

      {selectedSu && !loading && (
        <>
          {plan && !editing ? (
            // Summary view
            <div className="bg-white rounded-2xl border border-violet-200 overflow-hidden mb-5">
              <div className="px-5 py-4 border-b border-violet-100 bg-violet-50 flex items-center justify-between">
                <h2 className="font-bold text-violet-900">Current End of Life Care Plan</h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-violet-500">Updated {plan.updated_at ? format(new Date(plan.updated_at), 'd MMM yyyy') : ''}</span>
                  <button onClick={() => setEditing(true)} className="text-xs font-bold text-violet-600 border border-violet-300 rounded-lg px-3 py-1.5">Edit Plan</button>
                </div>
              </div>
              <div className="p-5 grid grid-cols-2 gap-5">
                <div className="space-y-3">
                  <div><p className="text-[10px] text-slate-400 uppercase tracking-wide">DNAR Status</p><StatusBadge val={plan.dnar_status} /></div>
                  <div><p className="text-[10px] text-slate-400 uppercase tracking-wide">ReSPECT Form</p><p className="text-sm font-semibold">{plan.respect_form ? 'In place' : 'Not in place'}</p></div>
                  <div><p className="text-[10px] text-slate-400 uppercase tracking-wide">Preferred Place</p><p className="text-sm font-semibold">{plan.preferred_place || '—'}</p></div>
                  <div><p className="text-[10px] text-slate-400 uppercase tracking-wide">Family Contact</p><p className="text-sm">{plan.family_contact || '—'}</p></div>
                  <div><p className="text-[10px] text-slate-400 uppercase tracking-wide">GP</p><p className="text-sm">{plan.gp || '—'}</p></div>
                </div>
                <div className="space-y-3">
                  <div><p className="text-[10px] text-slate-400 uppercase tracking-wide">Last Days Care</p><p className="text-sm font-semibold">{plan.last_days_commenced ? `Commenced ${plan.last_days_date ? format(new Date(plan.last_days_date), 'd MMM yyyy') : ''}` : 'Not commenced'}</p></div>
                  <div><p className="text-[10px] text-slate-400 uppercase tracking-wide">Spiritual Needs</p><p className="text-sm">{plan.spiritual_needs || '—'}</p></div>
                  <div><p className="text-[10px] text-slate-400 uppercase tracking-wide">Symptoms to Manage</p><p className="text-sm">{(plan.symptoms_to_manage || []).join(', ') || '—'}</p></div>
                  {plan.additional_wishes && <div><p className="text-[10px] text-slate-400 uppercase tracking-wide">Wishes</p><p className="text-sm italic">{plan.additional_wishes}</p></div>}
                </div>
              </div>
            </div>
          ) : (
            // Edit form
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-5">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">{plan ? 'Edit' : 'Create'} End of Life Care Plan</h2>
              </div>
              <div className="px-5 py-5 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">DNAR Status</label>
                    <div className="space-y-1">
                      {(['Yes', 'No', 'Unknown'] as const).map(v => (
                        <label key={v} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer ${dnarStatus === v ? 'border-violet-400 bg-violet-50' : 'border-slate-100'}`}>
                          <input type="radio" checked={dnarStatus === v} onChange={() => setDnarStatus(v)} className="accent-violet-600" />
                          <span className="text-sm">{v}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">ReSPECT Form</label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={respectForm} onChange={e => setRespectForm(e.target.checked)} className="accent-violet-600" />
                        <span className="text-sm">ReSPECT form in place</span>
                      </label>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">Preferred Place of Death</label>
                      <select className="input w-full" value={preferredPlace} onChange={e => setPreferredPlace(e.target.value)}>
                        <option value="">Select...</option>
                        {PREFERRED_PLACE.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">Comfort Measures</label>
                  <div className="flex flex-wrap gap-1.5">
                    {COMFORT_MEASURES.map(c => (
                      <button key={c} onClick={() => toggle(c, comfortMeasures, setComfortMeasures)}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                          comfortMeasures.includes(c) ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-600 border-slate-200'
                        }`}>{c}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">Symptoms to Manage</label>
                  <div className="flex flex-wrap gap-1.5">
                    {SYMPTOMS.map(s => (
                      <button key={s} onClick={() => toggle(s, symptoms, setSymptoms)}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                          symptoms.includes(s) ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-600 border-slate-200'
                        }`}>{s}</button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Spiritual needs / faith</label>
                    <select className="input w-full" value={spiritualNeeds} onChange={e => setSpiritualNeeds(e.target.value)}>
                      <option value="">Select...</option>
                      {SPIRITUAL.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Cultural needs</label>
                    <input type="text" className="input w-full" placeholder="e.g. no pork products, specific rites" value={culturalNeeds} onChange={e => setCulturalNeeds(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Family contact name/number</label>
                    <input type="text" className="input w-full" placeholder="Name — 07xxx xxxxxx" value={familyContact} onChange={e => setFamilyContact(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">GP name</label>
                    <input type="text" className="input w-full" placeholder="Dr..." value={gp} onChange={e => setGp(e.target.value)} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" checked={familyInformed} onChange={e => setFamilyInformed(e.target.checked)} className="accent-violet-600" />
                    Family informed of EOL status
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" checked={syringeDriver} onChange={e => setSyringeDriver(e.target.checked)} className="accent-violet-600" />
                    Syringe driver in place
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-violet-700">
                    <input type="checkbox" checked={lastDaysCommenced} onChange={e => setLastDaysCommenced(e.target.checked)} className="accent-violet-600" />
                    Last days of life care commenced
                  </label>
                </div>
                {lastDaysCommenced && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Date commenced</label>
                    <input type="date" className="input w-44" value={lastDaysDate} onChange={e => setLastDaysDate(e.target.value)} />
                  </div>
                )}

                <textarea className="input w-full" rows={2} placeholder="Resident's wishes, advance directives, other important notes..." value={additionalWishes} onChange={e => setAdditionalWishes(e.target.value)} />
                <textarea className="input w-full" rows={2} placeholder="Clinical notes..." value={notes} onChange={e => setNotes(e.target.value)} />

                <div className="flex gap-3 justify-end">
                  {plan && <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl">Cancel</button>}
                  <Button icon={<Save className="w-4 h-4" />} onClick={save} loading={saving}>Save Care Plan</Button>
                </div>
              </div>
            </div>
          )}

          {/* Comfort Rounding */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-5">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Comfort Rounding</h2>
              <p className="text-xs text-slate-400 mt-0.5">4-hourly comfort checks — document symptoms and interventions</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 block">Symptoms Present</label>
                <div className="flex flex-wrap gap-1.5">
                  {SYMPTOMS.map(s => (
                    <button key={s} onClick={() => toggle(s, roundingSymptoms, setRoundingSymptoms)}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                        roundingSymptoms.includes(s) ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-600 border-slate-200'
                      }`}>{s}</button>
                  ))}
                </div>
              </div>
              <textarea className="input w-full" rows={2} placeholder="Comfort check notes — position, pain, medication given, family present..." value={roundingNotes} onChange={e => setRoundingNotes(e.target.value)} />
              <div className="flex justify-end">
                <Button icon={<Heart className="w-4 h-4" />} onClick={saveRounding} loading={savingRound}>Record Rounding</Button>
              </div>
            </div>
            {roundingHistory.length > 0 && (
              <div className="border-t border-slate-100 divide-y divide-slate-50">
                {roundingHistory.slice(0, 10).map((h: any) => (
                  <div key={h.id} className="px-5 py-3 flex gap-3">
                    <div className="text-xs text-slate-400 w-28 flex-shrink-0 pt-0.5">{h.recorded_at ? format(new Date(h.recorded_at), 'd MMM, HH:mm') : ''}</div>
                    <div>
                      {(h.symptoms || []).length > 0 && <p className="text-xs text-violet-700 font-semibold mb-0.5">{h.symptoms.join(', ')}</p>}
                      <p className="text-xs text-slate-600">{h.notes || '—'}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{h.staff_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
