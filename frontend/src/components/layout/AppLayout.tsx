import React, { useState, ReactNode } from 'react'
import NotificationsBell from './NotificationsBell'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import clsx from 'clsx'
import {
  LayoutDashboard, Users, UserSquare, ClipboardList, FileText,
  ShieldAlert, Bell, Settings, LogOut, Menu, X,
  Activity, Calendar, Package, BookOpen, BarChart3, MessageSquare,
  Pill, CheckSquare, Star, ChevronRight, ClipboardCheck, CalendarRange, Palmtree, GraduationCap, ArrowLeftRight, Search, FileCheck, QrCode,
  AlertTriangle, TrendingUp, ShieldCheck, Boxes, Users2, Send, BarChart2, Shield,
  Wrench, Droplets, Target, History, Clock, UserCheck, Newspaper, Thermometer, Zap,
  Stethoscope
} from 'lucide-react'

const navSections = [
  {
    label: 'Care',
    items: [
      { label: 'Dashboard',        to: '/dashboard',          icon: LayoutDashboard, roles: [],                                              featureKey: 'dashboard' },
      { label: 'Inbox',            to: '/messages',           icon: MessageSquare,   roles: [],                                              featureKey: 'messages' },
      { label: 'Noticeboard',      to: '/noticeboard',        icon: Newspaper,       roles: [],                                              featureKey: 'noticeboard' },
      { label: 'Service Users',    to: '/service-users',      icon: Users,           roles: [],                                              featureKey: 'service_users' },
      { label: 'Daily Records',    to: '/daily-records',      icon: ClipboardList,   roles: [],                                              featureKey: 'daily_records' },
      { label: 'Resident Diary',   to: '/diary',              icon: BookOpen,        roles: [],                                              featureKey: 'diary' },
      { label: 'Prof. Visits',     to: '/professional-visits',icon: Stethoscope,     roles: [],                                              featureKey: 'professional_visits' },
      { label: 'MAR Chart',        to: '/mar',                icon: Pill,            roles: [],                                              featureKey: 'mar' },
      { label: 'Medication Stock', to: '/medication-stock',   icon: Boxes,           roles: ['home_manager','group_admin','senior_carer'],    featureKey: 'medication_stock' },
      { label: 'Support Plans',    to: '/care-plans',         icon: FileText,        roles: [],                                              featureKey: 'care_plans' },
      { label: 'Safeguarding',     to: '/safeguarding',       icon: ShieldAlert,     roles: [],                                              featureKey: 'safeguarding' },
      { label: 'Incidents',        to: '/incidents',          icon: AlertTriangle,   roles: [],                                              featureKey: 'incidents' },
    ]
  },
  {
    label: 'Operations',
    items: [
      { label: 'Tasks',            to: '/tasks',              icon: CheckSquare,     roles: [],                                              featureKey: 'tasks' },
      { label: 'Rota',             to: '/rota',               icon: CalendarRange,   roles: ['home_manager','group_admin','senior_carer'],    featureKey: 'rota' },
      { label: 'Timesheets',       to: '/timesheets',         icon: Clock,           roles: ['home_manager','group_admin','senior_carer'],    featureKey: 'timesheets' },
      { label: 'Holidays',         to: '/holidays',           icon: Palmtree,        roles: ['home_manager','group_admin'],                   featureKey: 'holidays' },
      { label: 'Hub Training',      to: '/training',           icon: GraduationCap,   roles: [],                                              featureKey: 'training' },
      { label: 'Staff',            to: '/staff',              icon: UserSquare,      roles: ['home_manager','group_admin'],                   featureKey: 'staff' },
      { label: 'DBS & Compliance', to: '/dbs',                icon: UserCheck,       roles: ['home_manager','group_admin'],                   featureKey: 'dbs' },
      { label: 'Maintenance',      to: '/maintenance',        icon: Wrench,          roles: [],                                              featureKey: 'maintenance' },
      { label: 'Clock-In',         to: '/clockin-admin',      icon: QrCode,          roles: ['home_manager','group_admin'],                   featureKey: 'clockin' },
      { label: 'Clock Analytics',  to: '/clockin-analytics',  icon: BarChart2,       roles: ['home_manager','group_admin'],                   featureKey: 'clockin_analytics' },
      { label: 'Calendar',         to: '/calendar',           icon: Calendar,        roles: ['home_manager','group_admin'],                   featureKey: 'calendar' },
      { label: 'Alerts',           to: '/alerts',             icon: Bell,            roles: [],                                              featureKey: 'alerts' },
      { label: 'Notifications',    to: '/notifications',      icon: Send,            roles: ['home_manager','group_admin'],                   featureKey: 'notifications' },
    ]
  },
  {
    label: 'Quality & Compliance',
    items: [
      { label: 'Compliance',       to: '/compliance',         icon: ShieldCheck,     roles: ['home_manager','group_admin','auditor'],         featureKey: 'compliance' },
      { label: 'Bath Chart',       to: '/bath-chart',         icon: Droplets,        roles: [],                                              featureKey: 'bath_chart' },
      { label: 'Observations',     to: '/observations',       icon: Thermometer,     roles: [],                                              featureKey: 'observations' },
      { label: 'Seizure Log',      to: '/seizures',           icon: Zap,             roles: [],                                              featureKey: 'seizures' },
      { label: 'Bowel Chart',      to: '/bowel-chart',        icon: Droplets,        roles: [],                                              featureKey: 'bowel_chart' },
      { label: 'Medicine Risk',    to: '/medicine-risk',      icon: ShieldAlert,     roles: [],                                              featureKey: 'medicine_risk' },
      { label: 'Risk Management',  to: '/risk-management',    icon: Shield,          roles: [],                                              featureKey: 'risk_management' },
      { label: 'Performance',      to: '/performance',        icon: BarChart3,       roles: ['home_manager','group_admin'],                   featureKey: 'performance' },
      { label: 'Care Outcomes',    to: '/outcomes',           icon: Target,          roles: [],                                              featureKey: 'outcomes' },
      { label: 'Reviews',          to: '/reviews',            icon: ClipboardCheck,  roles: [],                                              featureKey: 'reviews' },
      { label: 'Audit',            to: '/assessments',        icon: FileCheck,       roles: [],                                              featureKey: 'assessments' },
      { label: 'Quality Assurance', to: '/quality',            icon: Star,            roles: ['home_manager','group_admin'],                   featureKey: 'quality' },
      { label: 'Handover',         to: '/reports/handover',   icon: ArrowLeftRight,  roles: [],                                              featureKey: 'handover' },
      { label: 'Audit Reports',    to: '/audits',             icon: Activity,        roles: ['home_manager','group_admin','auditor'],         featureKey: 'audits' },
      { label: 'Audit Trail',      to: '/audit-trail',        icon: History,         roles: ['home_manager','group_admin','auditor'],         featureKey: 'audit_trail' },
      { label: 'Reports',          to: '/reports',            icon: BarChart3,       roles: ['home_manager','group_admin'],                   featureKey: 'reports' },
      { label: 'Policies',         to: '/policies',           icon: BookOpen,        roles: [],                                              featureKey: 'policies' },
      { label: 'PPE Stock',        to: '/ppe',                icon: Package,         roles: ['home_manager','group_admin'],                   featureKey: 'ppe' },
      { label: 'Family Portal',    to: '/family-portal',      icon: Users2,          roles: ['home_manager','group_admin'],                   featureKey: 'family_portal' },
      { label: 'Settings',         to: '/settings',           icon: Settings,        roles: ['group_admin'] },
      { label: 'Admin Accounts',   to: '/admin/accounts',     icon: Shield,          roles: ['group_admin'] },
    ]
  }
]

// Flat list of all nav items used for mobile header title lookup
const allNavItems = navSections.flatMap(s => s.items)

interface SidebarProps {
  user: { id?: string; firstName?: string; lastName?: string; role?: string; featureFlags?: Record<string, boolean> } | null
  logout: () => void
  isRole: (...roles: string[]) => boolean
  onNavClick: () => void
}

function Sidebar({ user, logout, isRole, onNavClick }: SidebarProps) {
  return (
    <div className="flex flex-col h-full" style={{ background: '#000000' }}>
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="Comprehensive Care Service" className="w-10 h-10 rounded-xl object-contain shadow-lg flex-shrink-0" style={{ background: 'white', padding: '3px' }} />
            <div>
              <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.2, color: '#e8b130' }}>Comprehensive<br />Care Service</h1>
            </div>
          </div>
          <NotificationsBell />
        </div>
      </div>

      <div className="mx-5 mb-4 h-px" style={{ background: 'linear-gradient(90deg, rgba(232,177,48,0.6) 0%, rgba(232,177,48,0.15) 100%)' }} />

      <nav className="flex-1 overflow-y-auto px-3 space-y-4 pb-4">
        {navSections.map(section => {
          const visible = section.items.filter(item => {
            if (item.roles.length > 0 && !item.roles.some(r => isRole(r))) return false
            if ((item as any).featureKey && !isRole('group_admin') && user?.featureFlags?.[(item as any).featureKey] === false) return false
            return true
          })
          if (!visible.length) return null
          return (
            <div key={section.label}>
              <p className="px-3 mb-1.5 text-xs font-bold uppercase tracking-widest text-slate-600">{section.label}</p>
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
            </div>
          )
        })}
      </nav>

      <div className="border-t border-white/8 p-4">
        <NavLink to={user?.id ? `/staff/${user.id}/edit` : '#'}
          className="flex items-center gap-3 mb-3 px-1 py-1.5 rounded-xl hover:bg-white/8 transition-all duration-150 group cursor-pointer">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm text-slate-900" style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)' }}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate leading-tight">{user?.firstName} {user?.lastName}</p>
            <p className="text-slate-500 text-xs capitalize leading-tight mt-0.5 group-hover:text-slate-400">{user?.role?.replace(/_/g, ' ')} · <span className="text-gold-400/70 group-hover:text-gold-400">edit profile</span></p>
          </div>
        </NavLink>
        <button onClick={logout} className="flex items-center gap-2 w-full px-3 py-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/8 rounded-xl text-sm transition-all duration-150 font-medium">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </div>
  )
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout, isRole } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const pageTitle = allNavItems.find(item => location.pathname.startsWith(item.to) && item.to !== '/dashboard')?.label
    ?? (location.pathname === '/dashboard' ? 'Dashboard' : 'CompCare Hub')

  const sidebarProps: SidebarProps = { user, logout, isRole, onNavClick: () => setMobileOpen(false) }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0a0a0a' }}>
      <aside className="no-print hidden lg:flex flex-col w-64 flex-shrink-0" style={{ boxShadow: '4px 0 24px rgba(0,0,0,0.6), 2px 0 0 rgba(232,177,48,0.15)' }}>
        <Sidebar {...sidebarProps} />
      </aside>
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 flex flex-col z-10 shadow-2xl">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white z-20 p-1"><X className="w-5 h-5" /></button>
            <Sidebar {...sidebarProps} />
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="no-print lg:hidden px-4 py-3 flex items-center gap-3" style={{ background: '#111', borderBottom: '1px solid rgba(232,177,48,0.2)' }}>
          <button onClick={() => setMobileOpen(true)} style={{ color: '#e8b130' }} className="p-1"><Menu className="w-5 h-5" /></button>
          <img src="/logo.jpeg" alt="" className="w-7 h-7 rounded-lg object-contain" style={{ background: 'white', padding: '2px' }} />
          <span className="text-base flex-1 truncate font-bold" style={{ color: '#e8b130', fontFamily: 'Georgia, serif' }}>{pageTitle}</span>
          <NotificationsBell />
        </header>
        <main className="flex-1 overflow-y-auto" style={{ background: '#0a0a0a' }}>{children}</main>
      </div>
    </div>
  )
}
