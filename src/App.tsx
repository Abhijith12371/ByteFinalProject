
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

// Auth Pages
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'

// Super Admin Pages
import { SuperAdminDashboard } from '@/pages/super-admin/SuperAdminDashboard'
import { SuperAdminSchoolsPage } from '@/pages/super-admin/SuperAdminSchoolsPage'

// Admin Pages
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { StudentsPage } from '@/pages/admin/StudentsPage'
import { StaffPage } from '@/pages/admin/StaffPage'
import { ClassesPage } from '@/pages/admin/ClassesPage'
import { SubjectsPage } from '@/pages/admin/SubjectsPage'
import { TimetablePage } from '@/pages/admin/TimetablePage'
import { AttendancePage } from '@/pages/admin/AttendancePage'
import { ExamsPage } from '@/pages/admin/ExamsPage'
import { AnnouncementsPage } from '@/pages/admin/AnnouncementsPage'
import { FeesPage } from '@/pages/admin/FeesPage'
import { ReportsPage } from '@/pages/admin/ReportsPage'
import { ActivityLogsPage } from '@/pages/admin/ActivityLogsPage'

// Staff & Student Pages
import { StaffDashboard } from '@/pages/staff/StaffDashboard'
import { StudentDashboard } from '@/pages/student/StudentDashboard'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

// Root redirect based on role
const RootRedirect = () => {
  const { user, profile, isLoading } = useAuth()
  
  if (isLoading) return null
  
  if (!user || !profile) {
    return <Navigate to="/login" replace />
  }
  
  switch (profile.role) {
    case 'super_admin': return <Navigate to="/super-admin" replace />
    case 'school_admin': return <Navigate to="/admin" replace />
    case 'staff': return <Navigate to="/staff" replace />
    case 'student': return <Navigate to="/student" replace />
    default: return <Navigate to="/login" replace />
  }
}

export const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              
              {/* Protected Routes inside AppShell */}
              <Route element={<AppLayout />}>
                
                {/* Root router */}
                <Route path="/" element={<RootRedirect />} />

                {/* Super Admin Routes */}
                <Route path="/super-admin" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminDashboard /></ProtectedRoute>} />
                <Route path="/super-admin/schools" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminSchoolsPage /></ProtectedRoute>} />
                <Route path="/super-admin/users" element={<ProtectedRoute allowedRoles={['super_admin']}><div>Super Admin Users</div></ProtectedRoute>} />
                <Route path="/super-admin/analytics" element={<ProtectedRoute allowedRoles={['super_admin']}><div>Super Admin Analytics</div></ProtectedRoute>} />
                <Route path="/super-admin/logs" element={<ProtectedRoute allowedRoles={['super_admin']}><ActivityLogsPage /></ProtectedRoute>} />
                <Route path="/super-admin/settings" element={<ProtectedRoute allowedRoles={['super_admin']}><div>Settings</div></ProtectedRoute>} />

                {/* School Admin Routes */}
                <Route path="/admin" element={<ProtectedRoute allowedRoles={['school_admin']}><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/students" element={<ProtectedRoute allowedRoles={['school_admin']}><StudentsPage /></ProtectedRoute>} />
                <Route path="/admin/staff" element={<ProtectedRoute allowedRoles={['school_admin']}><StaffPage /></ProtectedRoute>} />
                <Route path="/admin/classes" element={<ProtectedRoute allowedRoles={['school_admin']}><ClassesPage /></ProtectedRoute>} />
                <Route path="/admin/subjects" element={<ProtectedRoute allowedRoles={['school_admin']}><SubjectsPage /></ProtectedRoute>} />
                <Route path="/admin/timetable" element={<ProtectedRoute allowedRoles={['school_admin']}><TimetablePage /></ProtectedRoute>} />
                <Route path="/admin/attendance" element={<ProtectedRoute allowedRoles={['school_admin']}><AttendancePage /></ProtectedRoute>} />
                <Route path="/admin/exams" element={<ProtectedRoute allowedRoles={['school_admin']}><ExamsPage /></ProtectedRoute>} />
                <Route path="/admin/announcements" element={<ProtectedRoute allowedRoles={['school_admin']}><AnnouncementsPage /></ProtectedRoute>} />
                <Route path="/admin/fees" element={<ProtectedRoute allowedRoles={['school_admin']}><FeesPage /></ProtectedRoute>} />
                <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['school_admin']}><ReportsPage /></ProtectedRoute>} />
                <Route path="/admin/logs" element={<ProtectedRoute allowedRoles={['school_admin']}><ActivityLogsPage /></ProtectedRoute>} />
                <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['school_admin']}><div>Settings</div></ProtectedRoute>} />

                {/* Staff Routes */}
                <Route path="/staff" element={<ProtectedRoute allowedRoles={['staff']}><StaffDashboard /></ProtectedRoute>} />
                <Route path="/staff/students" element={<ProtectedRoute allowedRoles={['staff']}><div>My Students</div></ProtectedRoute>} />
                <Route path="/staff/attendance" element={<ProtectedRoute allowedRoles={['staff']}><AttendancePage /></ProtectedRoute>} />
                <Route path="/staff/marks" element={<ProtectedRoute allowedRoles={['staff']}><ExamsPage /></ProtectedRoute>} />
                <Route path="/staff/timetable" element={<ProtectedRoute allowedRoles={['staff']}><TimetablePage /></ProtectedRoute>} />
                <Route path="/staff/announcements" element={<ProtectedRoute allowedRoles={['staff']}><AnnouncementsPage /></ProtectedRoute>} />
                
                {/* Student Routes */}
                <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
                <Route path="/student/attendance" element={<ProtectedRoute allowedRoles={['student']}><div>My Attendance</div></ProtectedRoute>} />
                <Route path="/student/marks" element={<ProtectedRoute allowedRoles={['student']}><div>My Marks</div></ProtectedRoute>} />
                <Route path="/student/timetable" element={<ProtectedRoute allowedRoles={['student']}><div>My Timetable</div></ProtectedRoute>} />
                <Route path="/student/announcements" element={<ProtectedRoute allowedRoles={['student']}><AnnouncementsPage /></ProtectedRoute>} />

                {/* Global Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
