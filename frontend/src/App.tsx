import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { NotificationsProvider } from './context/NotificationsContext'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/auth/Login'
import Dashboard from './pages/dashboard/Dashboard'
import ServiceUserList from './pages/service-users/ServiceUserList'
import ServiceUserProfile from './pages/service-users/ServiceUserProfile'
import AddServiceUser from './pages/service-users/AddServiceUser'
import EditServiceUser from './pages/service-users/EditServiceUser'
import DailyRecords from './pages/daily-records/DailyRecords'
import CarePlans from './pages/care-plans/CarePlans'
import Safeguarding from './pages/safeguarding/Safeguarding'
import StaffModule from './pages/staff/StaffModule'
import AddStaff from './pages/staff/AddStaff'
import EditStaff from './pages/staff/EditStaff'
import Audits from './pages/audits/Audits'
import Reports from './pages/reports/Reports'
import Alerts from './pages/alerts/Alerts'
import Policies from './pages/policies/Policies'
import PPE from './pages/ppe/PPE'
import Messages from './pages/messages/Messages'
import CalendarPage from './pages/calendar/Calendar'
import MAR from './pages/mar/MAR'
import Tasks from './pages/tasks/Tasks'
import Quality from './pages/quality/Quality'
import Rota from './pages/rota/Rota'
import PrintQR from './pages/clockin/PrintQR'
import Holidays from './pages/holidays/Holidays'
import Training from './pages/training/Training'
import PrintCarePlan from './pages/care-plans/PrintCarePlan'
import PrintMARChart from './pages/mar/PrintMARChart'
import HandoverReport from './pages/reports/HandoverReport'
import GlobalSearch from './pages/search/Search'
import AboutMe from './pages/service-users/AboutMe'
import Reviews from './pages/reviews/Reviews'
import ClockIn from './pages/clockin/ClockIn'
import ClockInAdmin from './pages/clockin/ClockInAdmin'
import Settings from './pages/settings/Settings'
import Assessments from './pages/assessments/Assessments'
import AssessmentForm from './pages/assessments/AssessmentForm'
import AssessmentView from './pages/assessments/AssessmentView'
import Incidents from './pages/incidents/Incidents'
import ClockInAnalytics from './pages/clockin/ClockInAnalytics'
import Compliance from './pages/compliance/Compliance'
import MedicationStock from './pages/medication-stock/MedicationStock'
import FamilyPortal from './pages/family/FamilyPortal'
import FamilyView from './pages/family/FamilyView'
import NotificationsManager from './pages/notifications/NotificationsManager'
import AdminAccounts from './pages/admin/AdminAccounts'

function getStoredToken(): string | null {
  if ((window as any).__HA_TOKEN__) return (window as any).__HA_TOKEN__
  try { const t = sessionStorage.getItem('ha_token'); if (t) return t } catch {}
  try { const t = localStorage.getItem('ha_token'); if (t) return t } catch {}
  try {
    const match = document.cookie.split(';').find(c => c.trim().startsWith('ha_token='))
    if (match) return decodeURIComponent(match.trim().slice('ha_token='.length))
  } catch {}
  return null
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const hasToken = !!getStoredToken()
  if (!user && !hasToken) return <Navigate to="/login" replace />
  if (!user && hasToken) return null  // token exists, context still initialising
  return <AppLayout>{children}</AppLayout>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-12 text-center">
        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><span className="text-3xl">🔨</span></div>
        <h2 className="font-display text-xl text-slate-900 mb-2">{title}</h2>
        <p className="text-slate-400 text-sm">Coming soon</p>
      </div>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/clockin/home/:token" element={<ClockIn />} />
      <Route path="/clockin/:token" element={<ClockIn />} />
      <Route path="/clockin-admin" element={<ProtectedRoute><ClockInAdmin /></ProtectedRoute>} />
      <Route path="/clockin/:token/print" element={<PrintQR />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/service-users" element={<ProtectedRoute><ServiceUserList /></ProtectedRoute>} />
      <Route path="/service-users/new" element={<ProtectedRoute><AddServiceUser /></ProtectedRoute>} />
      <Route path="/service-users/:id/edit" element={<ProtectedRoute><EditServiceUser /></ProtectedRoute>} />
      <Route path="/service-users/:id" element={<ProtectedRoute><ServiceUserProfile /></ProtectedRoute>} />
      <Route path="/daily-records" element={<ProtectedRoute><DailyRecords /></ProtectedRoute>} />
      <Route path="/care-plans" element={<ProtectedRoute><CarePlans /></ProtectedRoute>} />
      <Route path="/safeguarding" element={<ProtectedRoute><Safeguarding /></ProtectedRoute>} />
      <Route path="/staff" element={<ProtectedRoute><StaffModule /></ProtectedRoute>} />
      <Route path="/staff/new" element={<ProtectedRoute><AddStaff /></ProtectedRoute>} />
      <Route path="/staff/:id/edit" element={<ProtectedRoute><EditStaff /></ProtectedRoute>} />
      <Route path="/mar" element={<ProtectedRoute><MAR /></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
      <Route path="/quality" element={<ProtectedRoute><Quality /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
      <Route path="/audits" element={<ProtectedRoute><Audits /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/policies" element={<ProtectedRoute><Policies /></ProtectedRoute>} />
      <Route path="/ppe" element={<ProtectedRoute><PPE /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
      <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
      <Route path="/reviews" element={<ProtectedRoute><Reviews /></ProtectedRoute>} />
      <Route path="/rota" element={<ProtectedRoute><Rota /></ProtectedRoute>} />
      <Route path="/holidays" element={<ProtectedRoute><Holidays /></ProtectedRoute>} />
      <Route path="/training" element={<ProtectedRoute><Training /></ProtectedRoute>} />
      <Route path="/care-plans/:id/print" element={<PrintCarePlan />} />
      <Route path="/mar/:suId/print" element={<PrintMARChart />} />
      <Route path="/search" element={<ProtectedRoute><GlobalSearch /></ProtectedRoute>} />
      <Route path="/service-users/:id/about-me" element={<ProtectedRoute><AboutMe /></ProtectedRoute>} />
      <Route path="/reports/handover" element={<ProtectedRoute><HandoverReport /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/assessments" element={<ProtectedRoute><Assessments /></ProtectedRoute>} />
      <Route path="/assessments/new" element={<ProtectedRoute><AssessmentForm /></ProtectedRoute>} />
      <Route path="/assessments/:id" element={<ProtectedRoute><AssessmentView /></ProtectedRoute>} />
      <Route path="/incidents" element={<ProtectedRoute><Incidents /></ProtectedRoute>} />
      <Route path="/clockin-analytics" element={<ProtectedRoute><ClockInAnalytics /></ProtectedRoute>} />
      <Route path="/compliance" element={<ProtectedRoute><Compliance /></ProtectedRoute>} />
      <Route path="/medication-stock" element={<ProtectedRoute><MedicationStock /></ProtectedRoute>} />
      <Route path="/family-portal" element={<ProtectedRoute><FamilyPortal /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><NotificationsManager /></ProtectedRoute>} />
      <Route path="/family/:token" element={<FamilyView />} />
      <Route path="/admin/accounts" element={<ProtectedRoute><AdminAccounts /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <NotificationsProvider>
          <Toaster position="top-right" toastOptions={{ duration: 4000, style: { borderRadius: '12px', fontSize: '13px' } }} />
          <AppRoutes />
        </NotificationsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
