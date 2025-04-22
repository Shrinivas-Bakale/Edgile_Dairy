import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

// Define the user type that includes faculty-specific fields
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'faculty' | 'student';
  universityCode?: string;
  universityName?: string;
  isFirstLogin?: boolean;
  passwordChangeRequired?: boolean;
  lastLoginAt?: string;
  profileCompleted?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string, role: string, universityCode?: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      
      // Set auth header for API calls
      api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }
  }, []);

  const login = async (email: string, password: string, role: string, universityCode?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      let endpoint = '';
      let requestData: any = { email, password };
      
      // Determine the correct login endpoint based on role
      if (role === 'admin') {
        endpoint = '/admin/auth/login';
      } else if (role === 'faculty') {
        endpoint = '/faculty/auth/login';
        requestData.universityCode = universityCode;
      } else if (role === 'student') {
        endpoint = '/student/auth/login'; 
        requestData.universityCode = universityCode;
      }
      
      const response = await api.post(endpoint, requestData);
      const { token: newToken, user: userData } = response.data;
      
      // Store auth data
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Update state
      setToken(newToken);
      setUser(userData);
      
      // Set auth header for future API calls
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      // Redirect based on role and first login status
      if (role === 'faculty' && (userData.isFirstLogin || userData.passwordChangeRequired)) {
        navigate('/faculty/complete-profile');
      } else if (role === 'admin') {
        navigate('/admin/dashboard');
      } else if (role === 'faculty') {
        navigate('/faculty/dashboard');
      } else if (role === 'student') {
        navigate('/student/dashboard');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Failed to log in');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    // Clear auth data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Reset state
    setToken(null);
    setUser(null);
    
    // Clear auth header
    delete api.defaults.headers.common['Authorization'];
    
    // Redirect to login
    navigate('/login');
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, error, login, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider; 