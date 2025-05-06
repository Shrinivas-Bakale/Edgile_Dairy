import React, { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFacultyAuth } from '../contexts/FacultyAuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';

type UserRole = 'admin' | 'faculty' | 'student';

interface ProtectedRouteProps {
  children?: ReactNode | ((props: { role: UserRole }) => React.ReactElement);
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, role, user } = useAuth();
  const { faculty, isAuthenticated: isFacultyAuthenticated } = useFacultyAuth();
  const { showSnackbar } = useSnackbar();
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get appropriate dashboard path based on user role
  const getDashboardPath = (userRole: string) => {
    switch (userRole) {
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
  
  // Additional security check for sensitive routes
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      
      // If no token or user data, show message and redirect to login
      if (!token || !userStr) {
        showSnackbar('Please log in to access this page', 'warning');
        navigate('/login', { replace: true, state: { from: location } });
        setIsLoading(false);
        return;
      }
      
      try {
        // Safely parse the user data with better error handling
        let userData;
        try {
          userData = JSON.parse(userStr);
          
          // Validate the user data has the minimum required fields
          if (!userData || typeof userData !== 'object' || !userData.role) {
            throw new Error('Invalid user data structure');
          }
        } catch (parseError) {
          // Handle JSON parse error or invalid structure - don't clear storage automatically,
          // just redirect to login with warning
          showSnackbar('Invalid session data. Please log in again', 'error');
          navigate('/login', { replace: true, state: { from: location } });
          setIsLoading(false);
          return;
        }
        
        // Check if the user role is allowed for this route
        if (allowedRoles && !allowedRoles.includes(userData.role)) {
          showSnackbar('You do not have permission to access this page', 'error');
          
          // Redirect to the appropriate dashboard instead of landing page
          const dashboardPath = getDashboardPath(userData.role);
          navigate(dashboardPath, { replace: true });
          setIsLoading(false);
          return;
        }
        
        // If we're here, user is authorized
        setIsAuthorized(true);
        setIsLoading(false);
      } catch (error) {
        // General error handling - don't clear storage automatically
        console.error('Error checking authentication:', error);
        showSnackbar('Authentication error. Please try refreshing the page.', 'error');
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [allowedRoles, location, navigate, showSnackbar]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Special handling for faculty routes - ensure either context auth or localStorage auth
  if (allowedRoles?.includes('faculty')) {
    // Check if authenticated as faculty through context OR localStorage
    const localUserStr = localStorage.getItem('user');
    const localUser = localUserStr ? JSON.parse(localUserStr) : null;
    const isFaculty = (localUser && localUser.role === 'faculty') || isFacultyAuthenticated;
    
    if (!isFaculty) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    
    const isDashboardRoute = location.pathname === '/faculty/dashboard';
    
    // Allow all faculty to access the dashboard - modal will handle registration if needed
    if (isDashboardRoute) {
      return typeof children === 'function' 
        ? children({ role: 'faculty' }) 
        : <>{children}</>;
    }
  }
  
  // Special handling for admin routes
  if (allowedRoles?.includes('admin')) {
    // Get user from localStorage as backup
    const localUserStr = localStorage.getItem('user');
    const localUser = localUserStr ? JSON.parse(localUserStr) : null;
    const isAdmin = (localUser && localUser.role === 'admin') || (role === 'admin');
    
    if (!isAdmin) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
  }

  // If not authorized, redirect to login
  if (!isAuthorized) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (typeof children === 'function') {
    return children({ role: role as UserRole });
  }

  return <>{children}</>;
};

export default ProtectedRoute; 