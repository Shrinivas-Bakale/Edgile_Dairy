import { Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { SnackbarProvider } from './contexts/SnackbarContext';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider } from './contexts/AuthContext';
import { FacultyAuthProvider } from './contexts/FacultyAuthContext';
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import DashboardWrapper from './components/DashboardWrapper';
import React from 'react';

// Create Query Client
const queryClient = new QueryClient();

// Auth Pages
import Login from './pages/auth/Login';
import AdminLogin from './pages/admin/Login';
import AdminRegister from './pages/auth/AdminRegister';
import AdminAccess from './pages/auth/AdminAccess';
import AdminChoice from './pages/auth/AdminChoice';
import ForgotPassword from './pages/auth/ForgotPassword';

// Landing Page
import LandingPage from './pages/LandingPage';

// Regular imports
import AdminDashboard from './pages/admin/Dashboard';
import AdminProfile from './pages/admin/Profile';
import FacultyPage from './pages/FacultyPage';
import StudentsPage from './pages/admin/StudentsPage';
import RegistrationCodes from './pages/admin/RegistrationCodes';
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import FacultyCourses from './pages/faculty/Courses';
import FacultyCourseDetail from './pages/faculty/CourseDetail';
import FacultyProfile from './pages/faculty/Profile';
import FacultyTimetable from './pages/faculty/Timetable';
import TokenRegistration from './pages/faculty/TokenRegistration';
import FacultyStudents from './pages/faculty/Students';
import LoginLogs from './pages/admin/LoginLogs';
import RegistrationLogs from './pages/admin/RegistrationLogs';
import ClassroomsPage from './pages/admin/ClassroomsPage';
import ClassroomFormPage from './pages/admin/ClassroomFormPage';
import ClassroomUnavailabilityPage from './pages/admin/ClassroomUnavailabilityPage';
import SubjectsPage from './pages/admin/SubjectsPage';
import SubjectEditPage from './pages/admin/SubjectEditPage';
import TimetablePage from './pages/admin/TimetablePage';
import CalendarOfEventsDashboard from './pages/admin/CalendarOfEventsDashboard';
import COEViewPage from './pages/admin/COEViewPage';
import COEEditPage from './pages/admin/COEEditPage';

// Attendance Management Pages
import FacultyAttendancePage from './pages/faculty/attendance/layout';
import AdminAttendanceSettingsPage from './pages/admin/AttendanceSettingsPage';
import HolidayManager from './pages/admin/attendance/HolidayManager';

// New imports
import FacultyCalendarOfEvents from './pages/faculty/CalendarOfEvents';
import FacultyCOEViewPage from './pages/faculty/COEViewPage';
import VideoLibraryPage from './pages/lecture-videos/VideoLibraryPage';
import PlaylistDetailPage from './pages/lecture-videos/PlaylistDetailPage';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SnackbarProvider>
        <ToastProvider>
          <AuthProvider>
            <AdminAuthProvider>
              <FacultyAuthProvider>
                <ErrorBoundary>
                  <AppRoutes />
                </ErrorBoundary>
              </FacultyAuthProvider>
            </AdminAuthProvider>
          </AuthProvider>
        </ToastProvider>
      </SnackbarProvider>
    </QueryClientProvider>
  );
}

// Separate component for routes to ensure auth context is available
const AppRoutes = () => {
  const { isAuthenticated, role } = useAuth();

  // Helper function to determine redirect based on user role
  const getRedirectPath = () => {
    if (!isAuthenticated) return "/login";
    
    switch (role) {
      case 'admin':
        return '/admin/dashboard';
      case 'faculty':
        return '/faculty/dashboard';
      default:
        return '/login';
    }
  };

  return (
    <div className="min-h-screen">
      <ErrorBoundary>
        <Routes>
          {/* Root route - redirect authenticated users to their dashboard */}
          <Route 
            path="/" 
            element={isAuthenticated ? <Navigate to={getRedirectPath()} replace /> : <LandingPage />} 
          />
          
          {/* Auth Routes */}
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to={getRedirectPath()} replace /> : <Login />} 
          />
          <Route 
            path="/forgot-password" 
            element={isAuthenticated ? <Navigate to={getRedirectPath()} replace /> : <ForgotPassword />} 
          />
          
          {/* Admin Routes */}
          <Route path="/admin/access" element={<AdminAccess />} />
          <Route path="/admin/choice" element={<AdminChoice />} />
          <Route path="/admin/login" element={isAuthenticated ? <Navigate to={getRedirectPath()} replace /> : <AdminLogin />} />
          <Route path="/admin/register" element={isAuthenticated ? <Navigate to={getRedirectPath()} replace /> : <AdminRegister />} />
          
          {/* Protected Routes */}
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/profile" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminProfile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/registration-codes" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <RegistrationCodes />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/faculty" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <FacultyPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/students" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <StudentsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/logs" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <LoginLogs />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/registration-logs" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <RegistrationLogs />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/classrooms" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ClassroomsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/classrooms/new" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ClassroomFormPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/classrooms/edit/:id" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ClassroomFormPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/classrooms/unavailable/:id" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ClassroomUnavailabilityPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/subjects" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <SubjectsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/subjects/edit/:id" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <SubjectEditPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/timetable" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <TimetablePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/calendar-of-events" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <CalendarOfEventsDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/coe/:id/view" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <COEViewPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/coe/:id/edit" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <COEEditPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/attendance" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminAttendanceSettingsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/attendance/holidays" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <HolidayManager />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/faculty/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['faculty']}>
                <FacultyDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/faculty/courses" 
            element={
              <ProtectedRoute allowedRoles={['faculty']}>
                <FacultyCourses />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/faculty/courses/:id" 
            element={
              <ProtectedRoute allowedRoles={['faculty']}>
                <FacultyCourseDetail />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/faculty/profile" 
            element={
              <ProtectedRoute allowedRoles={['faculty']}>
                <FacultyProfile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/faculty/timetable" 
            element={
              <ProtectedRoute allowedRoles={['faculty']}>
                <FacultyTimetable />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/faculty/attendance/*" 
            element={
              <ProtectedRoute allowedRoles={['faculty']}>
                <DashboardWrapper>
                  <FacultyAttendancePage />
                </DashboardWrapper>
              </ProtectedRoute>
            } 
          />
          
          {/* Token-based faculty registration (from admin email) */}
          <Route path="/faculty/complete-registration/:token" element={<TokenRegistration />} />
          
          {/* Faculty Routes */}
          <Route 
            path="/faculty/students" 
            element={
              <ProtectedRoute allowedRoles={['faculty']}>
                <FacultyStudents />
              </ProtectedRoute>
            } 
          />
          
          {/* Faculty Calendar of Events */}
          <Route 
            path="/faculty/calendar-of-events" 
            element={
              <ProtectedRoute allowedRoles={['faculty']}>
                <FacultyCalendarOfEvents />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/faculty/coe/:id" 
            element={
              <ProtectedRoute allowedRoles={['faculty']}>
                <FacultyCOEViewPage />
              </ProtectedRoute>
            } 
          />
          
          {/* Lecture Videos */}
          <Route path="/lecture-videos" element={<ProtectedRoute><VideoLibraryPage /></ProtectedRoute>} />
          <Route path="/lecture-videos/:playlistId" element={<ProtectedRoute><PlaylistDetailPage /></ProtectedRoute>} />
          
          {/* Catch all route - redirect authenticated users to their dashboard, others to login */}
          <Route path="*" element={<Navigate to={getRedirectPath()} replace />} />
        </Routes>
      </ErrorBoundary>
    </div>
  );
}

export default App;
