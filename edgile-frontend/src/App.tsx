import { Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import Unauthorized from './components/Unauthorized';
import { SnackbarProvider } from './contexts/SnackbarContext';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider } from './contexts/AuthContext';
import { StudentAuthProvider } from './contexts/StudentAuthContext';
import { FacultyAuthProvider } from './contexts/FacultyAuthContext';
import React from 'react';

// Create Query Client
const queryClient = new QueryClient();

// Auth Pages
import Login from './pages/auth/Login';
import AdminLogin from './pages/admin/Login';
import AdminRegister from './pages/auth/AdminRegister';
import AdminAccess from './pages/auth/AdminAccess';
import AdminChoice from './pages/auth/AdminChoice';
import StudentRegister from './pages/student/Register';
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
import TokenRegistration from './pages/faculty/TokenRegistration';
import StudentDashboard from './pages/student/Dashboard';
import StudentCourses from './pages/student/Courses';
import StudentCourseDetail from './pages/student/CourseDetail';
import StudentProfile from './pages/student/Profile';
import LoginLogs from './pages/admin/LoginLogs';
import RegistrationLogs from './pages/admin/RegistrationLogs';
import ClassroomsPage from './pages/admin/ClassroomsPage';
import ClassroomFormPage from './pages/admin/ClassroomFormPage';
import ClassroomUnavailabilityPage from './pages/admin/ClassroomUnavailabilityPage';
import SubjectsPage from './pages/admin/SubjectsPage';
import SubjectEditPage from './pages/admin/SubjectEditPage';
import TimetablePage from './pages/admin/TimetablePage';

// Define role type
type UserRole = 'admin' | 'faculty' | 'student';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SnackbarProvider>
        <ToastProvider>
          <AuthProvider>
            <StudentAuthProvider>
              <FacultyAuthProvider>
                <ErrorBoundary>
                  <AppRoutes />
                </ErrorBoundary>
              </FacultyAuthProvider>
            </StudentAuthProvider>
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
      case 'student':
        return '/student/dashboard';
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
            path="/register" 
            element={isAuthenticated ? <Navigate to={getRedirectPath()} replace /> : <StudentRegister />} 
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
            path="/student/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/student/courses" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentCourses />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/student/courses/:id" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentCourseDetail />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/student/profile" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentProfile />
              </ProtectedRoute>
            } 
          />
          
          {/* Token-based faculty registration (from admin email) */}
          <Route path="/faculty/complete-registration/:token" element={<TokenRegistration />} />
          
          {/* Catch all route - redirect authenticated users to their dashboard, others to login */}
          <Route path="*" element={<Navigate to={getRedirectPath()} replace />} />
        </Routes>
      </ErrorBoundary>
    </div>
  );
}

export default App;
