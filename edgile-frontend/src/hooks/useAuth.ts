import { useState, useEffect } from 'react';
import axios from 'axios';
import config from '@/config';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export const useAuth = () => {
  // Initialize token state immediately from localStorage
  const storedToken = localStorage.getItem('token');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(storedToken);
  const [loading, setLoading] = useState(!!storedToken);

  useEffect(() => {
    if (storedToken) {
      fetchUser(storedToken);
    }
  }, []);

  const fetchUser = async (authToken: string) => {
    try {
      console.log("[useAuth] Fetching user with token:", authToken.substring(0, 10) + '...');
      const response = await axios.get(`${config.API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      setUser(response.data.data);
    } catch (error) {
      console.error('[useAuth] Error fetching user:', error);
      // Only logout if the error is authentication-related
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.log('[useAuth] Authentication error, logging out');
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${config.API_URL}/api/auth/login`, {
        email,
        password
      });
      const { token: newToken, user: userData } = response.data.data;
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  return {
    user,
    token,
    loading,
    login,
    logout
  };
}; 