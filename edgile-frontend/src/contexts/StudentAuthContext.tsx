import React, { createContext, useContext, useState } from 'react';
import { studentLogin } from '../utils/api';

interface StudentAuthContextType {
  student: any | null;
  login: (email: string, password: string, universityCode: string) => Promise<void>;
  logout: () => void;
}

const StudentAuthContext = createContext<StudentAuthContextType | undefined>(undefined);

export const StudentAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [student, setStudent] = useState<any | null>(null);

  const login = async (email: string, password: string, universityCode: string) => {
    try {
      const response = await studentLogin(email, password, universityCode);
      
      // Store the token in localStorage
      if (response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.student));
      }
      
      setStudent(response.student);
      
      // Don't store sensitive data like passwords
      password = "";
      
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setStudent(null);
  };

  return (
    <StudentAuthContext.Provider value={{ student, login, logout }}>
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