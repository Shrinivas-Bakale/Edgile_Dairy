import React, { createContext, useContext, useState, useEffect } from 'react';
import { facultyLogin, facultyAPI } from '../utils/api';

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
}

interface LoginResponse {
  token: string;
  message: string;
  user: FacultyUser;
  requiresRegistration?: boolean;
}

interface FacultyAuthContextType {
  faculty: FacultyUser | null;
  login: (email: string, password: string, universityCode: string) => Promise<LoginResponse>;
  logout: () => void;
  isAuthenticated: boolean;
  updateActivationStatus: (status: boolean) => void;
}

const FacultyAuthContext = createContext<FacultyAuthContextType | undefined>(undefined);

export const FacultyAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [faculty, setFaculty] = useState<FacultyUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Initialize auth state from localStorage on component mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.role === 'faculty') {
          setFaculty(user);
          setIsAuthenticated(true);
          console.log('Faculty user initialized from localStorage:', user.name);
        }
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const login = async (email: string, password: string, universityCode: string) => {
    try {
      console.log('Faculty login attempt with:', { email, universityCode });
      const response = await facultyLogin(email, password, universityCode);
      console.log('Faculty login response:', response);
      
      // Store the token in localStorage
      if (response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
      }
      
      // Parse the token to check for requiresRegistration
      const tokenPayload = JSON.parse(atob(response.token.split('.')[1]));
      const requiresRegistration = tokenPayload.requiresRegistration || false;
      
      setFaculty(response.user);
      setIsAuthenticated(true);
      console.log('Faculty authenticated:', response.user.name);
      
      // Don't store sensitive data like passwords
      password = "";
      
      return { ...response, requiresRegistration };
    } catch (error: any) {
      console.error('Faculty login error:', error);
      throw new Error(error.message || 'Login failed');
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
    setIsAuthenticated(false);
    console.log('Faculty logged out successfully');
  };

  return (
    <FacultyAuthContext.Provider value={{ faculty, login, logout, isAuthenticated, updateActivationStatus }}>
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