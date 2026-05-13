import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../../api'
import { format } from 'date-fns'

export default function PrintCarePlan() {
  const { id } = useParams<{ id: string }>()
  const [plan, setPlan] = useState<any>(null)

  useEffect(() => {
    if (!id) return
    api.get(`/care-plans/${id}`).then(res => {
      setPlan(res.data.data)
      setTimeout(() => window.print(), 800)
    }).catch(console.error)
  }, [id])

  if (!plan) return <div className="p-8 text-center text-slate-400">Loading care plan...</div>

  const suName = plan.su_name || plan.suName || 'Unknown'
  const planType = (plan.plan_type || '').replace(/_/g, ' ')

  return (
    <div className="max-w-3xl mx-auto p-8 bg-white" style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#1e293b' }}>
      {/* Header */}
      <div className="border-2 border-slate-800 p-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-wider">{planType} Care Plan</h1>
            <h2 className="text-lg font-semibold mt-1">{suName}</h2>
          </div>
          <div className="text-right text-sm text-slate-500">
            <p>CompCare Hub</p>
            <p>Printed: {format(new Date(), 'd MMMM yyyy')}</p>
          </div>
        </div>
      </div>

      {/* Key info */}
      <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
        <div className="border border-slate-200 p-3 rounded">
          <p className="font-bold text-slate-500 uppercase text-xs mb-1">Review frequency</p>
          <p className="capitalize">{(plan.review_frequency || 'Monthly').replace(/_/g, ' ')}</p>
        </div>
        <div className="border border-slate-200 p-3 rounded">
          <p className="font-bold text-slate-500 uppercase text-xs mb-1">Last reviewed</p>
          <p>{plan.last_review_date ? format(new Date(plan.last_review_date), 'd MMM yyyy') : 'Not yet reviewed'}</p>
        </div>
        <div className="border border-slate-200 p-3 rounded">
          <p className="font-bold text-slate-500 uppercase text-xs mb-1">Next review due</p>
          <p>{plan.next_review_date ? format(new Date(plan.next_review_date), 'd MMM yyyy') : '—'}</p>
        </div>
      </div>

      {/* Sections */}
      {[
        { label: 'Aims & Outcomes', field: 'aims_outcomes' },
        { label: 'What I can do for myself', field: 'what_i_can_do' },
        { label: 'How staff can support me', field: 'how_to_support' },
        { label: 'Current status', field: 'current_status' },
        { label: 'Additional notes', field: 'notes' },
      ].map(({ label, field }) => plan[field] && (
        <div key={field} className="mb-5">
          <div className="bg-slate-800 text-white px-3 py-1.5 font-bold text-sm mb-2">{label}</div>
          <div className="border border-slate-200 p-3 min-h-[60px] whitespace-pre-line text-sm">{plan[field]}</div>
        </div>
      ))}

      {/* Review history */}
      {plan.updates && plan.updates.length > 0 && (
        <div className="mb-5">
          <div className="bg-slate-800 text-white px-3 py-1.5 font-bold text-sm mb-2">Care Plan Updates</div>
          <div className="border border-slate-200">
            {plan.updates.map((u: any, i: number) => (
              <div key={i} className="flex gap-4 p-3 border-b border-slate-100 last:border-0 text-sm">
                <span className="text-slate-500 flex-shrink-0 w-24">{u.created_at ? format(new Date(u.created_at), 'd MMM yyyy') : ''}</span>
                <span className="text-slate-500 flex-shrink-0 w-28">{u.updated_by_name || ''}</span>
                <span>{u.update_notes || ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Signature section */}
      <div className="border-2 border-slate-800 p-4 mt-8">
        <p className="font-bold mb-4">Sign-off</p>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="text-sm font-semibold mb-2">Manager signature</p>
            <div className="border-b border-slate-400 h-12 mb-1" />
            <p className="text-xs text-slate-500">Name: ___________________ Date: ___________</p>
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Service user / representative</p>
            <div className="border-b border-slate-400 h-12 mb-1" />
            <p className="text-xs text-slate-500">Name: ___________________ Date: ___________</p>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400 mt-4 text-center">
        This care plan is confidential and must be stored securely. CompCare Hub — {format(new Date(), 'yyyy')}
      </p>

      <style>{`@media print { @page { margin: 1.5cm; } }`}</style>
    </div>
  )
}
