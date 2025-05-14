import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../utils/api';
import api from '../utils/api';
import { adminAPI } from '../utils/api';
import { facultyAPI } from '../utils/api';
import { studentAPI } from '../utils/api';

// Define user roles as a union type for TypeScript
export type UserRole = 'student' | 'faculty' | 'admin';

// Define permission strings for RBAC
export type Permission = 
  | 'admin:profile'
  | 'admin:dashboard'
  | 'admin:users:manage'
  | 'admin:university:manage'
  | 'admin:faculty:manage'
  | 'admin:courses:view'
  | 'admin:reports:view'
  | 'faculty:profile'
  | 'faculty:courses:manage'
  | 'faculty:students:view'
  | 'faculty:grades:manage'
  | 'student:profile'
  | 'student:courses:view'
  | 'student:assignments:submit'
  | 'student:grades:view';

// Get default permissions based on role
const getDefaultPermissions = (role: UserRole): Permission[] => {
  switch (role) {
    case 'admin':
      return [
        'admin:profile',
        'admin:dashboard',
        'admin:users:manage',
        'admin:university:manage',
        'admin:faculty:manage',
        'admin:courses:view',
        'admin:reports:view'
      ];
    case 'faculty':
      return [
        'faculty:profile',
        'faculty:courses:manage',
        'faculty:students:view',
        'faculty:grades:manage'
      ];
    case 'student':
      return [
        'student:profile',
        'student:courses:view',
        'student:assignments:submit',
        'student:grades:view'
      ];
    default:
      return [];
  }
};

// Define user object structure
interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions?: Permission[];
  [key: string]: any; // Allow for additional properties
}

// Define auth context interface
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  role: UserRole | null;
  permissions: Permission[];
  loading: boolean;
  error: string | null;
  login: (email: string, password: string, universityCode?: string) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, universityCode: string) => Promise<any>;
  verifyStudentOTP: (email: string, otp: string, password: string, name: string, universityCode: string) => Promise<void>;
  checkAdminEmailExists: (email: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
  clearError: () => void;
}

// Create the auth context with a default value
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  token: null,
  role: null,
  permissions: [],
  loading: true,
  error: null,
  login: async () => {},
  adminLogin: async () => {},
  register: async () => {},
  verifyStudentOTP: async () => {},
  checkAdminEmailExists: async () => false,
  logout: () => {},
  hasPermission: () => false,
  clearError: () => {}
});

// Auth Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state from localStorage
  useEffect(() => {
    const checkAuth = () => {
      try {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        if (storedToken && storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            
            // Validate user data structure
            if (!parsedUser || typeof parsedUser !== 'object' || !parsedUser.email) {
              throw new Error('Invalid user data structure');
            }
            
            // Ensure admin role and permissions are set correctly
            if (parsedUser.email?.includes('@admin')) {
              parsedUser.role = 'admin';
              parsedUser.permissions = getDefaultPermissions('admin');
            }
            
            // Make sure role is valid
            if (!parsedUser.role || !['admin', 'faculty', 'student'].includes(parsedUser.role)) {
              parsedUser.role = inferRoleFromEmail(parsedUser.email);
            }
            
            setIsAuthenticated(true);
            setUser(parsedUser);
            setToken(storedToken);
            setRole(parsedUser.role);
            
            // Set the token in the API client
            api.setToken(storedToken);
            
            // Set permissions based on stored user or defaults
            const userPermissions = parsedUser.permissions || getDefaultPermissions(parsedUser.role);
            setPermissions(userPermissions);
          } catch (parseError) {
            // If there's an error parsing, clear localStorage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setError('Invalid user data. Please log in again.');
          }
        }
      } catch (error) {
        // Any other errors, clear localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  // Helper function to infer role from email
  const inferRoleFromEmail = (email: string): UserRole => {
    if (email.includes('@admin') || email.includes('@admin.edgile.com')) {
      return 'admin';
    } else if (email.includes('@faculty') || email.includes('@faculty.edgile.com')) {
      return 'faculty';
    } else {
      return 'student';
    }
  };

  // Register function
  const register = async (name: string, email: string, password: string, universityCode: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await authAPI.register({
        name,
        email,
        password,
        universityCode
      });
      
      // Check if student registration requires OTP verification
      if (data.requiresOTP) {
        return data; // Return data to handle OTP verification in the Register component
      }
      
      // For other roles, continue with setting auth state
      setIsAuthenticated(true);
      setUser(data.user);
      setToken(data.token);
      setRole(data.user.role);
      
      // Set permissions based on user data or defaults based on role
      const userPermissions = data.user.permissions || getDefaultPermissions(data.user.role);
      setPermissions(userPermissions);
      
      // Store in localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({
        ...data.user,
        permissions: userPermissions
      }));
      
      // Set the token in the API client
      api.setToken(data.token);
      
      return data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Login function
  const login = async (email: string, password: string, universityCode?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Determine role based on email domain
      let role = 'student';
      if (email.endsWith('@admin.edgile.com')) {
        role = 'admin';
      } else if (email.endsWith('@faculty.edgile.com')) {
        role = 'faculty';
      }
      
      const data = await authAPI.login({
        email,
        password,
        universityCode
      });
      
      // Set auth state
      setIsAuthenticated(true);
      setUser(data.user);
      setToken(data.token);
      setRole(data.user.role);
      
      // Set permissions based on user data or defaults based on role
      const userPermissions = data.user.permissions || getDefaultPermissions(data.user.role);
      setPermissions(userPermissions);
      
      // Store in localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({
        ...data.user,
        permissions: userPermissions
      }));
      
      // Set the token in the API client
      api.setToken(data.token);
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Admin Login function
  const adminLogin = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // First attempt login
      const response = await authAPI.adminLogin({
        email,
        password
      });

      // Validate the login response
      if (!response.success) {
        throw new Error(response.message || 'Login failed');
      }

      const { token, user } = response;
      if (!token || !user) {
        throw new Error('Invalid response from server');
      }

      // Set auth state
      setIsAuthenticated(true);
      setUser(user);
      setToken(token);
      setRole('admin');
      setPermissions(user.permissions || getDefaultPermissions('admin'));
      
      // Store in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Store admin verification in sessionStorage
      sessionStorage.setItem('adminAccessVerified', 'true');
      sessionStorage.setItem('adminEmail', user.email);
      
      // Set the token in the API client
      api.setToken(token);
      
      return {
        success: true,
        user,
        token
      };
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Admin login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('adminAccessVerified');
    sessionStorage.removeItem('adminEmail');
    
    setUser(null);
    setToken(null);
    setRole(null);
    setPermissions([]);
    setIsAuthenticated(false);
    
    // Clear the token from the API client
    api.setToken(null);
  };
  
  // Check if user has a specific permission
  const hasPermission = (permission: Permission): boolean => {
    return permissions.includes(permission);
  };
  
  // Clear error
  const clearError = () => {
    setError(null);
  };

  // Check if admin email already exists
  const checkAdminEmailExists = async (email: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authAPI.checkEmailExists(email);
      return response.exists;
    } catch (err: any) {
      console.error('Email check error:', err);
      // If there's an error, assume the email doesn't exist
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Verify Student OTP function
  const verifyStudentOTP = async (email: string, otp: string, password: string, name: string, universityCode: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await authAPI.verifyStudentOTP({
        email,
        otp,
        password,
        name,
        universityCode
      });
      
      if (data.success) {
        // Set auth state
        setIsAuthenticated(true);
        setUser(data.user);
        setToken(data.token);
        setRole('student');
        
        // Set permissions based on user data or defaults
        const userPermissions = data.user.permissions || getDefaultPermissions('student');
        setPermissions(userPermissions);
        
        // Store in localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify({
          ...data.user,
          permissions: userPermissions
        }));
        
        // Set the token in the API client
        api.setToken(data.token);
      }
    } catch (err: any) {
      setError(err.response?.data?.msg || 'OTP verification failed. Please try again.');
      console.error('OTP verification error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Add a helper function for debouncing profile fetch calls
  const debounce = <F extends (...args: any[]) => any>(func: F, wait: number) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let pendingPromise: Promise<ReturnType<F>> | null = null;

    return (...args: Parameters<F>): Promise<ReturnType<F>> => {
      // If we already have a pending promise for this call, return it
      if (pendingPromise) {
        return pendingPromise;
      }

      // Create a new promise that resolves when the function is called
      const promise = new Promise<ReturnType<F>>((resolve, reject) => {
        if (timeout) {
          clearTimeout(timeout);
        }

        timeout = setTimeout(() => {
          timeout = null;
          pendingPromise = null;
          try {
            resolve(func(...args));
          } catch (err) {
            reject(err);
          }
        }, wait);
      });

      pendingPromise = promise;
      return promise;
    };
  };

  // Create debounced version of profile fetch
  const debouncedFetchProfile = React.useCallback(
    debounce(async () => {
      try {
        if (role === 'admin') {
          const response = await adminAPI.getProfile();
          if (response?.user) {
            setUser({
              ...user, 
              ...response.user
            });
            return true;
          }
        } else if (role === 'faculty') {
          const response = await facultyAPI.getProfile();
          if (response?.faculty) {
            setUser({
              ...user,
              ...response.faculty
            });
            return true;
          }
        } else if (role === 'student') {
          const response = await studentAPI.getProfile();
          if (response?.student) {
            setUser({
              ...user,
              ...response.student
            });
            return true;
          }
        }
        return false;
      } catch (error) {
        console.error('Error fetching profile:', error);
        return false;
      }
    }, 500), // 500ms debounce time
    [role, user]
  );

  // Refresh user data from the server
  const refreshUserData = React.useCallback(async () => {
    if (!token) return false;
    return debouncedFetchProfile();
  }, [token, debouncedFetchProfile]);

  // Context value
  const contextValue: AuthContextType = {
    isAuthenticated,
    user,
    token,
    role,
    permissions,
    loading,
    error,
    login,
    adminLogin,
    register,
    verifyStudentOTP,
    checkAdminEmailExists,
    logout,
    hasPermission,
    clearError
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// Hook for easy access to the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export context for consumers
export default AuthContext; 