import React, { useState, useEffect, ReactNode } from 'react'
import NotificationsBell from './NotificationsBell'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useOfflineSync } from '../../hooks/useOfflineSync'
import { useTaskReminders } from '../../hooks/useTaskReminders'
import { useAppTheme, type AppTheme } from '../../hooks/useAppTheme'
import api from '../../api'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import {
  LayoutDashboard, Users, UserSquare, ClipboardList, FileText,
  ShieldAlert, Bell, Settings, LogOut, Menu, X,
  Activity, Calendar, Package, BookOpen, BarChart3, MessageSquare,
  Pill, CheckSquare, ChevronRight, ChevronDown, ClipboardCheck, CalendarRange, Palmtree, GraduationCap, ArrowLeftRight, FileCheck, QrCode,
  AlertTriangle, ShieldCheck, Boxes, Users2, Send, BarChart2, Shield,
  Wrench, Droplets, Target, History, Clock, UserCheck, Newspaper, Thermometer, Zap,
  Stethoscope, DollarSign, AlertCircle, ThumbsUp, Music,
  FileSignature, Search, Lock, Brain, WifiOff, RefreshCw, Scale, Sun, Moon
} from 'lucide-react'

const navSections = [
  {
    label: 'DASHBOARD', highlight: true,
    items: [
      { label: 'Dashboard',   to: '/dashboard',   icon: LayoutDashboard, roles: [], featureKey: 'dashboard' },
      { label: 'Inbox',       to: '/messages',    icon: MessageSquare,   roles: [], featureKey: 'messages' },
      { label: 'Tasks',       to: '/tasks',       icon: CheckSquare,     roles: ['care_staff', 'team_leader', 'senior_carer'], featureKey: 'tasks' },
      { label: 'Noticeboard', to: '/noticeboard', icon: Newspaper,       roles: [], featureKey: 'noticeboard' },
    ]
  },
  {
    label: 'SERVICE USERS', highlight: true,
    items: [
      { label: 'Residents',                        to: '/service-users',       icon: Users,         roles: [], featureKey: 'service_users' },
      { label: 'Support Plans',                    to: '/care-plans',          icon: FileText,      roles: [], featureKey: 'care_plans' },
      { label: 'Medication Risk Assessment',        to: '/medicine-risk',       icon: ShieldAlert,   roles: [], featureKey: 'medicine_risk' },
      { label: 'Other Risk Assessment',             to: '/risk-management',     icon: Shield,        roles: [], featureKey: 'risk_management' },
      { label: 'Medication Administration Record',  to: '/mar',                 icon: Pill,          roles: [], featureKey: 'mar' },
      { label: 'Medication Stock',                  to: '/medication-stock',    icon: Boxes,         roles: [], featureKey: 'medication_stock' },
      { label: 'Service User Outcome Reports',      to: '/outcomes',            icon: Target,        roles: [], featureKey: 'outcomes' },
      { label: 'Care Reviews',                      to: '/reviews',             icon: ClipboardCheck,roles: [], featureKey: 'reviews' },
      { label: 'Residents Health Check',             to: '/diary',               icon: BookOpen,      roles: [], featureKey: 'diary' },
      { label: 'Calendar',                          to: '/calendar',            icon: Calendar,      roles: [], featureKey: 'calendar' },
      { label: 'Safeguarding',                      to: '/safeguarding',        icon: ShieldCheck,   roles: [], featureKey: 'safeguarding' },
      { label: 'Incidents',                         to: '/incidents',           icon: AlertTriangle, roles: [], featureKey: 'incidents' },
      { label: 'Consents & Signatures',             to: '/consents',            icon: FileSignature, roles: [], featureKey: 'consents' },
      { label: 'Confidential Information',          to: '/confidential',        icon: Lock,          roles: [], featureKey: 'confidential' },
      { label: 'Capacity & Professionals',          to: '/capacity-professionals', icon: Brain,      roles: [], featureKey: 'capacity_professionals' },
      { label: 'Service User Audit',                to: '/audits',              icon: Activity,      roles: [], featureKey: 'audits' },
    ]
  },
  {
    label: 'CARE RECORD', highlight: true,
    items: [
      { label: 'Daily Records', to: '/daily-records', icon: ClipboardList, roles: [], featureKey: 'daily_records' },
    ]
  },
  {
    label: 'STAFF RECORDS', highlight: true,
    items: [
      { label: 'Staff Profile',          to: '/staff',                 icon: UserSquare,    roles: [], featureKey: 'staff' },
      { label: 'Staff Assessment',       to: '/assessments?tab=staff', icon: FileCheck,     roles: [], featureKey: 'staff_assessment' },
      { label: 'DBS Compliance',         to: '/dbs',                   icon: UserCheck,     roles: [], featureKey: 'dbs' },
      { label: 'Clock In',               to: '/clockin-admin',         icon: QrCode,        roles: [], featureKey: 'clockin' },
      { label: 'Staff Performance',      to: '/performance',           icon: BarChart3,     roles: [], featureKey: 'performance' },
      { label: 'Comp Care Hub Training', to: '/training',              icon: GraduationCap, roles: [], featureKey: 'training' },
    ]
  },
  {
    label: 'FAMILY PORTAL', highlight: true,
    items: [
      { label: 'Family Portal', to: '/family-portal', icon: Users2, roles: [], featureKey: 'family_portal' },
    ]
  },
  {
    label: 'QUALITY ASSURANCE', highlight: true,
    items: [
      { label: 'Compliance',               to: '/compliance',        icon: ShieldCheck, roles: [], featureKey: 'compliance' },
      { label: 'Complaints & Compliments', to: '/complaints',        icon: ThumbsUp,    roles: [], featureKey: 'complaints' },
      { label: 'Audit Trail',              to: '/audit-trail',       icon: History,     roles: [], featureKey: 'audit_trail' },
      { label: 'Reports',                  to: '/reports',           icon: BarChart2,   roles: [], featureKey: 'reports' },
      { label: 'CQC Alerts',              to: '/cqc-notifications', icon: AlertCircle, roles: [], featureKey: 'cqc_notifications' },
    ]
  },
  {
    label: 'AI FEATURES', highlight: true,
    items: [
      { label: 'AI Assistant', to: '/ai-assistant', icon: Brain, roles: [], featureKey: 'ai_assistant' },
    ]
  },
  {
    label: 'RECRUITMENT', highlight: true,
    items: [
      { label: 'Recruitment', to: '/recruitment', icon: UserCheck, roles: [], featureKey: 'recruitment' },
    ]
  },
  {
    label: 'OPERATIONS', highlight: true,
    items: [
      { label: 'Tasks',              to: '/tasks',             icon: CheckSquare,   roles: ['home_manager', 'group_admin', 'deputy_manager', 'admin', 'director', 'registered_manager', 'service_manager', 'auditor'], featureKey: 'tasks' },
      { label: 'Rota',               to: '/rota',              icon: CalendarRange, roles: [], featureKey: 'rota' },
      { label: 'Timesheets',         to: '/timesheets',        icon: Clock,         roles: [], featureKey: 'timesheets' },
      { label: 'Leave & Holidays',   to: '/holidays',          icon: Palmtree,      roles: [], featureKey: 'holidays' },
      { label: 'Invoicing',          to: '/invoicing',         icon: DollarSign,    roles: [], featureKey: 'invoicing' },
      { label: 'Maintenance',        to: '/maintenance',       icon: Wrench,        roles: [], featureKey: 'maintenance' },
      { label: 'Clock In Analytics', to: '/clockin-analytics', icon: BarChart2,     roles: [], featureKey: 'clockin_analytics' },
      { label: 'Alerts',             to: '/alerts',            icon: Bell,          roles: [], featureKey: 'alerts' },
      { label: 'Notifications',      to: '/notifications',     icon: Send,          roles: [], featureKey: 'notifications' },
      { label: 'PPE Stock',          to: '/ppe',               icon: Package,       roles: [], featureKey: 'ppe' },
    ]
  },
  {
    label: 'CLINICAL MONITORING', highlight: true,
    items: [
      { label: 'Fluid Balance',       to: '/fluid-balance',      icon: Droplets,      roles: [], featureKey: 'fluid_balance' },
      { label: 'Weight Tracker',      to: '/weight-tracker',     icon: Activity,      roles: [], featureKey: 'weight_tracker' },
      { label: 'Wound Care',          to: '/wound-care',         icon: Stethoscope,   roles: [], featureKey: 'wound_care' },
      { label: 'PEEP Plans',          to: '/peep',               icon: Zap,           roles: [], featureKey: 'peep' },
      { label: 'Hospital Admissions', to: '/hospital-admissions',icon: Activity,      roles: [], featureKey: 'hospital_admissions' },
      { label: 'Barthel Index',       to: '/assessments/barthel', icon: FileCheck,     roles: [], featureKey: 'barthel' },
      { label: 'MUST Score',          to: '/assessments/must',    icon: Scale,         roles: [], featureKey: 'must_score' },
      { label: 'NEWS2 Score',         to: '/clinical/news2',          icon: Activity,      roles: [], featureKey: 'news2' },
      { label: 'Waterlow / Turns',    to: '/clinical/waterlow',       icon: Shield,        roles: [], featureKey: 'waterlow' },
      { label: 'Abbey Pain Scale',    to: '/clinical/abbey-pain',     icon: Brain,         roles: [], featureKey: 'abbey_pain' },
      { label: 'Body Map',            to: '/clinical/body-map',       icon: Stethoscope,   roles: [], featureKey: 'body_map' },
      { label: 'ABC Behaviour',       to: '/clinical/abc-chart',      icon: AlertCircle,   roles: [], featureKey: 'abc_chart' },
      { label: 'Blood Glucose',       to: '/clinical/blood-glucose',  icon: Droplets,      roles: [], featureKey: 'blood_glucose' },
      { label: 'Oral Hygiene',        to: '/clinical/oral-hygiene',   icon: Thermometer,   roles: [], featureKey: 'oral_hygiene' },
      { label: 'Catheter Care',       to: '/clinical/catheter-care',  icon: Zap,           roles: [], featureKey: 'catheter_care' },
      { label: 'End of Life',         to: '/clinical/end-of-life',    icon: BookOpen,      roles: [], featureKey: 'end_of_life' },
      { label: 'GP / Referrals',      to: '/clinical/gp-referrals',   icon: ClipboardList, roles: [], featureKey: 'gp_referrals' },
    ]
  },
  {
    label: 'CAPACITY & OPERATIONS', highlight: true,
    items: [
      { label: 'Bed Occupancy',       to: '/bed-occupancy',      icon: LayoutDashboard, roles: [], featureKey: 'bed_occupancy' },
      { label: 'Waiting List',        to: '/waiting-list',       icon: Users,           roles: [], featureKey: 'waiting_list' },
      { label: 'Visitor Log',         to: '/visitor-log',        icon: Users2,          roles: [], featureKey: 'visitor_log' },
      { label: 'Contractor Register', to: '/contractors',        icon: Wrench,          roles: [], featureKey: 'contractors' },
      { label: 'External Contacts',   to: '/external-contacts',  icon: Users,           roles: [], featureKey: 'external_contacts' },
      { label: 'Environmental Checks',to: '/environmental-checks',icon: Thermometer,    roles: [], featureKey: 'environmental' },
    ]
  },
  {
    label: 'HR & DEVELOPMENT', highlight: true,
    items: [
      { label: 'Staff Absence',      to: '/staff-absence',      icon: UserSquare,    roles: [], featureKey: 'staff_absence' },
      { label: 'Training Matrix',    to: '/training-matrix',    icon: GraduationCap, roles: [], featureKey: 'training_matrix' },
    ]
  },
  {
    label: 'GOVERNANCE', highlight: true,
    items: [
      { label: 'Lessons Learned',    to: '/lessons-learned',    icon: BookOpen,      roles: [], featureKey: 'lessons_learned' },
      { label: 'CQC Mock Inspection',to: '/cqc-inspection',     icon: Shield,        roles: [], featureKey: 'cqc_inspection' },
      { label: 'CQC Evidence Pack',  to: '/cqc/evidence-pack',  icon: FileText,      roles: [], featureKey: 'evidence_pack' },
    ]
  },
  {
    label: 'POLICIES', highlight: true,
    items: [
      { label: 'Policies', to: '/policies', icon: BookOpen, roles: [], featureKey: 'policies' },
    ]
  },
  {
    label: 'SETTINGS', highlight: true,
    items: [
      { label: 'Settings', to: '/settings', icon: Settings, roles: ['group_admin'], featureKey: 'settings' },
    ]
  },
  {
    label: '',
    items: [
      { label: 'Admin Accounts', to: '/admin/accounts', icon: Shield, roles: ['group_admin'], featureKey: 'admin' },
    ]
  }
]

// Flat list of all nav items used for mobile header title lookup
const allNavItems = navSections.flatMap(s => s.items) as any[]

interface SidebarProps {
  user: { id?: string; firstName?: string; lastName?: string; role?: string; featureFlags?: Record<string, boolean>; photoUrl?: string | null } | null
  logout: () => void
  isRole: (...roles: string[]) => boolean
  onNavClick: () => void
  theme: AppTheme
  toggleTheme: () => void
}

function SidebarSearch({ onNavClick }: { onNavClick: () => void }) {
  const [q, setQ] = React.useState('')
  const navigate = useNavigate()
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (q.trim().length >= 2) { navigate(`/search?q=${encodeURIComponent(q.trim())}`); onNavClick(); setQ('') }
  }
  return (
    <form onSubmit={submit} className="px-3 mb-3">
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/8 focus-within:border-amber-500/40 transition-colors">
        <Search className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
        <input
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="Search…"
          className="flex-1 bg-transparent text-sm text-slate-300 placeholder-slate-600 outline-none min-w-0"
        />
      </div>
    </form>
  )
}

// Dashboard (Dashboard/Inbox/Noticeboard) always stays expanded — it's the first
// thing staff see on login and should never be collapsed by default.
const COLLAPSIBLE_SECTIONS = new Set(navSections.map(s => s.label).filter(l => l && l !== 'DASHBOARD'))

function Sidebar({ user, logout, isRole, onNavClick, theme, toggleTheme }: SidebarProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(COLLAPSIBLE_SECTIONS))
  const toggleSection = (label: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label); else next.add(label)
      return next
    })
  }
  return (
    <div className="flex flex-col h-full" style={{ background: '#000000' }}>
      <div className="px-5 pb-4" style={{ paddingTop: 'max(24px, env(safe-area-inset-top))' }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="Comprehensive Care Service" className="w-10 h-10 rounded-xl object-contain shadow-lg flex-shrink-0" style={{ background: 'white', padding: '3px' }} />
            <div>
              <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.2, color: '#e8b130' }}>Comprehensive<br />Care Service</h1>
            </div>
          </div>
          <NotificationsBell align="left" />
        </div>
      </div>

      <div className="mx-5 mb-3 h-px" style={{ background: 'linear-gradient(90deg, rgba(232,177,48,0.6) 0%, rgba(232,177,48,0.15) 100%)' }} />

      <SidebarSearch onNavClick={onNavClick} />

      <nav className="flex-1 overflow-y-auto px-3 space-y-4 pb-4">
        {navSections.map((section, si) => {
          const visible = section.items.filter(item => {
            if (item.roles.length > 0 && !item.roles.some(r => isRole(r))) return false
            if ((item as any).featureKey && !isRole('group_admin') && user?.featureFlags?.[(item as any).featureKey] === false) return false
            return true
          })
          if (!visible.length) return null
          const isCollapsible = COLLAPSIBLE_SECTIONS.has(section.label)
          const isOpen = !collapsed.has(section.label)
          return (
            <div key={si}>
              {section.label && (
                isCollapsible ? (
                  <button onClick={() => toggleSection(section.label)}
                    className="flex items-center gap-1.5 mb-1.5 px-2 py-1 rounded-full text-xs font-bold tracking-widest bg-amber-400/15 text-amber-400 hover:bg-amber-400/25 transition-colors">
                    {section.label}
                    <ChevronDown className={clsx('w-3 h-3 transition-transform', isOpen && 'rotate-180')} />
                  </button>
                ) : (
                  <p className={`px-3 mb-1.5 text-xs font-bold tracking-widest ${(section as any).highlight ? 'text-amber-400' : 'text-slate-500'}`}>
                    {section.label}
                  </p>
                )
              )}
              {(!isCollapsible || isOpen) && (
              <div className="space-y-0.5">
                {visible.map(item => {
                  const Icon = item.icon
                  return (
                    <NavLink key={item.to} to={item.to} onClick={onNavClick}
                      className={({ isActive }) => clsx(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
                        isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                      )}
                      style={({ isActive }) => isActive ? { background: 'linear-gradient(135deg, rgba(212,150,26,0.2) 0%, rgba(212,150,26,0.08) 100%)', border: '1px solid rgba(212,150,26,0.25)' } : {}}>
                      {({ isActive }) => (
                        <>
                          <Icon className={clsx('w-4 h-4 flex-shrink-0 transition-colors', isActive ? 'text-gold-400' : 'text-slate-500 group-hover:text-slate-300')} />
                          <span className="flex-1 text-sm">{item.label}</span>
                          {isActive && <ChevronRight className="w-3.5 h-3.5 text-gold-400/60" />}
                        </>
                      )}
                    </NavLink>
                  )
                })}
              </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="border-t border-white/8 p-4">
        <NavLink to={user?.id ? `/staff/${user.id}/edit` : '#'}
          className="flex items-center gap-3 mb-3 px-1 py-1.5 rounded-xl hover:bg-white/8 transition-all duration-150 group cursor-pointer">
          {user?.photoUrl ? (
            <img src={user.photoUrl} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-2 ring-amber-500/30" />
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm text-slate-900" style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)' }}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate leading-tight">{user?.firstName} {user?.lastName}</p>
            <p className="text-slate-500 text-xs capitalize leading-tight mt-0.5 group-hover:text-slate-400">{user?.role?.replace(/_/g, ' ')} · <span className="text-gold-400/70 group-hover:text-gold-400">edit profile</span></p>
          </div>
        </NavLink>
        <button onClick={toggleTheme}
          className="flex items-center gap-2 w-full px-3 py-2 mb-1 text-slate-500 hover:text-amber-400 hover:bg-white/5 rounded-xl text-sm transition-all duration-150 font-medium">
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <button onClick={logout} className="flex items-center gap-2 w-full px-3 py-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/8 rounded-xl text-sm transition-all duration-150 font-medium">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </div>
  )
}

function OfflineBanner() {
  const { isOnline, pendingCount, syncNow } = useOfflineSync()

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white" style={{ background: '#b91c1c' }}>
        <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
        <span>No connection — changes saved locally</span>
      </div>
    )
  }

  if (pendingCount > 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-amber-900" style={{ background: '#fef3c7', borderBottom: '1px solid #fbbf24' }}>
        <RefreshCw className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{pendingCount} record{pendingCount > 1 ? 's' : ''} pending sync</span>
        <button
          onClick={syncNow}
          className="ml-2 px-2 py-0.5 rounded bg-amber-500 text-white hover:bg-amber-600 transition-colors font-semibold"
        >
          Sync now
        </button>
      </div>
    )
  }

  return null
}

// Bottom nav tab definitions
const bottomNavTabs = [
  { label: 'Home',      to: '/dashboard',    icon: LayoutDashboard },
  { label: 'Residents', to: '/service-users', icon: Users },
  { label: 'Records',   to: '/daily-records', icon: ClipboardList },
  { label: 'MAR',       to: '/mar',           icon: Pill },
]

interface MobileBottomNavProps {
  menuOpen: boolean
  onMenuToggle: () => void
}

function MobileBottomNav({ menuOpen, onMenuToggle }: MobileBottomNavProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const handleTabClick = (to: string) => {
    navigate(to)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const isTabActive = (to: string) => {
    if (to === '/dashboard') return location.pathname === '/dashboard'
    return location.pathname.startsWith(to)
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch"
      style={{
        background: 'rgba(13, 21, 38, 0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom, 12px)',
      }}
    >
      {bottomNavTabs.map(tab => {
        const active = isTabActive(tab.to)
        const Icon = tab.icon
        return (
          <button
            key={tab.to}
            onClick={() => handleTabClick(tab.to)}
            style={{
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
              color: active ? '#e8b130' : 'rgba(255,255,255,0.4)',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: '8px',
              paddingBottom: '6px',
              minHeight: '60px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              gap: '3px',
            }}
            className="active:scale-95 transition-transform duration-75"
          >
            {/* Active indicator pill */}
            <span
              style={{
                position: 'absolute',
                top: '4px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '24px',
                height: '3px',
                borderRadius: '99px',
                background: active ? '#e8b130' : 'transparent',
                transition: 'background 0.2s',
              }}
            />
            <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
            <span style={{ fontSize: '10px', fontWeight: 500, lineHeight: 1 }}>{tab.label}</span>
          </button>
        )
      })}

      {/* More tab — toggles sidebar drawer */}
      <button
        onClick={onMenuToggle}
        style={{
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
          color: menuOpen ? '#e8b130' : 'rgba(255,255,255,0.4)',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '8px',
          paddingBottom: '6px',
          minHeight: '60px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          gap: '3px',
        }}
        className="active:scale-95 transition-transform duration-75"
      >
        <span
          style={{
            position: 'absolute',
            top: '4px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '24px',
            height: '3px',
            borderRadius: '99px',
            background: menuOpen ? '#e8b130' : 'transparent',
            transition: 'background 0.2s',
          }}
        />
        {menuOpen ? <X size={22} strokeWidth={2.2} /> : <Menu size={22} strokeWidth={1.8} />}
        <span style={{ fontSize: '10px', fontWeight: 500, lineHeight: 1 }}>More</span>
      </button>
    </nav>
  )
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout, isRole } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [clockedIn, setClockedIn] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useAppTheme()
  useTaskReminders(!!user)

  // Managers/admins don't clock in via QR, so they aren't gated on shift status.
  const mustClockOutBeforeSignOut = !isRole('home_manager', 'group_admin')

  useEffect(() => {
    if (!user || !mustClockOutBeforeSignOut) { setClockedIn(false); return }
    api.get('/clockin/status').then(res => setClockedIn(!!res.data.data?.clockedIn)).catch(() => {})
  }, [user, mustClockOutBeforeSignOut])

  const guardedLogout = () => {
    if (mustClockOutBeforeSignOut && clockedIn) {
      toast.error('Please clock out before signing out — clock out first, then you can end your session.')
      return
    }
    logout()
  }

  const pageTitle = allNavItems.find(item => location.pathname.startsWith(item.to) && item.to !== '/dashboard')?.label
    ?? (location.pathname === '/dashboard' ? 'Dashboard' : 'CompCare Hub')

  const sidebarProps: SidebarProps = { user, logout: guardedLogout, isRole, onNavClick: () => setMobileOpen(false), theme, toggleTheme }
  const contentBg = theme === 'dark' ? '#0a0a0a' : '#f8f7fb'

  return (
    <div className={clsx('app-shell flex h-screen overflow-hidden', theme === 'dark' && 'theme-dark')} style={{ background: contentBg }}>
      {/* Desktop sidebar — hidden on mobile */}
      <aside className="no-print hidden lg:flex flex-col w-64 flex-shrink-0" style={{ boxShadow: '4px 0 24px rgba(0,0,0,0.6), 2px 0 0 rgba(232,177,48,0.15)' }}>
        <Sidebar {...sidebarProps} />
      </aside>

      {/* Mobile sidebar drawer */}
      <div
        className="lg:hidden fixed inset-0 z-50 flex pointer-events-none"
        style={{ visibility: mobileOpen ? 'visible' : 'hidden' }}
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-280"
          style={{ opacity: mobileOpen ? 1 : 0, pointerEvents: mobileOpen ? 'auto' : 'none' }}
          onClick={() => setMobileOpen(false)}
        />
        {/* Drawer panel */}
        <div
          className="relative w-72 flex flex-col z-10 shadow-2xl pointer-events-auto"
          style={{
            transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
          }}
        >
          <button
            onClick={() => setMobileOpen(false)}
            style={{ top: 'max(16px, env(safe-area-inset-top))', WebkitTapHighlightColor: 'transparent' }}
            className="absolute right-4 text-white/50 hover:text-white z-20 p-1"
          >
            <X className="w-5 h-5" />
          </button>
          <Sidebar {...sidebarProps} />
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top header — fixed, 56px tall */}
        <header
          className="no-print md:hidden fixed top-0 left-0 right-0 z-40 flex items-center px-4 gap-3"
          style={{
            height: '56px',
            paddingTop: 'env(safe-area-inset-top, 0px)',
            background: 'rgba(13, 21, 38, 0.97)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(232,177,48,0.2)',
          }}
        >
          {/* Logo + name */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <img
              src="/logo.jpeg"
              alt=""
              className="w-7 h-7 rounded-lg object-contain flex-shrink-0"
              style={{ background: 'white', padding: '2px' }}
            />
            <span
              className="text-sm font-bold truncate"
              style={{ color: '#e8b130', fontFamily: 'Georgia, serif' }}
            >
              CompCare Hub
            </span>
          </div>

          {/* Search button */}
          <button
            onClick={() => navigate('/search')}
            className="p-1.5 text-slate-400 hover:text-white transition-colors flex-shrink-0"
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Notifications bell */}
          <div className="flex-shrink-0">
            <NotificationsBell />
          </div>

          {/* User avatar initials */}
          <button
            onClick={() => navigate(user?.id ? `/staff/${user.id}/edit` : '#')}
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-slate-900 active:scale-95 transition-transform"
            style={{
              background: 'linear-gradient(135deg, #e8b130, #d4961a)',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
            }}
            aria-label="My profile"
          >
            {user?.firstName?.[0] ?? '?'}
          </button>

          {/* Sign out */}
          <button
            onClick={guardedLogout}
            className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors flex-shrink-0"
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
            aria-label="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Desktop header is hidden on mobile; desktop uses sidebar only — no top header needed on lg+ */}

        <OfflineBanner />

        {/* Main content — padded top for fixed mobile header, padded bottom for bottom nav */}
        <main
          className="flex-1 overflow-y-auto pb-safe"
          style={{
            background: contentBg,
            // Mobile: top padding for 56px fixed header, bottom padding for 60px nav + safe area
            // Desktop (md+): no extra padding needed (sidebar is static)
          }}
        >
          {/* Invisible spacer for mobile fixed header */}
          <div
            className="md:hidden"
            style={{ height: 'calc(56px + env(safe-area-inset-top, 0px))' }}
          />
          {children}
          {/* Invisible spacer for mobile bottom nav */}
          <div
            className="md:hidden"
            style={{ height: 'calc(60px + env(safe-area-inset-bottom, 0px))' }}
          />
        </main>
      </div>

      {/* Mobile bottom navigation bar */}
      <MobileBottomNav menuOpen={mobileOpen} onMenuToggle={() => setMobileOpen(prev => !prev)} />
    </div>
  )
}

// Force new build hash 1780007443458
