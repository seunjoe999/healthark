import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../api'
import { suApi } from '../../api'
import { Button, Input, SectionHeading } from '../../components/ui'
import { ArrowLeft, Heart, Save } from 'lucide-react'
import toast from 'react-hot-toast'

const SECTIONS = [
  { key: 'life_history', label: 'Life history', placeholder: 'Where I grew up, family, key life events, career, relationships...' },
  { key: 'important_people', label: 'Important people in my life', placeholder: 'Family members, close friends, people who matter to me...' },
  { key: 'daily_routine', label: 'My daily routine', placeholder: 'When I like to wake up, meal preferences, bedtime routine...' },
  { key: 'hobbies_interests', label: 'Hobbies & interests', placeholder: 'What I enjoy doing, TV shows, music, sports, reading...' },
  { key: 'communication', label: 'How I communicate', placeholder: 'How I express myself, any communication needs, preferred language...' },
  { key: 'likes_dislikes', label: 'Things I like & dislike', placeholder: 'Food preferences, things that make me happy, things that upset me...' },
  { key: 'beliefs_values', label: 'My beliefs & values', placeholder: 'Religion, cultural background, things that are important to me...' },
  { key: 'goals_wishes', label: 'My goals & wishes', placeholder: 'Things I want to achieve, places I want to go, things I want to do...' },
  { key: 'support_needs', label: 'How I like to be supported', placeholder: 'What helps me, what doesn\'t help, how staff can best support me...' },
]

export default function AboutMe() {
  const { id } = useParams<{ id: string }>()
  const [su, setSu] = useState<any>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (!id) return
    Promise.all([
      suApi.get(id),
      api.get(`/service-users/${id}/about-me`).catch(() => ({ data: { data: {} } })),
    ]).then(([suRes, aboutRes]) => {
      setSu(suRes.data.data)
      setForm(aboutRes.data.data || {})
    })
  }, [id])

  const save = async () => {
    setSaving(true)
    try {
      await api.put(`/service-users/${id}/about-me`, form)
      toast.success('About Me saved')
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  if (!su) return <div className="p-8 text-center text-slate-400">Loading...</div>

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link to={`/service-users/${id}`} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="font-display text-2xl text-slate-900 flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500" /> About Me
          </h1>
          <p className="text-slate-400 text-sm">{su.first_name} {su.last_name} · My support plan</p>
        </div>
        <Button className="ml-auto" icon={<Save className="w-4 h-4" />} loading={saving} onClick={save}>Save</Button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
        <p className="text-sm text-amber-800 font-medium">
          💛 This is <strong>{su.first_name}</strong>'s personal support plan — written in their own voice.
          It helps staff understand who they are as a person, not just their care needs.
        </p>
      </div>

      <div className="space-y-5">
        {SECTIONS.map(section => (
          <div key={section.key} className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
            <label className="font-semibold text-slate-800 block mb-2">{section.label}</label>
            <textarea className="input w-full" rows={4} value={form[section.key] || ''}
              onChange={e => set(section.key, e.target.value)}
              placeholder={section.placeholder} />
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <Button icon={<Save className="w-4 h-4" />} loading={saving} onClick={save}>Save About Me</Button>
      </div>
    </div>
  )
}
