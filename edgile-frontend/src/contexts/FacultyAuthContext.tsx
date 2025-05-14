import React, { createContext, useContext, useState, useEffect } from 'react';
import { facultyLogin, facultyAPI } from '../utils/api';
import api from '../utils/api';

interface FacultyUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  universityName: string;
  status: string;
  employeeId: string;
  registrationCompleted: boolean;
  requiresRegistration?: boolean;
  isFirstLogin?: boolean;
  permissions?: string[];
}

interface LoginResponse {
  token: string;
  message: string;
  user: FacultyUser;
  requiresRegistration?: boolean;
}

interface FacultyAuthContextType {
  faculty: FacultyUser | null;
  user: FacultyUser | null;
  token: string | null;
  login: (email: string, password: string, universityCode: string) => Promise<LoginResponse>;
  logout: () => void;
  isAuthenticated: boolean;
  updateActivationStatus: (status: boolean) => void;
  hasPermission: (permission: string) => boolean;
}

const FacultyAuthContext = createContext<FacultyAuthContextType | undefined>(undefined);

export const FacultyAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [faculty, setFaculty] = useState<FacultyUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(null);

  // Initialize auth state from localStorage on component mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.role === 'faculty') {
          setFaculty(user);
          setToken(storedToken);
          setIsAuthenticated(true);
          
          // Set the token in the API client for authenticated requests
          api.setToken(storedToken);
          
          console.log('Faculty user initialized from localStorage:', user.name);
        }
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const login = async (email: string, password: string, universityCode: string): Promise<LoginResponse> => {
    try {
      console.log('Faculty login attempt with:', { email, universityCode });
      const response = await facultyLogin(email, password, universityCode) as LoginResponse;
      console.log('Faculty login response:', response);
      
      // Store the token in localStorage
      if (response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        setToken(response.token);
        
        // Set the token in the API client for authenticated requests
        api.setToken(response.token);
      }
      
      // Parse the token to check for requiresRegistration
      const tokenPayload = JSON.parse(atob(response.token.split('.')[1]));
      const requiresRegistration = tokenPayload.requiresRegistration || false;
      
      setFaculty(response.user);
      setIsAuthenticated(true);
      console.log('Faculty authenticated:', response.user.name);
      
      // Don't store sensitive data like passwords
      password = "";
      
      return { 
        ...response, 
        requiresRegistration 
      };
    } catch (error: any) {
      console.error('Faculty login error:', error);
      
      // Ensure we don't redirect on login failures
      const errorMessage = error.message || error.response?.data?.message || 'Login failed';
      
      // Don't modify localStorage on login failure
      throw new Error(errorMessage);
    }
  };

  const updateActivationStatus = (status: boolean) => {
    if (faculty) {
      // Update local state
      const updatedFaculty = {
        ...faculty,
        status: 'active',
        registrationCompleted: true,
        isFirstLogin: false
      };
      setFaculty(updatedFaculty);
      
      // Update localStorage
      localStorage.setItem('user', JSON.stringify(updatedFaculty));
      
      console.log('Faculty activation status updated:', updatedFaculty);
    }
  };

  const logout = () => {
    console.log('Faculty logout called');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setFaculty(null);
    setToken(null);
    setIsAuthenticated(false);
    
    // Clear the token from the API client
    api.setToken(null);
    
    console.log('Faculty logged out successfully');
  };

  const hasPermission = (permission: string) => {
    return faculty?.permissions?.includes(permission) || false;
  };

  return (
    <FacultyAuthContext.Provider value={{ faculty, user: faculty, token, login, logout, isAuthenticated, updateActivationStatus, hasPermission }}>
      {children}
    </FacultyAuthContext.Provider>
  );
};

export const useFacultyAuth = () => {
  const context = useContext(FacultyAuthContext);
  if (!context) {
    throw new Error('useFacultyAuth must be used within a FacultyAuthProvider');
  }
  return context;
};

// Add an alias export for backward compatibility with components using useAuth
export const useAuth = useFacultyAuth; 