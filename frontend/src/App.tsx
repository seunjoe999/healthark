import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { NotificationsProvider } from './context/NotificationsContext'
import AppLayout from './components/layout/AppLayout'
import InstallPrompt from './components/pwa/InstallPrompt'
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
import Setup from './pages/auth/Setup'
import Maintenance from './pages/maintenance/Maintenance'
import DBSTracker from './pages/dbs/DBSTracker'
import Timesheets from './pages/timesheets/Timesheets'
import BathChart from './pages/bath-chart/BathChart'
import Outcomes from './pages/outcomes/Outcomes'
import AuditTrail from './pages/audit-trail/AuditTrail'
import Noticeboard from './pages/noticeboard/Noticeboard'
import Observations from './pages/observations/Observations'
import SeizureLog from './pages/seizures/SeizureLog'
import BowelChart from './pages/bowel-chart/BowelChart'
import ResidentDiary from './pages/diary/ResidentDiary'
import ProfessionalVisits from './pages/professional-visits/ProfessionalVisits'
import MedicineRisk from './pages/medicine-risk/MedicineRisk'
import PerformanceMatrix from './pages/performance/PerformanceMatrix'
import RiskManagement from './pages/risk-assessments/RiskManagement'
import Invoicing from './pages/invoicing/Invoicing'
import CQCNotifications from './pages/cqc-notifications/CQCNotifications'
import SupervisionAppraisal from './pages/supervision-appraisal/SupervisionAppraisal'
import LeaveManagement from './pages/staff/LeaveManagement'
import PhysicalHealthPlan from './pages/service-users/PhysicalHealthPlan'
import Complaints from './pages/complaints/Complaints'
import SocialActivities from './pages/social-activities/SocialActivities'


const IDLE_WARN_MS = 25 * 60 * 1000   // warn after 25 min
const IDLE_OUT_MS  = 30 * 60 * 1000   // logout after 30 min
const EVENTS = ['mousemove','mousedown','keydown','scroll','touchstart','click'] as const

function InactivityWatcher() {
  const { user, logout } = useAuth()
  const [showWarn, setShowWarn] = React.useState(false)
  const warnRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const outRef  = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const reset = React.useCallback(() => {
    if (!user) return
    setShowWarn(false)
    if (warnRef.current) clearTimeout(warnRef.current)
    if (outRef.current)  clearTimeout(outRef.current)
    warnRef.current = setTimeout(() => setShowWarn(true), IDLE_WARN_MS)
    outRef.current  = setTimeout(() => { logout(); window.location.href = '/login' }, IDLE_OUT_MS)
  }, [user, logout])

  React.useEffect(() => {
    if (!user) { if (warnRef.current) clearTimeout(warnRef.current); if (outRef.current) clearTimeout(outRef.current); return }
    reset()
    EVENTS.forEach(e => window.addEventListener(e, reset, { passive: true }))
    return () => { EVENTS.forEach(e => window.removeEventListener(e, reset)); if (warnRef.current) clearTimeout(warnRef.current); if (outRef.current) clearTimeout(outRef.current) }
  }, [user, reset])

  if (!showWarn) return null
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
        </div>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">Session about to expire</h2>
        <p className="text-slate-500 text-sm mb-6">You've been inactive for 25 minutes. You'll be logged out in 5 minutes unless you continue.</p>
        <button onClick={reset} className="w-full py-2.5 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors">
          Stay logged in
        </button>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
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
      <Route path="/setup" element={<Setup />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/" element={<Navigate to="/messages" replace />} />
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
      <Route path="/maintenance" element={<ProtectedRoute><Maintenance /></ProtectedRoute>} />
      <Route path="/dbs" element={<ProtectedRoute><DBSTracker /></ProtectedRoute>} />
      <Route path="/timesheets" element={<ProtectedRoute><Timesheets /></ProtectedRoute>} />
      <Route path="/bath-chart" element={<ProtectedRoute><BathChart /></ProtectedRoute>} />
      <Route path="/outcomes" element={<ProtectedRoute><Outcomes /></ProtectedRoute>} />
      <Route path="/audit-trail" element={<ProtectedRoute><AuditTrail /></ProtectedRoute>} />
      <Route path="/noticeboard" element={<ProtectedRoute><Noticeboard /></ProtectedRoute>} />
      <Route path="/observations" element={<ProtectedRoute><Observations /></ProtectedRoute>} />
      <Route path="/seizures" element={<ProtectedRoute><SeizureLog /></ProtectedRoute>} />
      <Route path="/bowel-chart" element={<ProtectedRoute><BowelChart /></ProtectedRoute>} />
      <Route path="/diary" element={<ProtectedRoute><ResidentDiary /></ProtectedRoute>} />
      <Route path="/professional-visits" element={<ProtectedRoute><ProfessionalVisits /></ProtectedRoute>} />
      <Route path="/medicine-risk" element={<ProtectedRoute><MedicineRisk /></ProtectedRoute>} />
      <Route path="/performance" element={<ProtectedRoute><PerformanceMatrix /></ProtectedRoute>} />
      <Route path="/risk-management" element={<ProtectedRoute><RiskManagement /></ProtectedRoute>} />
      <Route path="/invoicing" element={<ProtectedRoute><Invoicing /></ProtectedRoute>} />
      <Route path="/cqc-notifications" element={<ProtectedRoute><CQCNotifications /></ProtectedRoute>} />
      <Route path="/supervision-appraisal" element={<ProtectedRoute><SupervisionAppraisal /></ProtectedRoute>} />
      <Route path="/leave-management" element={<ProtectedRoute><LeaveManagement /></ProtectedRoute>} />
      <Route path="/physical-health-plan" element={<ProtectedRoute><PhysicalHealthPlan /></ProtectedRoute>} />
      <Route path="/complaints" element={<ProtectedRoute><Complaints /></ProtectedRoute>} />
      <Route path="/social-activities" element={<ProtectedRoute><SocialActivities /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/messages" replace />} />
    </Routes>
  )
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: string | null }> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e.message } }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 40, fontFamily: 'monospace', background: '#0d1526', color: '#fff', minHeight: '100vh' }}>
        <h2 style={{ color: '#e8b130' }}>App Error</h2>
        <pre style={{ color: '#f87171', whiteSpace: 'pre-wrap' }}>{this.state.error}</pre>
        <button onClick={() => window.location.reload()} style={{ marginTop: 20, padding: '8px 16px', background: '#e8b130', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Reload</button>
      </div>
    )
    return this.props.children
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <NotificationsProvider>
            <Toaster position="top-right" toastOptions={{ duration: 4000, style: { borderRadius: '12px', fontSize: '13px' } }} />
            <InactivityWatcher />
            <AppRoutes />
            <InstallPrompt />
          </NotificationsProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
