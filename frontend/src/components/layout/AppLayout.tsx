import React, { useState, ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import clsx from 'clsx'
import {
  LayoutDashboard, Users, UserSquare, ClipboardList, FileText,
  ShieldAlert, Bell, Settings, LogOut, Menu, X,
  Activity, Calendar, Package, BookOpen, BarChart3, MessageSquare
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard',      to: '/dashboard',      icon: 'LayoutDashboard', roles: [] },
  { label: 'Service Users',  to: '/service-users',  icon: 'Users',           roles: [] },
  { label: 'Daily Records',  to: '/daily-records',  icon: 'ClipboardList',   roles: [] },
  { label: 'Care Plans',     to: '/care-plans',     icon: 'FileText',        roles: [] },
  { label: 'Safeguarding',   to: '/safeguarding',   icon: 'ShieldAlert',     roles: [] },
  { label: 'Staff',          to: '/staff',          icon: 'UserSquare',      roles: ['home_manager','group_admin'] },
  { label: 'Calendar',       to: '/calendar',       icon: 'Calendar',        roles: ['home_manager','group_admin'] },
  { label: 'Audits',         to: '/audits',         icon: 'Activity',        roles: ['home_manager','group_admin','auditor'] },
  { label: 'Reports',        to: '/reports',        icon: 'BarChart3',       roles: ['home_manager','group_admin'] },
  { label: 'Policies',       to: '/policies',       icon: 'BookOpen',        roles: [] },
  { label: 'PPE Stock',      to: '/ppe',            icon: 'Package',         roles: ['home_manager','group_admin'] },
  { label: 'Messages',       to: '/messages',       icon: 'MessageSquare',   roles: [] },
  { label: 'Alerts',         to: '/alerts',         icon: 'Bell',            roles: [] },
  { label: 'Settings',       to: '/settings',       icon: 'Settings',        roles: ['group_admin'] },
]

const iconMap: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard className="w-5 h-5" />,
  Users:           <Users className="w-5 h-5" />,
  UserSquare:      <UserSquare className="w-5 h-5" />,
  ClipboardList:   <ClipboardList className="w-5 h-5" />,
  FileText:        <FileText className="w-5 h-5" />,
  ShieldAlert:     <ShieldAlert className="w-5 h-5" />,
  Activity:        <Activity className="w-5 h-5" />,
  Calendar:        <Calendar className="w-5 h-5" />,
  Package:         <Package className="w-5 h-5" />,
  BookOpen:        <BookOpen className="w-5 h-5" />,
  BarChart3:       <BarChart3 className="w-5 h-5" />,
  MessageSquare:   <MessageSquare className="w-5 h-5" />,
  Bell:            <Bell className="w-5 h-5" />,
  Settings:        <Settings className="w-5 h-5" />,
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout, isRole } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const visibleNav = navItems.filter(item =>
    item.roles.length === 0 || item.roles.some(r => isRole(r))
  )

  const Sidebar = () => (
    <div className="flex flex-col h-full" style={{ background: 'linear-gradient(180deg, #3b0764 0%, #4C1D95 100%)' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
        <img src="/logo.jpeg" alt="CompCare Hub" className="w-10 h-10 rounded-lg object-contain bg-white p-0.5 flex-shrink-0" />
        <div>
          <h1 className="text-white font-bold text-base leading-tight">CompCare Hub</h1>
          <p className="text-purple-300 text-xs mt-0.5">Your Care Our Priority</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {visibleNav.map(item => (
          <NavLink key={item.to} to={item.to} onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive ? 'bg-white/15 text-white' : 'text-purple-200 hover:bg-white/8 hover:text-white'
            )}>
            <span className="flex-shrink-0">{iconMap[item.icon]}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-purple-300 text-xs capitalize">{user?.role?.replace(/_/g, ' ')}</p>
          </div>
        </div>
        <button onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 text-purple-200 hover:text-white hover:bg-white/10 rounded-lg text-sm transition-colors">
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-64 flex flex-col z-10">
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 text-white z-20">
              <X className="w-5 h-5" />
            </button>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600">
            <Menu className="w-6 h-6" />
          </button>
          <img src="/logo.jpeg" alt="" className="w-7 h-7 rounded object-contain" />
          <span className="font-bold text-purple-900">CompCare Hub</span>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
