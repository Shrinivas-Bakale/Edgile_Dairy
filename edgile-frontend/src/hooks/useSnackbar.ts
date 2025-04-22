import { useState } from 'react';

type SnackbarType = 'success' | 'error' | 'info' | 'warning';

interface Snackbar {
  message: string;
  type: SnackbarType;
  open: boolean;
}

export const useSnackbar = () => {
  const [snackbar, setSnackbar] = useState<Snackbar>({
    message: '',
    type: 'info',
    open: false
  });

  const showSnackbar = (message: string, type: SnackbarType = 'info') => {
    setSnackbar({
      message,
      type,
      open: true
    });

    // Auto-hide after 5 seconds
    setTimeout(() => {
      setSnackbar(prev => ({
        ...prev,
        open: false
      }));
    }, 5000);
  };

  const hideSnackbar = () => {
    setSnackbar(prev => ({
      ...prev,
      open: false
    }));
  };

  return {
    snackbar,
    showSnackbar,
    hideSnackbar
  };
}; 