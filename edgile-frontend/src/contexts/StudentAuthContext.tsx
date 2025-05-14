import React, { createContext, useContext, useState, useEffect } from 'react';
import { studentLogin } from '../utils/api';
import api from '../utils/api';

interface StudentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  universityName: string;
  registerNumber?: string;
  class?: {
    id: string;
    name: string;
    year: string;
    department: string;
  };
}

interface StudentLoginResponse {
  token: string;
  message: string;
  student: StudentUser;
}

interface StudentAuthContextType {
  student: StudentUser | null;
  token: string | null;
  login: (email: string, password: string, universityCode: string) => Promise<StudentLoginResponse>;
  logout: () => void;
}

const StudentAuthContext = createContext<StudentAuthContextType | undefined>(undefined);

export const StudentAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [student, setStudent] = useState<StudentUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Initialize state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken) {
      setToken(storedToken);
      
      // Set the token in the API client
      api.setToken(storedToken);
    }
    
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.role === 'student') {
          setStudent(parsedUser);
        }
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        // If there's an error parsing, clear the invalid data
        localStorage.removeItem('user');
      }
    }
  }, []);

  const login = async (email: string, password: string, universityCode: string): Promise<StudentLoginResponse> => {
    try {
      const response = await studentLogin(email, password, universityCode) as StudentLoginResponse;
      
      // Store the token in localStorage
      if (response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.student));
        setToken(response.token);
        
        // Set the token in the API client
        api.setToken(response.token);
      }
      
      setStudent(response.student);
      
      // Don't store sensitive data like passwords
      password = "";
      
      return response;
    } catch (error: any) {
      // Ensure we don't redirect on login failures
      const errorMessage = error.message || error.response?.data?.message || 'Login failed';
      
      // Prevent modifications to localStorage on login failure
      throw new Error(errorMessage);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setStudent(null);
    setToken(null);
    
    // Clear the token from the API client
    api.setToken(null);
  };

  return (
    <StudentAuthContext.Provider value={{ student, token, login, logout }}>
      {children}
    </StudentAuthContext.Provider>
  );
};

export const useStudentAuth = () => {
  const context = useContext(StudentAuthContext);
  if (!context) {
    throw new Error('useStudentAuth must be used within a StudentAuthProvider');
  }
  return context;
}; 