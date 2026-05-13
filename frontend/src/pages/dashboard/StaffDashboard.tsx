import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api'
import { staffApi } from '../../api'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { Spinner } from '../../components/ui'
import {
  ClipboardList, Pill, Calendar, Clock, Bell, BookOpen,
  ChevronRight, CheckCircle, AlertTriangle, Users, ArrowRight, MessageSquare
} from 'lucide-react'

export default function StaffDashboard() {
  const { user } = useAuth()
  const [myShifts, setMyShifts] = useState<any[]>([])
  const [myTasks, setMyTasks] = useState<any[]>([])
  const [myLeave, setMyLeave] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [myProfile, setMyProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    if (!user) return
    Promise.all([
      api.get('/shifts', { params: { homeId: user.homeId, date: format(new Date(), 'yyyy-MM-dd') } }),
      api.get('/tasks', { params: { homeId: user.homeId, date: format(new Date(), 'yyyy-MM-dd') } }),
      api.get('/staff-hr/leave', { params: { staffId: user.id } }),
      api.get('/notifications'),
      staffApi.get(user.id),
    ]).then(([shiftsRes, tasksRes, leaveRes, notifRes, profileRes]) => {
      const allShifts = shiftsRes.data.data || []
      setMyShifts(allShifts.filter((s: any) => s.staff_id === user.id))
      setMyTasks((tasksRes.data.data || []).filter((t: any) =>
        !t.assigned_role || t.assigned_role === (profileRes.data.data?.role || '')
      ))
      setMyLeave(leaveRes.data.data || [])
      setNotifications((notifRes.data.data || []).filter((n: any) => !n.is_read).slice(0, 5))
      setMyProfile(profileRes.data.data)
    }).catch(console.error).finally(() => setLoading(false))
  }, [user])

  const pendingTasks = myTasks.filter(t => t.status === 'pending')
  const completedTasks = myTasks.filter(t => t.status === 'completed')
  const myTodayShift = myShifts[0]
  const pendingLeave = myLeave.filter(l => l.status === 'pending')

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner /></div>

  return (
    <div className="p-5 max-w-2xl mx-auto">
      {/* Greeting */}
      <div className="mb-6">
        <p className="text-slate-400 text-sm">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
        <h1 className="font-display text-2xl text-slate-900 mt-0.5">{greeting}, {user?.firstName} 👋</h1>
        {myProfile?.role && <p className="text-sm text-slate-400 capitalize mt-0.5">{myProfile.role.replace(/_/g, ' ')} · {myProfile.home_name || ''}</p>}
      </div>

      {/* Today's shift */}
      <div className={`rounded-2xl p-5 mb-4 ${myTodayShift ? 'text-white' : 'bg-slate-50 border border-slate-200'}`}
        style={myTodayShift ? { background: 'linear-gradient(135deg, #1e2d4a, #2d4270)' } : {}}>
        <div className="flex items-center gap-3 mb-1">
          <Clock className={`w-5 h-5 ${myTodayShift ? 'text-gold-400' : 'text-slate-400'}`} style={myTodayShift ? { color: '#e8b130' } : {}} />
          <p className={`text-sm font-semibold ${myTodayShift ? 'text-white/80' : 'text-slate-500'}`}>Today's shift</p>
        </div>
        {myTodayShift ? (
          <div>
            <p className="text-xl font-bold">{myTodayShift.start_time?.substring(0,5)} – {myTodayShift.end_time?.substring(0,5)}</p>
            <p className="text-white/70 text-sm capitalize mt-0.5">{(myTodayShift.shift_type || 'Regular').replace('_', ' ')}{myTodayShift.su_name ? ` · ${myTodayShift.su_name}` : ''}</p>
          </div>
        ) : (
          <p className="text-slate-500 text-sm">No shift scheduled today</p>
        )}
      </div>

      {/* Unread notifications */}
      {notifications.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
          <p className="text-sm font-semibold text-amber-800 flex items-center gap-2 mb-2">
            <Bell className="w-4 h-4" /> {notifications.length} unread notification{notifications.length > 1 ? 's' : ''}
          </p>
          {notifications.map((n: any) => (
            <p key={n.id} className="text-xs text-amber-700 py-1 border-t border-amber-100 first:border-0">{n.title}</p>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          { label: 'Daily records', to: '/daily-records', icon: <ClipboardList className="w-5 h-5" />, color: '#8b5cf6', desc: 'Log care activities' },
          { label: 'MAR chart', to: '/mar', icon: <Pill className="w-5 h-5" />, color: '#3b82f6', desc: 'Log medications' },
          { label: 'Request leave', to: '/holidays', icon: <Calendar className="w-5 h-5" />, color: '#10b981', desc: `${pendingLeave.length} pending` },
          { label: 'My training', to: '/training', icon: <BookOpen className="w-5 h-5" />, color: '#f59e0b', desc: 'Complete modules' },
          { label: 'Clock in/out', to: '/staff', icon: <Clock className="w-5 h-5" />, color: '#6366f1', desc: 'View clock history' },
          { label: 'Messages', to: '/messages', icon: <MessageSquare className="w-5 h-5" />, color: '#ec4899', desc: 'Team messages' },
        ].map(qa => (
          <Link key={qa.to} to={qa.to}
            className="bg-white rounded-2xl border border-slate-100 shadow-card p-4 flex items-start gap-3 hover:shadow-card-hover hover:border-slate-200 transition-all">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${qa.color}15`, color: qa.color }}>{qa.icon}</div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">{qa.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{qa.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* My tasks today */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card mb-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
          <h2 className="font-semibold text-slate-800">My tasks today</h2>
          <Link to="/tasks" className="text-xs text-purple-600 font-semibold flex items-center gap-1">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {myTasks.length === 0 ? (
          <p className="text-sm text-slate-400 px-5 py-4">No tasks assigned for today</p>
        ) : (
          <div>
            {pendingTasks.slice(0, 4).map((t: any) => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-0">
                <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                <p className="text-sm text-slate-700 flex-1">{t.title}</p>
                {t.due_time && <p className="text-xs text-slate-400">{t.due_time}</p>}
              </div>
            ))}
            {completedTasks.length > 0 && (
              <div className="px-5 py-2 bg-emerald-50">
                <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> {completedTasks.length} task{completedTasks.length > 1 ? 's' : ''} completed today
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* My leave */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card mb-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
          <h2 className="font-semibold text-slate-800">My leave requests</h2>
          <Link to="/holidays" className="text-xs text-purple-600 font-semibold flex items-center gap-1">
            Request leave <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {myLeave.length === 0 ? (
          <p className="text-sm text-slate-400 px-5 py-4">No leave requests yet</p>
        ) : myLeave.slice(0, 3).map((l: any) => (
          <div key={l.id} className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-0">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${l.status === 'approved' ? 'bg-emerald-500' : l.status === 'declined' ? 'bg-rose-500' : 'bg-amber-400'}`} />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-800 capitalize">{(l.leave_type || '').replace('_', ' ')}</p>
              <p className="text-xs text-slate-400">{l.start_date ? format(new Date(l.start_date), 'd MMM') : ''} – {l.end_date ? format(new Date(l.end_date), 'd MMM yyyy') : ''}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${l.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : l.status === 'declined' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
              {l.status}
            </span>
          </div>
        ))}
      </div>

      {/* Residents link */}
      <Link to="/service-users" className="flex items-center gap-4 bg-white rounded-2xl border border-slate-100 shadow-card p-5 hover:shadow-card-hover transition-all">
        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
          <Users className="w-5 h-5 text-purple-600" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-slate-800">Residents</p>
          <p className="text-xs text-slate-400 mt-0.5">View profiles, care plans and daily records</p>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-300" />
      </Link>
    </div>
  )
}
