import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Button, Card, SectionHeading, Modal, Input, PrintButton } from '../../components/ui'
import { BookOpen, CheckCircle, Lock, Play, Award, ChevronRight, X, RotateCcw } from 'lucide-react'
import api from '../../api'
import toast from 'react-hot-toast'

const MODULES = [
  {
    id: 'intro',
    title: 'Introduction to CompCare Hub',
    description: 'Learn the basics — logging in, navigating the system, and your daily workflow.',
    duration: '5 mins',
    icon: '🏠',
    sections: [
      { title: 'Logging in', content: 'Go to your CompCare Hub link on your phone or computer. Enter your email and password. If you are new, use the registration code from your manager to create an account — your manager will then activate it.' },
      { title: 'The sidebar', content: 'The left sidebar is your main navigation. It is grouped into Care (residents and daily tasks), Operations (staff, tasks, messages), and Quality & Compliance (audits, reports, policies).' },
      { title: 'Your daily workflow', content: '1. Check the Dashboard for alerts and who is working today.\n2. Go to Daily Records and select the resident you are supporting.\n3. Log all care activities throughout your shift.\n4. Check the MAR Chart to log medications.\n5. Complete any Tasks assigned to you.\n6. Check Messages for any communications from management.' },
    ]
  },
  {
    id: 'daily_records',
    title: 'Daily Records',
    description: 'How to log care activities, vitals, food, fluids and incidents.',
    duration: '8 mins',
    icon: '📋',
    sections: [
      { title: 'Finding a resident', content: 'Click Daily Records in the sidebar. Search for the resident by name in the left panel. Click their name to open their records.' },
      { title: 'Adding a record', content: 'Click the blue + Add record button. Select the record type from the dropdown — for example Personal care, Food intake, Fluid/drinks, Blood pressure etc. Fill in the details and click Save record.' },
      { title: 'Fluid tracking', content: 'Every time you give a resident a drink, log it as a Fluid/drinks record. Select the drink type and the system will auto-fill the amount. The total for the day shows at the top — it turns amber if below the target.' },
      { title: 'Viewing past records', content: 'Use the date navigation arrows at the top to go back and view records from previous days. You cannot add records to past dates — only view them.' },
      { title: 'Body map', content: 'If you notice any skin concerns — redness, bruising, pressure sores — select Body map / skin from the record type dropdown. Click on the affected body area on the diagram, select the concern type and describe it.' },
    ]
  },
  {
    id: 'mar',
    title: 'MAR Chart — Medication Administration',
    description: 'How to log medications as given, refused or omitted.',
    duration: '6 mins',
    icon: '💊',
    sections: [
      { title: 'Opening the MAR chart', content: 'Click MAR Chart in the sidebar. Select the resident from the left panel. You will see their medication list.' },
      { title: 'Logging medication as given', content: 'Find the medication on the list. Click the green Given button. This records that you administered the medication, with the time and your name.' },
      { title: 'Logging as refused', content: 'If the resident refuses their medication, click the grey Refused button. This is important — never skip logging a refusal.' },
      { title: 'PRN medications', content: 'PRN means "as required". These medications are only given when needed. They are marked with an amber PRN badge. Always document why you gave a PRN medication in the notes.' },
      { title: 'Stock count', content: 'Click the Stock count tab to record how many of each medication is left. This must be done at every shift handover.' },
    ]
  },
  {
    id: 'safeguarding',
    title: 'Safeguarding',
    description: 'How to raise a safeguarding concern and what to do in an emergency.',
    duration: '10 mins',
    icon: '🛡️',
    sections: [
      { title: 'What is safeguarding?', content: 'Safeguarding means protecting adults at risk from abuse, neglect or harm. Every member of staff has a legal duty to report concerns. You should never ignore something that does not feel right.' },
      { title: 'Types of abuse', content: 'Physical abuse — hitting, restraining. Emotional abuse — bullying, threats. Financial abuse — stealing, fraud. Neglect — failing to provide care. Sexual abuse. Discriminatory abuse. Institutional abuse — poor practice by an organisation.' },
      { title: 'How to raise a concern', content: 'Go to Safeguarding in the sidebar. Click + New concern. Fill in the form — describe what happened, when, where, who was involved and any witnesses. Be factual and accurate. Click Submit. Your manager will be notified immediately.' },
      { title: 'What happens next', content: 'Your manager will acknowledge the concern. They may contact the local authority, CQC or police depending on the severity. You may be asked to provide more information. Do not discuss the concern with other staff or residents.' },
      { title: 'In an emergency', content: 'If someone is in immediate danger, call 999 first. Then raise a safeguarding concern in the system. Then inform your manager.' },
    ]
  },
  {
    id: 'clockin',
    title: 'Clock In & Out',
    description: 'How to use the QR code to clock in and out at a service user\'s location.',
    duration: '4 mins',
    icon: '📍',
    sections: [
      { title: 'How clock-in works', content: 'CompCare Hub uses GPS to verify you are at the correct location when you clock in. You must be within 200 metres of the service user\'s address. This protects residents and ensures accurate attendance records.' },
      { title: 'Scanning the QR code', content: 'At the care address, look for the printed QR code poster. Open your phone camera and point it at the QR code. Tap the link that appears. If prompted, sign in to CompCare Hub.' },
      { title: 'Clocking in', content: 'On the clock-in page, select Clock In. When prompted, allow your phone to access your location. If you are within range, your clock-in is recorded. If you are too far away, you will see an error showing your distance.' },
      { title: 'Clocking out', content: 'Follow the same process but select Clock Out. You must also be within range to clock out. Your shift duration is calculated automatically.' },
      { title: 'If you have problems', content: 'Make sure location access is enabled for your browser in phone settings. Try stepping outside or near a window. If problems persist, contact your manager who can manually record your attendance.' },
    ]
  },
  {
    id: 'care_plans',
    title: 'Care Plans & Risk Assessments',
    description: 'Understanding and updating care plans.',
    duration: '7 mins',
    icon: '📄',
    sections: [
      { title: 'What is a care plan?', content: 'A care plan describes how to support a specific resident with a specific need. For example, a Personal Hygiene care plan explains how to support that person with washing and dressing in the way they prefer.' },
      { title: 'Reading a care plan', content: 'Go to Care Plans. Select the resident. Click on a care plan to expand it. Read the aims, what the resident can do themselves, and what you should do to support them.' },
      { title: 'Updating a care plan', content: 'If something changes — for example a resident\'s mobility improves or declines — click Update on the care plan. Add a note describing the change. This is logged with your name and the date.' },
      { title: 'Review dates', content: 'Care plans must be reviewed monthly. A green badge means it is current. An amber badge means it is due soon. A red badge means it is overdue — inform your manager.' },
      { title: 'Risk assessments', content: 'Risk assessments sit alongside care plans. They identify risks (such as falls or pressure sores) and describe how to manage them. Always read the risk assessment before supporting a new resident.' },
    ]
  },
]

export default function Training() {
  const { user, isRole } = useAuth()
  const [completions, setCompletions] = useState<Record<string, boolean>>({})
  const [activeModule, setActiveModule] = useState<typeof MODULES[0] | null>(null)
  const [activeSection, setActiveSection] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load completions from backend
    api.get('/staff-hr/training-modules').then(res => {
      const data = res.data.data || []
      const map: Record<string, boolean> = {}
      data.forEach((d: any) => { map[d.module_id] = true })
      setCompletions(map)
    }).catch(() => {})
  }, [])

  const resetModule = async (moduleId: string) => {
    if (!window.confirm('Reset this module? You will need to complete it again.')) return
    try {
      await api.delete(`/staff-hr/training-modules/${moduleId}`)
      setCompletions(p => { const n = { ...p }; delete n[moduleId]; return n })
      toast.success('Module reset')
    } catch { toast.error('Failed to reset') }
  }

  const completeModule = async (moduleId: string) => {
    setLoading(true)
    try {
      await api.post('/staff-hr/training-modules', { moduleId, moduleName: MODULES.find(m => m.id === moduleId)?.title })
      setCompletions(p => ({ ...p, [moduleId]: true }))
      toast.success('Module completed!')
      setActiveModule(null)
    } catch { toast.error('Failed to save') }
    finally { setLoading(false) }
  }

  const totalCompleted = Object.values(completions).filter(Boolean).length
  const progress = Math.round((totalCompleted / MODULES.length) * 100)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-purple-600" /> Staff Training
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Learn how to use CompCare Hub</p>
        </div>
        <div className="flex items-center gap-4">
          <PrintButton />
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900 font-display">{totalCompleted}/{MODULES.length}</p>
            <p className="text-xs text-slate-400">modules completed</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-slate-700">Your progress</p>
          <p className="text-sm font-bold text-slate-900">{progress}%</p>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3">
          <div className="h-3 rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #e8b130, #d4961a)' }} />
        </div>
        {progress === 100 && (
          <div className="flex items-center gap-2 mt-3 text-emerald-700">
            <Award className="w-5 h-5" />
            <p className="text-sm font-semibold">All modules completed — well done!</p>
          </div>
        )}
      </div>

      {/* Module grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {MODULES.map((mod, idx) => {
          const done = completions[mod.id]
          const locked = idx > 0 && !completions[MODULES[idx - 1].id] && !done
          return (
            <div key={mod.id}
              className={`bg-white rounded-2xl border shadow-card p-5 transition-all ${done ? 'border-emerald-200' : locked ? 'border-slate-100 opacity-60' : 'border-slate-100 hover:border-slate-200 hover:shadow-card-hover cursor-pointer'}`}
              onClick={() => !locked && setActiveModule(mod)}
              style={!locked ? {cursor:'pointer'} : {}}>
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${done ? 'bg-emerald-50' : locked ? 'bg-slate-50' : 'bg-gold-50'}`}>
                  {done ? '✅' : locked ? '🔒' : mod.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 text-sm">{mod.title}</h3>
                    {done && <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-400 mb-2 line-clamp-2">{mod.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Play className="w-3 h-3" /> {mod.duration} · {mod.sections.length} sections
                    </span>
                    {!locked && !done && <ChevronRight className="w-4 h-4 text-slate-400" />}
                    {done && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-emerald-600 font-semibold">Completed</span>
                        <button onClick={e => { e.stopPropagation(); resetModule(mod.id) }}
                          className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 border border-slate-200 hover:border-rose-300 rounded-lg px-2 py-1 transition-colors">
                          <RotateCcw className="w-3 h-3" /> Reset
                        </button>
                      </div>
                    )}
                    {locked && <span className="text-xs text-slate-400">Complete previous module first</span>}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Module viewer modal */}
      {activeModule && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setActiveModule(null)} />
            <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-2xl z-10">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{activeModule.icon}</span>
                  <div>
                    <h2 className="font-semibold text-slate-900">{activeModule.title}</h2>
                    <p className="text-xs text-slate-400">{activeModule.duration} · {activeModule.sections.length} sections</p>
                  </div>
                </div>
                <button onClick={() => setActiveModule(null)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Section progress */}
              <div className="px-6 py-3 border-b border-slate-50 flex gap-1.5">
                {activeModule.sections.map((_, i) => (
                  <button key={i} onClick={() => setActiveSection(i)}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${i <= activeSection ? 'bg-gold-500' : 'bg-slate-200'}`}
                    style={i <= activeSection ? { background: 'linear-gradient(90deg, #e8b130, #d4961a)' } : {}} />
                ))}
              </div>

              {/* Content */}
              <div className="px-6 py-6">
                <h3 className="font-bold text-slate-900 text-lg mb-4">
                  {activeSection + 1}. {activeModule.sections[activeSection].title}
                </h3>
                <div className="bg-slate-50 rounded-2xl p-5 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {activeModule.sections[activeSection].content}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                <button onClick={() => setActiveSection(Math.max(0, activeSection - 1))}
                  disabled={activeSection === 0}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-colors">
                  ← Previous
                </button>
                <p className="text-xs text-slate-400">{activeSection + 1} of {activeModule.sections.length}</p>
                {activeSection < activeModule.sections.length - 1 ? (
                  <button onClick={() => setActiveSection(activeSection + 1)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-900 transition-colors"
                    style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)' }}>
                    Next →
                  </button>
                ) : (
                  <Button loading={loading} icon={<CheckCircle className="w-4 h-4" />}
                    onClick={() => completeModule(activeModule.id)}>
                    Mark as complete
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
