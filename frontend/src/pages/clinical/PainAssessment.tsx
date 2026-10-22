import React, { useEffect, useMemo, useState } from 'react'
import api, { suApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { format } from 'date-fns'
import { Spinner, Button, Modal } from '../../components/ui'
import { UniformFilterBar } from '../../components/ui/FilterBar'
import toast from 'react-hot-toast'
import { Frown, Save, Printer, Info, Plus, Eye, Edit, ChevronUp, CheckCircle } from 'lucide-react'
import { openLetterheadPrint, buildLetterheadPage, fmtDate, esc, nl, type PrintSection } from '../../utils/letterheadPrint'
import { AbbeyAssessmentDetailModal, getAbbeyInterpretation } from './AbbeyPainScale'

const PAIN_INTENSITY_OPTIONS = [
  '0-1 No Hurt, Feels Good, No Pain',
  '1-2 Hurts a little bit',
  '3-4 Hurts a little more noticeable',
  '5-6 Hurts even more moderate',
  '7-8 Hurts A Whole Lot Severe Pain',
  '9-10 hurts worst pain unimaginable',
]

const PAIN_DESCRIPTION_OPTIONS = [
  'Sharp', 'Dull', 'Aching', 'Throbbing', 'Burning', 'Stabbing',
  'Shooting', 'Cramping', 'Gnawing', 'Pressure like', 'Tight', 'None',
]

const DAILY_LIFE_IMPACT_OPTIONS = [
  'Affects sleep', 'Limits mobility', 'Reduces appetite', 'Affects mood or behaviour',
  'Interferes with personal care', 'Impacts communication', 'None',
]

const YES_NO_NA = ['Yes', 'No', 'N/A']
const YES_NO = ['Yes', 'No']

const PAIN_PATTERN_OPTIONS = ['The Pain is Constant', 'The Pain Comes and Goes', 'Not Applicable']
const INTERVENTION_TYPE_OPTIONS = ['Medication', 'Repositioning', 'Distraction', 'None', 'Other']
const OUTCOME_OPTIONS = [
  'Improved - Continue to Monitor',
  'No change - Escalate to 111 or the GP',
  'Worsened - Escalate to 111 or the GP',
  'Not Applicable',
]

const PHARMA_BANDS = [
  { band: 'No Pain (0)', guidance: 'Continue to monitor - No analgesia required unless otherwise prescribed.' },
  { band: 'Mild Pain (1–3)', guidance: 'Encourage non-pharmacological measures to help relieve symptoms where appropriate Or Give Pain relief as prescribed if required. Continue to closely monitor pain, sedation and nausea.' },
  { band: 'Moderate Pain (4–6)', guidance: 'Give Pain relief as prescribed. Continue to closely monitor pain, sedation and nausea.' },
  { band: 'Severe Pain (7–10)', guidance: 'Give Pain relief as prescribed. Continue to closely monitor pain, sedation and nausea.' },
]

interface FormState {
  painIntensity: string
  painDescription: string
  durationTriggers: string
  dailyLifeImpact: string[]
  painReliefGiven: string
  lastAdminTimeChecked: string
  painPattern: string
  worseBetter: string
  interventionType: string
  outcome: string
  furtherActionRequired: string
  furtherActionPlan: string
  notes: string
}

const emptyForm: FormState = {
  painIntensity: '',
  painDescription: '',
  durationTriggers: '',
  dailyLifeImpact: [],
  painReliefGiven: '',
  lastAdminTimeChecked: '',
  painPattern: '',
  worseBetter: '',
  interventionType: '',
  outcome: '',
  furtherActionRequired: '',
  furtherActionPlan: '',
  notes: '',
}

function parseImpactArray(val: any): string[] {
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      return Array.isArray(parsed) ? parsed : (val ? [val] : [])
    } catch {
      return val ? [val] : []
    }
  }
  return []
}

function rowToFormState(r: any): FormState {
  return {
    painIntensity: r.pain_intensity || '',
    painDescription: r.pain_description || '',
    durationTriggers: r.duration_triggers || '',
    dailyLifeImpact: parseImpactArray(r.daily_life_impact),
    painReliefGiven: r.pain_relief_given || '',
    lastAdminTimeChecked: r.last_admin_time_checked || '',
    painPattern: r.pain_pattern || '',
    worseBetter: r.worse_better || '',
    interventionType: r.intervention_type || '',
    outcome: r.outcome || '',
    furtherActionRequired: r.further_action_required || '',
    furtherActionPlan: r.further_action_plan || '',
    notes: r.notes || '',
  }
}

function printStructuredPainRecord(rec: any, currentForm: FormState) {
  const sections: PrintSection[] = [{
    title: 'Completed Structured Pain Assessment',
    inner: `
      <table class="fields">
        <tr><th>Assessed Date</th><td>${rec.assessed_at ? fmtDate(rec.assessed_at) : (rec.assessed_date || '—')}</td></tr>
        ${rec.assessed_by_name ? `<tr><th>Assessed By</th><td>${esc(rec.assessed_by_name)}</td></tr>` : ''}
        <tr><th>1. Pain Intensity Rating</th><td><strong>${esc(currentForm.painIntensity) || '—'}</strong></td></tr>
        <tr><th>2. Pain Description</th><td><strong>${esc(currentForm.painDescription) || '—'}</strong></td></tr>
        <tr><th>3. Pain Duration &amp; Triggers</th><td>${nl(currentForm.durationTriggers) || '—'}</td></tr>
        <tr><th>4. Impact on Daily Life</th><td>${currentForm.dailyLifeImpact.length ? esc(currentForm.dailyLifeImpact.join(', ')) : '—'}</td></tr>
        <tr><th>5. Pain Relief Given?</th><td>${esc(currentForm.painReliefGiven) || '—'}</td></tr>
        <tr><th>6. Last Admin Time Checked?</th><td>${esc(currentForm.lastAdminTimeChecked) || '—'}</td></tr>
        <tr><th>7. Pain Pattern</th><td>${esc(currentForm.painPattern) || '—'}</td></tr>
        <tr><th>8. What Makes It Worse / Better</th><td>${nl(currentForm.worseBetter) || '—'}</td></tr>
        <tr><th>9. Type of Intervention</th><td>${esc(currentForm.interventionType) || '—'}</td></tr>
        <tr><th>10. Outcome</th><td>${esc(currentForm.outcome) || '—'}</td></tr>
        <tr><th>11. Further Action Required</th><td>${esc(currentForm.furtherActionRequired) || '—'}</td></tr>
        ${currentForm.furtherActionPlan ? `<tr><th>Follow-Up Plan</th><td>${nl(currentForm.furtherActionPlan)}</td></tr>` : ''}
      </table>
      ${currentForm.notes ? `<h3 class="sub">Clinical Notes</h3><p class="body-text">${nl(currentForm.notes)}</p>` : ''}
    `,
  }]
  const residentName = rec.su_name || 'Resident'
  const body = buildLetterheadPage({
    docTitle: 'Pain Assessment',
    docSubtitle: 'Completed structured pain assessment & intervention record',
    docRefPrefix: 'PA',
    docRefId: rec.id || '—',
    residentName,
    sections,
  })
  openLetterheadPrint(`${residentName} — Pain Assessment`, body)
}

function StructuredPainDetailModal({
  record,
  initialEdit = false,
  onClose,
  onSaved,
}: {
  record: any
  initialEdit?: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [editing, setEditing] = useState(initialEdit)
  const [editForm, setEditForm] = useState<FormState>(() => rowToFormState(record))
  const [saving, setSaving] = useState(false)

  const toggleDaily = (opt: string) => {
    if (!editing) return
    setEditForm(f => {
      if (opt === 'None') return { ...f, dailyLifeImpact: f.dailyLifeImpact.includes('None') ? [] : ['None'] }
      const withoutNone = f.dailyLifeImpact.filter(x => x !== 'None')
      return {
        ...f,
        dailyLifeImpact: withoutNone.includes(opt) ? withoutNone.filter(x => x !== opt) : [...withoutNone, opt],
      }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put(`/clinical/pain-assessment/${record.id}`, {
        assessedDate: record.assessed_date || format(new Date(), 'yyyy-MM-dd'),
        painIntensity: editForm.painIntensity,
        painDescription: editForm.painDescription,
        durationTriggers: editForm.durationTriggers,
        dailyLifeImpact: editForm.dailyLifeImpact,
        painReliefGiven: editForm.painReliefGiven,
        lastAdminTimeChecked: editForm.lastAdminTimeChecked,
        painPattern: editForm.painPattern,
        worseBetter: editForm.worseBetter,
        interventionType: editForm.interventionType,
        outcome: editForm.outcome,
        furtherActionRequired: editForm.furtherActionRequired,
        furtherActionPlan: editForm.furtherActionPlan,
        notes: editForm.notes,
      })
      toast.success('Pain assessment updated')
      onSaved()
      onClose()
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to update pain assessment')
    } finally {
      setSaving(false)
    }
  }

  const renderQuestionOptions = (
    num: number,
    title: string,
    options: string[],
    selectedValue: string,
    onSelect: (val: string) => void
  ) => (
    <div className="p-4 bg-white">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
          {num}
        </span>
        <p className="text-sm font-bold text-slate-900">{title}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-7">
        {options.map(opt => {
          const isSelected = selectedValue === opt
          return (
            <label
              key={opt}
              onClick={() => { if (editing) onSelect(opt) }}
              className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs transition-all ${
                editing ? 'cursor-pointer' : 'cursor-default'
              } ${
                isSelected
                  ? 'border-rose-500 bg-rose-50 text-slate-900 font-bold ring-1 ring-rose-300'
                  : 'border-slate-200 bg-slate-50/50 text-slate-600'
              }`}
            >
              <input type="radio" checked={isSelected} readOnly className="accent-rose-600 pointer-events-none" />
              <span className="flex-1">{opt}</span>
              {isSelected && <CheckCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />}
            </label>
          )
        })}
      </div>
    </div>
  )

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={editing ? `Edit Pain Assessment — ${record.su_name || 'Resident'}` : `Completed Pain Assessment — ${record.su_name || 'Resident'}`}
      size="xl"
    >
      <div className="bg-white text-slate-900 rounded-xl p-4 border border-slate-200 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-200">
          <div>
            <p className="text-base font-bold text-slate-900">{record.su_name || 'Service User'}</p>
            <p className="text-xs text-slate-600">
              {record.assessed_at ? format(new Date(record.assessed_at), 'dd MMM yyyy, HH:mm') : (record.assessed_date || '—')}
              {record.assessed_by_name ? ` · Assessed by ${record.assessed_by_name}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => printStructuredPainRecord(record, editForm)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              <Printer className="w-3.5 h-3.5" /> Print PDF
            </button>
            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700"
              >
                <Edit className="w-3.5 h-3.5" /> Edit Assessment
              </button>
            )}
          </div>
        </div>

        {/* Full questionnaire displaying ALL options & selected responses */}
        <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
          {renderQuestionOptions(1, 'Pain Intensity Rating', PAIN_INTENSITY_OPTIONS, editForm.painIntensity, v => setEditForm(f => ({ ...f, painIntensity: v })))}
          {renderQuestionOptions(2, 'Pain Description', PAIN_DESCRIPTION_OPTIONS, editForm.painDescription, v => setEditForm(f => ({ ...f, painDescription: v })))}

          {/* 3. Duration & Triggers */}
          <div className="p-4 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">3</span>
              <p className="text-sm font-bold text-slate-900">Pain Duration &amp; Triggers</p>
            </div>
            <div className="ml-7">
              {editing ? (
                <textarea className="input w-full text-slate-900 bg-white" rows={2} value={editForm.durationTriggers} onChange={e => setEditForm(f => ({ ...f, durationTriggers: e.target.value }))} />
              ) : (
                <p className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap">{editForm.durationTriggers || '—'}</p>
              )}
            </div>
          </div>

          {/* 4. Impact on Daily Life (multi-select) */}
          <div className="p-4 bg-white">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">4</span>
              <p className="text-sm font-bold text-slate-900">Impact on Daily Life</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-7">
              {DAILY_LIFE_IMPACT_OPTIONS.map(opt => {
                const selected = editForm.dailyLifeImpact.includes(opt)
                return (
                  <label
                    key={opt}
                    onClick={() => toggleDaily(opt)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs transition-all ${
                      editing ? 'cursor-pointer' : 'cursor-default'
                    } ${
                      selected
                        ? 'border-rose-500 bg-rose-50 text-slate-900 font-bold ring-1 ring-rose-300'
                        : 'border-slate-200 bg-slate-50/50 text-slate-600'
                    }`}
                  >
                    <input type="checkbox" checked={selected} readOnly className="accent-rose-600 pointer-events-none" />
                    <span className="flex-1">{opt}</span>
                    {selected && <CheckCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />}
                  </label>
                )
              })}
            </div>
          </div>

          {renderQuestionOptions(5, 'Has Pain Relief Been Given?', YES_NO_NA, editForm.painReliefGiven, v => setEditForm(f => ({ ...f, painReliefGiven: v })))}
          {renderQuestionOptions(6, 'Was Last Administration Time Checked?', YES_NO_NA, editForm.lastAdminTimeChecked, v => setEditForm(f => ({ ...f, lastAdminTimeChecked: v })))}
          {renderQuestionOptions(7, 'Is Pain Constant or Intermittent?', PAIN_PATTERN_OPTIONS, editForm.painPattern, v => setEditForm(f => ({ ...f, painPattern: v })))}

          {/* 8. Worse or Better */}
          <div className="p-4 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">8</span>
              <p className="text-sm font-bold text-slate-900">What Makes Pain Worse or Better?</p>
            </div>
            <div className="ml-7">
              {editing ? (
                <textarea className="input w-full text-slate-900 bg-white" rows={2} value={editForm.worseBetter} onChange={e => setEditForm(f => ({ ...f, worseBetter: e.target.value }))} />
              ) : (
                <p className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap">{editForm.worseBetter || '—'}</p>
              )}
            </div>
          </div>

          {renderQuestionOptions(9, 'Type of Intervention Provided', INTERVENTION_TYPE_OPTIONS, editForm.interventionType, v => setEditForm(f => ({ ...f, interventionType: v })))}
          {renderQuestionOptions(10, 'Outcome After Intervention', OUTCOME_OPTIONS, editForm.outcome, v => setEditForm(f => ({ ...f, outcome: v })))}
          {renderQuestionOptions(11, 'Further Action Required?', YES_NO, editForm.furtherActionRequired, v => setEditForm(f => ({ ...f, furtherActionRequired: v })))}

          {/* Follow-up & Clinical Notes */}
          <div className="p-4 bg-white space-y-3">
            <div>
              <label className="text-xs font-bold uppercase text-slate-600 mb-1 block">Follow-Up Action Plan</label>
              {editing ? (
                <textarea className="input w-full text-slate-900 bg-white" rows={2} value={editForm.furtherActionPlan} onChange={e => setEditForm(f => ({ ...f, furtherActionPlan: e.target.value }))} />
              ) : (
                <p className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap">{editForm.furtherActionPlan || '—'}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-600 mb-1 block">Clinical Notes</label>
              {editing ? (
                <textarea className="input w-full text-slate-900 bg-white" rows={2} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
              ) : (
                <p className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap">{editForm.notes || '—'}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          {editing ? (
            <>
              <Button variant="ghost" onClick={() => setEditing(false)}>Cancel Edit</Button>
              <Button icon={<Save className="w-4 h-4" />} onClick={handleSave} loading={saving}>Save Changes</Button>
            </>
          ) : (
            <Button variant="secondary" onClick={onClose}>Close</Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default function PainAssessment() {
  const { user } = useAuth()
  const { theme } = useTheme()
  const [residents, setResidents] = useState<any[]>([])
  const [structuredRecords, setStructuredRecords] = useState<any[]>([])
  const [abbeyRecords, setAbbeyRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Uniform filter bar state
  const [filterSu, setFilterSu] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterKind, setFilterKind] = useState('')

  // Collapsible new structured assessment form state
  const [formOpen, setFormOpen] = useState(false)
  const [formSu, setFormSu] = useState('')
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)

  // Modal state for opening ANY completed assessment (structured OR Abbey scale)
  const [activeRecord, setActiveRecord] = useState<any | null>(null)
  const [startInEdit, setStartInEdit] = useState(false)

  const textPrimary = theme === 'dark' ? '#f5f0e8' : '#0f172a'
  const textMuted = theme === 'dark' ? '#9a9488' : '#64748b'

  useEffect(() => {
    if (!user?.homeId) return
    suApi.list(user.homeId).then(r => setResidents(r.data.data || [])).catch(() => {})
  }, [user?.homeId])

  const loadAllPainAssessments = async () => {
    if (!user?.homeId) return
    setLoading(true)
    try {
      const params = {
        homeId: user.homeId,
        suId: filterSu || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
      }
      const [structuredRes, abbeyRes] = await Promise.all([
        api.get('/clinical/pain-assessments', { params }),
        api.get('/clinical/abbey-pain', { params }),
      ])
      setStructuredRecords((structuredRes.data?.data || []).map((r: any) => ({ ...r, _kind: 'structured' })))
      setAbbeyRecords((abbeyRes.data?.data || []).map((r: any) => ({ ...r, _kind: 'abbey' })))
    } catch {
      setStructuredRecords([])
      setAbbeyRecords([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllPainAssessments()
  }, [user?.homeId, filterSu, dateFrom, dateTo])

  useEffect(() => {
    if (filterSu) setFormSu(filterSu)
  }, [filterSu])

  const combinedRecords = useMemo(() => {
    const merged = [...structuredRecords, ...abbeyRecords].sort((a, b) => {
      const ta = new Date(a.assessed_at || a.assessed_date || 0).getTime()
      const tb = new Date(b.assessed_at || b.assessed_date || 0).getTime()
      return tb - ta
    })
    return merged.filter(r => {
      if (filterKind && r._kind !== filterKind) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        String(r.su_name || '').toLowerCase().includes(q) ||
        String(r.assessed_by_name || '').toLowerCase().includes(q) ||
        String(r.pain_intensity || '').toLowerCase().includes(q) ||
        String(r.pain_description || '').toLowerCase().includes(q) ||
        String(r.interpretation || '').toLowerCase().includes(q) ||
        String(r.pain_type || '').toLowerCase().includes(q) ||
        String(r.outcome || '').toLowerCase().includes(q) ||
        String(r.notes || '').toLowerCase().includes(q)
      )
    })
  }, [structuredRecords, abbeyRecords, filterKind, search])

  const canSave = !!form.painIntensity && !!form.painDescription

  const toggleDailyLife = (opt: string) => {
    setForm(f => {
      if (opt === 'None') return { ...f, dailyLifeImpact: f.dailyLifeImpact.includes('None') ? [] : ['None'] }
      const withoutNone = f.dailyLifeImpact.filter(x => x !== 'None')
      return {
        ...f,
        dailyLifeImpact: withoutNone.includes(opt) ? withoutNone.filter(x => x !== opt) : [...withoutNone, opt],
      }
    })
  }

  const save = async () => {
    const targetSu = formSu || filterSu
    if (!targetSu) { toast.error('Please select a service user'); return }
    if (!canSave) { toast.error('Please select pain intensity and description'); return }
    setSaving(true)
    try {
      await api.post('/clinical/pain-assessment', {
        suId: targetSu,
        homeId: user?.homeId,
        assessedDate: format(new Date(), 'yyyy-MM-dd'),
        painIntensity: form.painIntensity,
        painDescription: form.painDescription,
        durationTriggers: form.durationTriggers,
        dailyLifeImpact: form.dailyLifeImpact,
        painReliefGiven: form.painReliefGiven,
        lastAdminTimeChecked: form.lastAdminTimeChecked,
        painPattern: form.painPattern,
        worseBetter: form.worseBetter,
        interventionType: form.interventionType,
        outcome: form.outcome,
        furtherActionRequired: form.furtherActionRequired,
        furtherActionPlan: form.furtherActionPlan,
        notes: form.notes,
        assessedBy: user?.id,
      })
      toast.success('Pain Assessment saved')
      setForm(emptyForm)
      setFormOpen(false)
      await loadAllPainAssessments()
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handlePrintSummary = () => {
    const resident = residents.find(r => r.id === filterSu)
    const residentName = resident ? `${resident.first_name} ${resident.last_name}` : 'All Service Users'
    const sections: PrintSection[] = combinedRecords.length
      ? [{
          title: 'Completed Pain Assessments',
          inner: `<table class="fields">${combinedRecords.map(r => `
            <tr>
              <th>${r.assessed_at ? fmtDate(r.assessed_at) : (r.assessed_date || '—')}<br/><span style="font-weight:normal;color:#64748b">${esc(r.su_name || residentName)}</span></th>
              <td>
                ${r._kind === 'abbey'
                  ? `<strong>Abbey Pain Scale: ${esc(r.total_score)} / 18 (${esc(r.interpretation)})</strong>${r.pain_type ? ` · ${esc(r.pain_type)}` : ''}`
                  : `<strong>${esc(r.pain_intensity)}</strong>${r.pain_description ? ` · ${esc(r.pain_description)}` : ''}${r.outcome ? ` · ${esc(r.outcome)}` : ''}`}
                ${r.assessed_by_name ? `<br/><span style="font-size:11px;color:#64748b">Assessed by ${esc(r.assessed_by_name)}</span>` : ''}
                ${r.notes ? `<br/><em>${nl(r.notes)}</em>` : ''}
              </td>
            </tr>`).join('')}</table>`,
        }]
      : [{ title: 'Pain Assessments', inner: `<p class="body-text muted">No pain assessments match the current filter.</p>` }]
    const body = buildLetterheadPage({
      docTitle: 'Pain Assessments Log',
      docSubtitle: 'Completed structured & Abbey Pain Scale assessments',
      docRefPrefix: 'PA',
      docRefId: filterSu || 'ALL',
      residentName,
      sections,
    })
    openLetterheadPrint(`${residentName} — Pain Assessments`, body)
  }

  const renderSingleSelect = (options: string[], value: string, onChange: (v: string) => void) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {options.map(opt => (
        <label
          key={opt}
          className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
            value === opt ? 'border-rose-500 bg-rose-50 text-slate-900 font-semibold' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
          }`}
        >
          <input type="radio" checked={value === opt} onChange={() => onChange(opt)} className="accent-rose-600" />
          <span className="text-sm flex-1">{opt}</span>
        </label>
      ))}
    </div>
  )

  const personOptions = useMemo(
    () => residents.map(r => ({ value: r.id, label: `${r.first_name} ${r.last_name}` })),
    [residents]
  )

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2" style={{ color: textPrimary }}>
            <Frown className="w-6 h-6 text-rose-600" />
            Pain Assessment
          </h1>
          <p className="text-sm mt-0.5" style={{ color: textMuted }}>
            Structured pain assessments &amp; clinical pain monitoring log
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrintSummary}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg px-3 py-2 bg-white print:hidden"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          <Button
            icon={formOpen ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            onClick={() => setFormOpen(v => !v)}
          >
            {formOpen ? 'Hide Form' : 'New Pain Assessment'}
          </Button>
        </div>
      </div>

      {/* Uniform Filter Bar */}
      <UniformFilterBar
        personLabel="Service User"
        personAllLabel="All Service Users"
        personValue={filterSu}
        onPersonChange={setFilterSu}
        personOptions={personOptions}
        searchPlaceholder="Search resident, pain intensity, description, notes, staff..."
        searchValue={search}
        onSearchChange={setSearch}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        extraSelects={[
          {
            id: 'assessmentType',
            label: 'Scale / Type',
            allLabel: 'All Pain Assessments',
            value: filterKind,
            onChange: setFilterKind,
            options: [
              { value: 'structured', label: 'Structured Pain Assessment' },
              { value: 'abbey', label: 'Abbey Pain Scale' },
            ],
          },
        ]}
        onClear={() => {
          setFilterSu('')
          setSearch('')
          setDateFrom('')
          setDateTo('')
          setFilterKind('')
        }}
        shownCount={combinedRecords.length}
        totalCount={structuredRecords.length + abbeyRecords.length}
      />

      {/* Collapsible New Structured Pain Assessment Form */}
      {formOpen && (
        <div className="bg-white text-slate-900 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3 bg-slate-50/80">
            <h2 className="font-bold text-slate-900">New Structured Pain Assessment — {format(new Date(), 'd MMMM yyyy')}</h2>
            <select
              className="input w-full sm:w-72 text-slate-900 bg-white"
              value={formSu}
              onChange={e => setFormSu(e.target.value)}
            >
              <option value="">— Select service user —</option>
              {residents.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
            </select>
          </div>

          {/* Pharmacological reference guidance banner */}
          <div className="m-5 p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-1.5">
            <p className="font-bold flex items-center gap-1.5"><Info className="w-4 h-4 text-blue-600" /> Clinical Pain Management Guidance</p>
            {PHARMA_BANDS.map(b => (
              <p key={b.band}><strong>{b.band}:</strong> {b.guidance}</p>
            ))}
          </div>

          <div className="px-5 pb-5 space-y-5">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2 block">1. Pain Intensity Rating *</label>
              {renderSingleSelect(PAIN_INTENSITY_OPTIONS, form.painIntensity, v => setForm(f => ({ ...f, painIntensity: v })))}
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2 block">2. Pain Description *</label>
              {renderSingleSelect(PAIN_DESCRIPTION_OPTIONS, form.painDescription, v => setForm(f => ({ ...f, painDescription: v })))}
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2 block">3. Pain Duration &amp; Triggers</label>
              <textarea
                className="input w-full text-slate-900 bg-white"
                rows={2}
                placeholder="When did pain start? What activities or movements trigger it?"
                value={form.durationTriggers}
                onChange={e => setForm(f => ({ ...f, durationTriggers: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2 block">4. Impact on Daily Life</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DAILY_LIFE_IMPACT_OPTIONS.map(opt => {
                  const checked = form.dailyLifeImpact.includes(opt)
                  return (
                    <label
                      key={opt}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        checked ? 'border-rose-500 bg-rose-50 text-slate-900 font-semibold' : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggleDailyLife(opt)} className="accent-rose-600" />
                      <span className="text-sm flex-1">{opt}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2 block">5. Has Pain Relief Been Given?</label>
                {renderSingleSelect(YES_NO_NA, form.painReliefGiven, v => setForm(f => ({ ...f, painReliefGiven: v })))}
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2 block">6. Last Administration Time Checked?</label>
                {renderSingleSelect(YES_NO_NA, form.lastAdminTimeChecked, v => setForm(f => ({ ...f, lastAdminTimeChecked: v })))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2 block">7. Is the Pain Constant or Intermittent?</label>
              {renderSingleSelect(PAIN_PATTERN_OPTIONS, form.painPattern, v => setForm(f => ({ ...f, painPattern: v })))}
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2 block">8. What Makes Pain Worse or Better?</label>
              <textarea
                className="input w-full text-slate-900 bg-white"
                rows={2}
                placeholder="Positions, heat/cold packs, rest, analgesia..."
                value={form.worseBetter}
                onChange={e => setForm(f => ({ ...f, worseBetter: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2 block">9. Type of Intervention</label>
              {renderSingleSelect(INTERVENTION_TYPE_OPTIONS, form.interventionType, v => setForm(f => ({ ...f, interventionType: v })))}
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2 block">10. Outcome</label>
              {renderSingleSelect(OUTCOME_OPTIONS, form.outcome, v => setForm(f => ({ ...f, outcome: v })))}
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2 block">11. Further Action Required?</label>
              {renderSingleSelect(YES_NO, form.furtherActionRequired, v => setForm(f => ({ ...f, furtherActionRequired: v })))}
              {form.furtherActionRequired === 'Yes' && (
                <textarea
                  className="input w-full mt-3 text-slate-900 bg-white"
                  rows={2}
                  placeholder="Describe follow-up plan / GP or 111 escalation..."
                  value={form.furtherActionPlan}
                  onChange={e => setForm(f => ({ ...f, furtherActionPlan: e.target.value }))}
                />
              )}
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2 block">Additional Clinical Notes</label>
              <textarea
                className="input w-full text-slate-900 bg-white"
                rows={2}
                placeholder="Additional observations..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button icon={<Save className="w-4 h-4" />} onClick={save} loading={saving} disabled={!canSave}>Save Assessment</Button>
            </div>
          </div>
        </div>
      )}

      {/* Completed Pain Assessments Dashboard — ALWAYS visible underneath on load */}
      <div className="bg-white text-slate-900 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 bg-slate-50/80">
          <h2 className="font-bold text-slate-900">Completed Pain Assessments ({combinedRecords.length})</h2>
          <span className="text-xs font-medium text-slate-500">
            Click any completed assessment to inspect every selected option or edit
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : combinedRecords.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">
            No completed pain assessments found for the selected filter criteria.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {combinedRecords.map((rec: any) => {
              const isAbbey = rec._kind === 'abbey'
              const abbeyInfo = isAbbey ? getAbbeyInterpretation(Number(rec.total_score || 0)) : null
              return (
                <div
                  key={`${rec._kind}-${rec.id}`}
                  onClick={() => { setStartInEdit(false); setActiveRecord(rec) }}
                  className="px-5 py-4 flex items-center gap-4 hover:bg-rose-50/50 transition-colors cursor-pointer"
                >
                  {isAbbey && abbeyInfo ? (
                    <div
                      className="w-11 h-11 rounded-full border-2 flex items-center justify-center bg-white flex-shrink-0"
                      style={{ borderColor: abbeyInfo.color }}
                    >
                      <span className="text-sm font-black" style={{ color: abbeyInfo.color }}>{rec.total_score}</span>
                    </div>
                  ) : (
                    <div className="w-11 h-11 rounded-full border-2 border-rose-300 bg-rose-50 flex items-center justify-center flex-shrink-0">
                      <Frown className="w-5 h-5 text-rose-600" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">{rec.su_name || 'Resident'}</span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                        {isAbbey ? 'Abbey Pain Scale' : 'Structured Pain Assessment'}
                      </span>
                      <span className="text-sm font-bold text-rose-700">
                        {isAbbey
                          ? `${rec.interpretation || abbeyInfo?.label}${rec.pain_type ? ` · ${rec.pain_type}` : ''} (${rec.total_score}/18)`
                          : `${rec.pain_intensity || 'Assessed'}${rec.pain_description ? ` · ${rec.pain_description}` : ''}`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {rec.assessed_at ? format(new Date(rec.assessed_at), 'dd MMM yyyy, HH:mm') : (rec.assessed_date || '—')}
                      {rec.assessed_by_name ? ` · Assessed by ${rec.assessed_by_name}` : ''}
                      {rec.outcome ? ` · Outcome: ${rec.outcome}` : ''}
                      {rec.notes ? ` · "${rec.notes}"` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => { setStartInEdit(false); setActiveRecord(rec) }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Form
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStartInEdit(true); setActiveRecord(rec) }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Completed Assessment Detail / Edit Modal */}
      {activeRecord && (
        activeRecord._kind === 'abbey' ? (
          <AbbeyAssessmentDetailModal
            record={activeRecord}
            initialEdit={startInEdit}
            onClose={() => { setActiveRecord(null); setStartInEdit(false) }}
            onSaved={loadAllPainAssessments}
          />
        ) : (
          <StructuredPainDetailModal
            record={activeRecord}
            initialEdit={startInEdit}
            onClose={() => { setActiveRecord(null); setStartInEdit(false) }}
            onSaved={loadAllPainAssessments}
          />
        )
      )}
    </div>
  )
}
