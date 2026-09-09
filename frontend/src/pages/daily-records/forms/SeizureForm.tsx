import React, { useEffect, useState } from 'react'
import api from '../../../api'
import { Button, Input, Select, SpeechTextarea } from '../../../components/ui'
import { Zap } from 'lucide-react'
import toast from 'react-hot-toast'

// ── Draft autosave ───────────────────────────────────────────────────────
function draftKey(suId: string) { return `compcare_seizure_draft_${suId}` }
function getDraft(suId: string): any | null {
  try { const raw = localStorage.getItem(draftKey(suId)); return raw ? JSON.parse(raw) : null } catch { return null }
}
function saveDraft(suId: string, form: any) {
  try { localStorage.setItem(draftKey(suId), JSON.stringify({ ...form, savedAt: new Date().toISOString() })) } catch { /* storage unavailable — skip silently */ }
}
function clearDraft(suId: string) {
  try { localStorage.removeItem(draftKey(suId)) } catch { /* ignore */ }
}

const SEIZURE_TYPES = [
  { value: 'tonic_clonic', label: 'Tonic-Clonic (Grand Mal)' },
  { value: 'absence', label: 'Absence (Petit Mal)' },
  { value: 'focal', label: 'Focal / Partial' },
  { value: 'myoclonic', label: 'Myoclonic' },
  { value: 'tonic', label: 'Tonic' },
  { value: 'clonic', label: 'Clonic' },
  { value: 'atonic', label: 'Atonic (Drop Attack)' },
  { value: 'unclassified', label: 'Unclassified' },
  { value: 'other', label: 'Other' },
]

export default function SeizureForm({ suId, onSaved }: { suId: string; onSaved: () => void }) {
  const [form, setForm] = useState({
    seizureType: 'tonic_clonic',
    seizureAt: new Date().toISOString().slice(0, 16),
    durationSeconds: '',
    recoveryTime: '',
    description: '',
    action: '',
    postIctal: '',
    notifiedGP: false,
    notifiedFamily: false,
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    const draft = getDraft(suId)
    if (draft && (draft.description || draft.action)) {
      setForm(p => ({ ...p, ...draft, savedAt: undefined }))
      toast('Restored your unsaved draft', { icon: '📝' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const hasContent = form.description || form.action || form.postIctal
    if (!hasContent) return
    const t = setTimeout(() => saveDraft(suId, form), 800)
    return () => clearTimeout(t)
  }, [suId, form])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/seizures', {
        suId,
        ...form,
        durationSeconds: form.durationSeconds ? parseInt(form.durationSeconds) : null,
        recoveryTime: form.recoveryTime ? parseInt(form.recoveryTime) : null,
      })
      toast.success('Seizure episode recorded')
      clearDraft(suId)
      onSaved()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save')
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl">
        <Zap className="w-5 h-5 text-rose-600 flex-shrink-0" />
        <p className="text-sm text-rose-700 font-medium">Record details of the seizure episode accurately.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select label="Seizure type *" value={form.seizureType} onChange={e => set('seizureType', e.target.value)} options={SEIZURE_TYPES} />
        <Input label="Date & Time" type="datetime-local" value={form.seizureAt} onChange={e => set('seizureAt', e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input label="Duration (seconds)" type="number" placeholder="e.g. 45" value={form.durationSeconds} onChange={e => set('durationSeconds', e.target.value)} />
        <Input label="Recovery time (minutes)" type="number" placeholder="e.g. 5" value={form.recoveryTime} onChange={e => set('recoveryTime', e.target.value)} />
      </div>

      <SpeechTextarea label="Description of episode" rows={3} value={form.description} onChange={v => set('description', v)}
        placeholder="Describe what happened, movements, loss of consciousness..." />

      <SpeechTextarea label="Action taken" rows={2} value={form.action} onChange={v => set('action', v)}
        placeholder="e.g. Positioned on side, timed episode, called for assistance..." />

      <SpeechTextarea label="Post-ictal state" rows={2} value={form.postIctal} onChange={v => set('postIctal', v)}
        placeholder="e.g. Drowsy, confused, sleeping..." />

      <div className="flex gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.notifiedGP} onChange={e => set('notifiedGP', e.target.checked)} className="w-4 h-4 rounded" />
          <span className="text-sm text-slate-700">GP notified</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.notifiedFamily} onChange={e => set('notifiedFamily', e.target.checked)} className="w-4 h-4 rounded" />
          <span className="text-sm text-slate-700">Family notified</span>
        </label>
      </div>

      <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
        <Button type="submit" loading={saving} icon={<Zap className="w-4 h-4" />}>
          Save seizure record
        </Button>
      </div>
    </form>
  )
}
