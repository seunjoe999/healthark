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
import Setup from './pages/auth/Setup'
import MAR from './pages/mar/MAR'
import Tasks from './pages/tasks/Tasks'
import ClockInAdmin from './pages/clockin/ClockInAdmin'
import ClockIn from './pages/clockin/ClockIn'
import PrintQR from './pages/clockin/PrintQR'
import FamilyPortal from './pages/family/FamilyPortal'
import Rota from './pages/rota/Rota'
import SearchResults from './pages/search/Search'
import Messages from './pages/messages/Messages'

import Reviews from './pages/reviews/Reviews'
import Invoicing from './pages/invoicing/Invoicing'
import QualityAssurance from './pages/quality/Quality'
import Assessments from './pages/assessments/Assessments'
import AdminAccounts from './pages/admin/AdminAccounts'
import Settings from './pages/settings/Settings'
import Maintenance from './pages/maintenance/Maintenance'
import Incidents from './pages/incidents/Incidents'
import DbsTracker from './pages/dbs/DBSTracker'
import Timesheets from './pages/timesheets/Timesheets'
import CQCNotifications from './pages/cqc-notifications/CQCNotifications'
import AuditTrail from './pages/audit-trail/AuditTrail'

import PPEStock from './pages/ppe/PPE'
import Holidays from './pages/holidays/Holidays'
import Policies from './pages/policies/Policies'
import Outcomes from './pages/outcomes/Outcomes'
import BathChart from './pages/bath-chart/BathChart'
import Noticeboard from './pages/noticeboard/Noticeboard'
import Observations from './pages/observations/Observations'
import Seizures from './pages/seizures/SeizureLog'
import Consents from './pages/consents/Consents'
import BowelChart from './pages/bowel-chart/BowelChart'
import ResidentDiary from './pages/diary/ResidentDiary'
import ProfessionalVisits from './pages/professional-visits/ProfessionalVisits'
import MedicineRisk from './pages/medicine-risk/MedicineRisk'
import PerformanceMatrix from './pages/performance/PerformanceMatrix'
import SocialActivities from './pages/social-activities/SocialActivities'
import MedicationStock from './pages/medication-stock/MedicationStock'
import Recruitment from './pages/recruitment/Recruitment'
import HandoverReport from './pages/reports/HandoverReport'
import Training from './pages/training/Training'
import RiskManagement from './pages/risk-assessments/RiskManagement'
import Calendar from './pages/calendar/Calendar'

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

function AppRoutes() {
  return (
    <Routes>
      <Route path="/setup" element={<Setup />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/" element={<Navigate to="/login" replace />} />
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
      <Route path="/family-portal" element={<ProtectedRoute><FamilyPortal /></ProtectedRoute>} />
      <Route path="/rota" element={<ProtectedRoute><Rota /></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute><SearchResults /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
      
      <Route path="/reviews" element={<ProtectedRoute><Reviews /></ProtectedRoute>} />
      <Route path="/invoicing" element={<ProtectedRoute><Invoicing /></ProtectedRoute>} />
      <Route path="/complaints" element={<ProtectedRoute><QualityAssurance /></ProtectedRoute>} />
      <Route path="/assessments" element={<ProtectedRoute><Assessments /></ProtectedRoute>} />
      <Route path="/audits" element={<ProtectedRoute><Audits /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
      <Route path="/admin/accounts" element={<ProtectedRoute><AdminAccounts /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/maintenance" element={<ProtectedRoute><Maintenance /></ProtectedRoute>} />
      <Route path="/incidents" element={<ProtectedRoute><Incidents /></ProtectedRoute>} />
      <Route path="/dbs" element={<ProtectedRoute><DbsTracker /></ProtectedRoute>} />
      <Route path="/timesheets" element={<ProtectedRoute><Timesheets /></ProtectedRoute>} />
      <Route path="/cqc-notifications" element={<ProtectedRoute><CQCNotifications /></ProtectedRoute>} />
      <Route path="/audit-trail" element={<ProtectedRoute><AuditTrail /></ProtectedRoute>} />
      <Route path="/risk-assessment" element={<Navigate to="/risk-management" replace />} />
      <Route path="/ppe" element={<ProtectedRoute><PPEStock /></ProtectedRoute>} />
      <Route path="/holidays" element={<ProtectedRoute><Holidays /></ProtectedRoute>} />
      <Route path="/policies" element={<ProtectedRoute><Policies /></ProtectedRoute>} />
      <Route path="/outcomes" element={<ProtectedRoute><Outcomes /></ProtectedRoute>} />
      <Route path="/bath-chart" element={<ProtectedRoute><BathChart /></ProtectedRoute>} />
      <Route path="/noticeboard" element={<ProtectedRoute><Noticeboard /></ProtectedRoute>} />
      <Route path="/observations" element={<ProtectedRoute><Observations /></ProtectedRoute>} />
      <Route path="/seizures" element={<ProtectedRoute><Seizures /></ProtectedRoute>} />
      <Route path="/consents" element={<ProtectedRoute><Consents /></ProtectedRoute>} />
      <Route path="/bowel-chart" element={<ProtectedRoute><BowelChart /></ProtectedRoute>} />
      <Route path="/diary" element={<ProtectedRoute><ResidentDiary /></ProtectedRoute>} />
      <Route path="/professional-visits" element={<ProtectedRoute><ProfessionalVisits /></ProtectedRoute>} />
      <Route path="/medicine-risk" element={<ProtectedRoute><MedicineRisk /></ProtectedRoute>} />
      <Route path="/performance" element={<ProtectedRoute><PerformanceMatrix /></ProtectedRoute>} />
      <Route path="/social-activities" element={<ProtectedRoute><SocialActivities /></ProtectedRoute>} />
      <Route path="/medication-stock" element={<ProtectedRoute><MedicationStock /></ProtectedRoute>} />
      <Route path="/recruitment" element={<ProtectedRoute><Recruitment /></ProtectedRoute>} />
      <Route path="/reports/handover" element={<ProtectedRoute><HandoverReport /></ProtectedRoute>} />
      <Route path="/training" element={<ProtectedRoute><Training /></ProtectedRoute>} />
      <Route path="/risk-management" element={<ProtectedRoute><RiskManagement /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

class ErrorBoundary extends React.Component<{ children?: React.ReactNode }, { error: string | null }> {
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
            <AppRoutes />
            <InstallPrompt />
          </NotificationsProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
