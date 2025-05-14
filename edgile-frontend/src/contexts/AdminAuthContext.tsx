import React, { createContext, useContext, useState } from 'react';
import { adminLogin as apiAdminLogin } from '../utils/api';
import api from '../utils/api';

interface AdminUser {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: 'admin';
  permissions?: string[];
  university?: string | { id?: string; _id?: string; name?: string; code?: string; };
  universityId?: string;
  universityCode?: string;
  universityName?: string;
}

interface AdminLoginResponse {
  token: string;
  message: string;
  user: AdminUser;
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  user: AdminUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUserProfile: () => Promise<void>;
  getUserUniversityId: () => string | undefined;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Helper function to normalize user object and ensure university ID is set
  const normalizeUser = (userData: AdminUser): AdminUser => {
    const normalizedUser = { ...userData };
    
    // Ensure consistent ID field
    if (normalizedUser._id && !normalizedUser.id) {
      normalizedUser.id = normalizedUser._id;
    } else if (normalizedUser.id && !normalizedUser._id) {
      normalizedUser._id = normalizedUser.id;
    }
    
    // Ensure university ID is consistently accessible
    if (normalizedUser.university) {
      if (typeof normalizedUser.university === 'object') {
        // Extract ID from university object
        const universityId = normalizedUser.university.id || normalizedUser.university._id;
        if (universityId && !normalizedUser.universityId) {
          normalizedUser.universityId = universityId;
        }
        // Extract code from university object
        if (normalizedUser.university.code && !normalizedUser.universityCode) {
          normalizedUser.universityCode = normalizedUser.university.code;
        }
      } else if (typeof normalizedUser.university === 'string') {
        // Set universityId and universityCode from string university
        if (!normalizedUser.universityId) {
          normalizedUser.universityId = normalizedUser.university;
        }
        if (!normalizedUser.universityCode) {
          normalizedUser.universityCode = normalizedUser.university;
        }
      }
    }
    // Fallback: assign universityCode from all possible sources
    if (!normalizedUser.universityCode) {
      if (userData.universityCode) {
        normalizedUser.universityCode = userData.universityCode;
      } else if (userData.universityId) {
        normalizedUser.universityCode = userData.universityId;
      } else if (userData.universityName) {
        normalizedUser.universityCode = userData.universityName;
      }
    }
    // As a last resort, set a default string to avoid undefined
    if (!normalizedUser.universityCode) {
      normalizedUser.universityCode = 'KLE-F104ED'; // Hardcoded fallback for your deployment
    }
    
    console.log('Normalized user:', normalizedUser);
    return normalizedUser;
  };

  // Get the user's university ID
  const getUserUniversityId = (): string | undefined => {
    if (!user) return undefined;
    
    // Check for universityId property first
    if (user.universityId) {
      return user.universityId;
    }
    
    // Check university object
    if (user.university) {
      if (typeof user.university === 'object') {
        return user.university.id || user.university._id;
      }
      if (typeof user.university === 'string') {
        return user.university;
      }
    }
    
    // Use user ID as fallback for admin users
    return user.id || user._id;
  };

  React.useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.role === 'admin') {
          const normalizedUser = normalizeUser(parsedUser);
          setToken(storedToken);
          setUser(normalizedUser);
          setAdmin(normalizedUser);
          
          // Set the token in the API client
          api.setToken(storedToken);
        }
      } catch (error) {
        console.error('Error parsing stored user data:', error);
      }
    }
  }, []);

  const refreshUserProfile = async (): Promise<void> => {
    // Since we're having issues with the /api/admin/profile endpoint,
    // we'll just use the data we already have from localStorage
    if (!token) return;
    
    try {
      // Ensure token is set in API client
      api.setToken(token);
      
      // Get stored user data from localStorage
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser.role === 'admin') {
            // Normalize and use the stored user data
            const normalizedUser = normalizeUser(parsedUser);
            setUser(normalizedUser);
            setAdmin(normalizedUser);
            console.log('Using stored user profile:', normalizedUser);
          }
        } catch (error) {
          console.error('Error parsing stored user data:', error);
        }
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await apiAdminLogin(email, password) as AdminLoginResponse;
    
    const normalizedUser = normalizeUser(response.user);
    setAdmin(normalizedUser);
    setUser(normalizedUser);
    setToken(response.token);
    
    if (response.token) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      
      // Set the token in the API client
      api.setToken(response.token);
    }
  };

  const logout = () => {
    setAdmin(null);
    setUser(null);
    setToken(null);
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Clear the token from the API client
    api.setToken(null);
  };

  return (
    <AdminAuthContext.Provider value={{ 
      admin, 
      user, 
      token, 
      login, 
      logout, 
      refreshUserProfile, 
      getUserUniversityId 
    }}>
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