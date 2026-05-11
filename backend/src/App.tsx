import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/auth/Login'
import Dashboard from './pages/dashboard/Dashboard'
import ServiceUserList from './pages/service-users/ServiceUserList'
import ServiceUserProfile from './pages/service-users/ServiceUserProfile'
import DailyRecords from './pages/daily-records/DailyRecords'
import CarePlans from './pages/care-plans/CarePlans'
import Safeguarding from './pages/safeguarding/Safeguarding'
import StaffModule from './pages/staff/StaffModule'
import Audits from './pages/audits/Audits'
import Reports from './pages/reports/Reports'
import Alerts from './pages/alerts/Alerts'
import Policies from './pages/policies/Policies'
import PPE from './pages/ppe/PPE'
import Messages from './pages/messages/Messages'
import CalendarPage from './pages/calendar/Calendar'

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
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
        <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🔨</span>
        </div>
        <h2 className="text-xl font-bold text-purple-900 mb-2">{title}</h2>
        <p className="text-gray-500 text-sm">Coming soon</p>
      </div>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/service-users" element={<ProtectedRoute><ServiceUserList /></ProtectedRoute>} />
      <Route path="/service-users/new" element={<ProtectedRoute><ComingSoon title="Add Service User" /></ProtectedRoute>} />
      <Route path="/service-users/:id" element={<ProtectedRoute><ServiceUserProfile /></ProtectedRoute>} />
      <Route path="/daily-records" element={<ProtectedRoute><DailyRecords /></ProtectedRoute>} />
      <Route path="/care-plans" element={<ProtectedRoute><CarePlans /></ProtectedRoute>} />
      <Route path="/safeguarding" element={<ProtectedRoute><Safeguarding /></ProtectedRoute>} />
      <Route path="/staff" element={<ProtectedRoute><StaffModule /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
      <Route path="/audits" element={<ProtectedRoute><Audits /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/policies" element={<ProtectedRoute><Policies /></ProtectedRoute>} />
      <Route path="/ppe" element={<ProtectedRoute><PPE /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
      <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><ComingSoon title="Settings" /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 4000, style: { borderRadius: '10px', fontSize: '14px' } }} />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
