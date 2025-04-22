import React, { createContext, useContext, useState } from 'react';
import { adminLogin as apiAdminLogin } from '../utils/api';

interface AdminAuthContextType {
  admin: any | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<any | null>(null);

  const login = async (email: string, password: string) => {
    const response = await apiAdminLogin(email, password);
    setAdmin(response.admin);
  };

  const logout = () => {
    setAdmin(null);
  };

  return (
    <AdminAuthContext.Provider value={{ admin, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}; 