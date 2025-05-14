import React, { createContext, useContext } from 'react';
import { toast } from 'react-hot-toast';

interface SnackbarContextType {
  showSnackbar: (message: string, severity?: 'success' | 'error' | 'warning' | 'info') => void;
}

const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

export const SnackbarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    if (severity === 'success') toast.success(message);
    else if (severity === 'error') toast.error(message);
    else if (severity === 'warning') toast(message, { icon: '⚠️' });
    else toast(message);
  };

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
    </SnackbarContext.Provider>
  );
};

export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
}; 