import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { NotificationsProvider } from './context/NotificationsContext'
import AppLayout from './components/layout/AppLayout'
import InstallPrompt from './components/pwa/InstallPrompt'
import Login from './pages/auth/Login'
import LandingPage from './pages/public/LandingPage'
import Setup from './pages/auth/Setup'
import { useCapacitorSetup } from './hooks/useCapacitorSetup'

const Dashboard = React.lazy(() => import('./pages/dashboard/Dashboard'))
const ServiceUserList = React.lazy(() => import('./pages/service-users/ServiceUserList'))
const ServiceUserProfile = React.lazy(() => import('./pages/service-users/ServiceUserProfile'))
const AddServiceUser = React.lazy(() => import('./pages/service-users/AddServiceUser'))
const EditServiceUser = React.lazy(() => import('./pages/service-users/EditServiceUser'))
const DailyRecords = React.lazy(() => import('./pages/daily-records/DailyRecords'))
const CarePlans = React.lazy(() => import('./pages/care-plans/CarePlans'))
const Safeguarding = React.lazy(() => import('./pages/safeguarding/Safeguarding'))
const StaffModule = React.lazy(() => import('./pages/staff/StaffModule'))
const AddStaff = React.lazy(() => import('./pages/staff/AddStaff'))
const EditStaff = React.lazy(() => import('./pages/staff/EditStaff'))
const Audits = React.lazy(() => import('./pages/audits/Audits'))
const Reports = React.lazy(() => import('./pages/reports/Reports'))
const Alerts = React.lazy(() => import('./pages/alerts/Alerts'))
const MAR = React.lazy(() => import('./pages/mar/MAR'))
const Tasks = React.lazy(() => import('./pages/tasks/Tasks'))
const ClockInAdmin = React.lazy(() => import('./pages/clockin/ClockInAdmin'))
const ClockIn = React.lazy(() => import('./pages/clockin/ClockIn'))
const PrintQR = React.lazy(() => import('./pages/clockin/PrintQR'))
const FamilyPortal = React.lazy(() => import('./pages/family/FamilyPortal'))
const Rota = React.lazy(() => import('./pages/rota/Rota'))
const SearchResults = React.lazy(() => import('./pages/search/Search'))
const Messages = React.lazy(() => import('./pages/messages/Messages'))
const Reviews = React.lazy(() => import('./pages/reviews/Reviews'))
const Invoicing = React.lazy(() => import('./pages/invoicing/Invoicing'))
const QualityAssurance = React.lazy(() => import('./pages/quality/Quality'))
const Assessments = React.lazy(() => import('./pages/assessments/Assessments'))
const AdminAccounts = React.lazy(() => import('./pages/admin/AdminAccounts'))
const Settings = React.lazy(() => import('./pages/settings/Settings'))
const RolePermissions = React.lazy(() => import('./pages/settings/RolePermissions'))
const AccessRights = React.lazy(() => import('./pages/settings/AccessRights'))
const ResidentAssignments = React.lazy(() => import('./pages/settings/ResidentAssignments'))
const Maintenance = React.lazy(() => import('./pages/maintenance/Maintenance'))
const Incidents = React.lazy(() => import('./pages/incidents/Incidents'))
const DbsTracker = React.lazy(() => import('./pages/dbs/DBSTracker'))
const Timesheets = React.lazy(() => import('./pages/timesheets/Timesheets'))
const CQCNotifications = React.lazy(() => import('./pages/cqc-notifications/CQCNotifications'))
const AuditTrail = React.lazy(() => import('./pages/audit-trail/AuditTrail'))
const PPEStock = React.lazy(() => import('./pages/ppe/PPE'))
const Holidays = React.lazy(() => import('./pages/holidays/Holidays'))
const Policies = React.lazy(() => import('./pages/policies/Policies'))
const Outcomes = React.lazy(() => import('./pages/outcomes/Outcomes'))
const BathChart = React.lazy(() => import('./pages/bath-chart/BathChart'))
const Noticeboard = React.lazy(() => import('./pages/noticeboard/Noticeboard'))
const Observations = React.lazy(() => import('./pages/observations/Observations'))
const Seizures = React.lazy(() => import('./pages/seizures/SeizureLog'))
const Consents = React.lazy(() => import('./pages/consents/Consents'))
const BowelChart = React.lazy(() => import('./pages/bowel-chart/BowelChart'))
const ResidentDiary = React.lazy(() => import('./pages/diary/ResidentDiary'))
const ProfessionalVisits = React.lazy(() => import('./pages/professional-visits/ProfessionalVisits'))
const MedicineRisk = React.lazy(() => import('./pages/medicine-risk/MedicineRisk'))
const PerformanceMatrix = React.lazy(() => import('./pages/performance/PerformanceMatrix'))
const SocialActivities = React.lazy(() => import('./pages/social-activities/SocialActivities'))
const MedicationStock = React.lazy(() => import('./pages/medication-stock/MedicationStock'))
const Recruitment = React.lazy(() => import('./pages/recruitment/Recruitment'))
const HandoverReport = React.lazy(() => import('./pages/reports/HandoverReport'))
const Training = React.lazy(() => import('./pages/training/Training'))
const RiskManagement = React.lazy(() => import('./pages/risk-assessments/RiskManagement'))
const Calendar = React.lazy(() => import('./pages/calendar/Calendar'))
const Compliance = React.lazy(() => import('./pages/compliance/Compliance'))
const SupervisionAppraisal = React.lazy(() => import('./pages/supervision-appraisal/SupervisionAppraisal'))
const ClockInAnalytics = React.lazy(() => import('./pages/clockin/ClockInAnalytics'))
const NotificationsManager = React.lazy(() => import('./pages/notifications/NotificationsManager'))
const AssessmentForm = React.lazy(() => import('./pages/assessments/AssessmentForm'))
const AssessmentView = React.lazy(() => import('./pages/assessments/AssessmentView'))
const Confidential = React.lazy(() => import('./pages/confidential/Confidential'))
const FamilyView = React.lazy(() => import('./pages/family/FamilyView'))
const AIAssistant = React.lazy(() => import('./pages/ai/AIAssistant'))
const FluidBalance = React.lazy(() => import('./pages/fluid-balance/FluidBalance'))
const WeightTracker = React.lazy(() => import('./pages/weight-tracker/WeightTracker'))
const WoundCare = React.lazy(() => import('./pages/wound-care/WoundCare'))
const PEEP = React.lazy(() => import('./pages/peep/PEEP'))
const HospitalAdmissions = React.lazy(() => import('./pages/hospital-admissions/HospitalAdmissions'))
const EnvironmentalChecks = React.lazy(() => import('./pages/environmental/EnvironmentalChecks'))
const TrainingMatrix = React.lazy(() => import('./pages/training/TrainingMatrix'))
const StaffAbsence = React.lazy(() => import('./pages/staff-absence/StaffAbsence'))
const BedOccupancy = React.lazy(() => import('./pages/bed-occupancy/BedOccupancy'))
const WaitingList = React.lazy(() => import('./pages/waiting-list/WaitingList'))
const VisitorLog = React.lazy(() => import('./pages/visitor-log/VisitorLog'))
const Contractors = React.lazy(() => import('./pages/contractors/Contractors'))
const LessonsLearned = React.lazy(() => import('./pages/lessons-learned/LessonsLearned'))
const CQCInspection = React.lazy(() => import('./pages/cqc-inspection/CQCInspection'))
const ExternalContacts = React.lazy(() => import('./pages/contacts/ExternalContacts'))
const BarthelIndex = React.lazy(() => import('./pages/assessments/BarthelIndex'))
const MUSTScore = React.lazy(() => import('./pages/assessments/MUSTScore'))
const NEWS2Score = React.lazy(() => import('./pages/clinical/NEWS2Score'))
const WaterlowScore = React.lazy(() => import('./pages/clinical/WaterlowScore'))
const EvidencePack = React.lazy(() => import('./pages/cqc/EvidencePack'))
const AbbeyPainScale = React.lazy(() => import('./pages/clinical/AbbeyPainScale'))
const ABCChart = React.lazy(() => import('./pages/clinical/ABCChart'))
const BloodGlucose = React.lazy(() => import('./pages/clinical/BloodGlucose'))
const BodyMap = React.lazy(() => import('./pages/clinical/BodyMap'))
const OralHygiene = React.lazy(() => import('./pages/clinical/OralHygiene'))
const CatheterCare = React.lazy(() => import('./pages/clinical/CatheterCare'))
const EndOfLife = React.lazy(() => import('./pages/clinical/EndOfLife'))
const GPReferral = React.lazy(() => import('./pages/clinical/GPReferral'))

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
  useCapacitorSetup()
  return (
    <React.Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0d1526' }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#e8b130', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    }>
      <Routes>
        <Route path="/setup" element={<Setup />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/" element={<LandingPage />} />
        <Route path="/family/:token" element={<FamilyView />} />
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
        <Route path="/assessments/new" element={<ProtectedRoute><AssessmentForm /></ProtectedRoute>} />
        <Route path="/assessments/:id" element={<ProtectedRoute><AssessmentView /></ProtectedRoute>} />
        <Route path="/assessments" element={<ProtectedRoute><Assessments /></ProtectedRoute>} />
        <Route path="/audits" element={<ProtectedRoute><Audits /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
        <Route path="/admin/accounts" element={<ProtectedRoute><AdminAccounts /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/settings/role-permissions" element={<ProtectedRoute><RolePermissions /></ProtectedRoute>} />
        <Route path="/settings/access-rights" element={<ProtectedRoute><AccessRights /></ProtectedRoute>} />
        <Route path="/settings/resident-assignments" element={<ProtectedRoute><ResidentAssignments /></ProtectedRoute>} />
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
        <Route path="/compliance" element={<ProtectedRoute><Compliance /></ProtectedRoute>} />
        <Route path="/supervision-appraisal" element={<ProtectedRoute><SupervisionAppraisal /></ProtectedRoute>} />
        <Route path="/clockin-analytics" element={<ProtectedRoute><ClockInAnalytics /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsManager /></ProtectedRoute>} />
        <Route path="/confidential" element={<ProtectedRoute><Confidential /></ProtectedRoute>} />
        <Route path="/ai-assistant" element={<ProtectedRoute><AIAssistant /></ProtectedRoute>} />
        <Route path="/fluid-balance" element={<ProtectedRoute><FluidBalance /></ProtectedRoute>} />
        <Route path="/weight-tracker" element={<ProtectedRoute><WeightTracker /></ProtectedRoute>} />
        <Route path="/wound-care" element={<ProtectedRoute><WoundCare /></ProtectedRoute>} />
        <Route path="/peep" element={<ProtectedRoute><PEEP /></ProtectedRoute>} />
        <Route path="/hospital-admissions" element={<ProtectedRoute><HospitalAdmissions /></ProtectedRoute>} />
        <Route path="/environmental-checks" element={<ProtectedRoute><EnvironmentalChecks /></ProtectedRoute>} />
        <Route path="/training-matrix" element={<ProtectedRoute><TrainingMatrix /></ProtectedRoute>} />
        <Route path="/staff-absence" element={<ProtectedRoute><StaffAbsence /></ProtectedRoute>} />
        <Route path="/bed-occupancy" element={<ProtectedRoute><BedOccupancy /></ProtectedRoute>} />
        <Route path="/waiting-list" element={<ProtectedRoute><WaitingList /></ProtectedRoute>} />
        <Route path="/visitor-log" element={<ProtectedRoute><VisitorLog /></ProtectedRoute>} />
        <Route path="/contractors" element={<ProtectedRoute><Contractors /></ProtectedRoute>} />
        <Route path="/lessons-learned" element={<ProtectedRoute><LessonsLearned /></ProtectedRoute>} />
        <Route path="/cqc-inspection" element={<ProtectedRoute><CQCInspection /></ProtectedRoute>} />
        <Route path="/external-contacts" element={<ProtectedRoute><ExternalContacts /></ProtectedRoute>} />
        <Route path="/assessments/barthel" element={<ProtectedRoute><BarthelIndex /></ProtectedRoute>} />
        <Route path="/assessments/must" element={<ProtectedRoute><MUSTScore /></ProtectedRoute>} />
        <Route path="/clinical/news2" element={<ProtectedRoute><NEWS2Score /></ProtectedRoute>} />
        <Route path="/clinical/waterlow" element={<ProtectedRoute><WaterlowScore /></ProtectedRoute>} />
        <Route path="/cqc/evidence-pack" element={<ProtectedRoute><EvidencePack /></ProtectedRoute>} />
        <Route path="/clinical/abbey-pain" element={<ProtectedRoute><AbbeyPainScale /></ProtectedRoute>} />
        <Route path="/clinical/abc-chart" element={<ProtectedRoute><ABCChart /></ProtectedRoute>} />
        <Route path="/clinical/blood-glucose" element={<ProtectedRoute><BloodGlucose /></ProtectedRoute>} />
        <Route path="/clinical/body-map" element={<ProtectedRoute><BodyMap /></ProtectedRoute>} />
        <Route path="/clinical/oral-hygiene" element={<ProtectedRoute><OralHygiene /></ProtectedRoute>} />
        <Route path="/clinical/catheter-care" element={<ProtectedRoute><CatheterCare /></ProtectedRoute>} />
        <Route path="/clinical/end-of-life" element={<ProtectedRoute><EndOfLife /></ProtectedRoute>} />
        <Route path="/clinical/gp-referrals" element={<ProtectedRoute><GPReferral /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </React.Suspense>
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
