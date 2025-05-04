import React, { createContext, useContext, useEffect, useState } from 'react';

interface DarkModeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const DarkModeContext = createContext<DarkModeContextType>({
  isDarkMode: false,
  toggleDarkMode: () => {}
});

export const DarkModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize with light mode as default
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Remove forced dark mode
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, []);

  // Toggle function is now a no-op (but we keep it for API compatibility)
  const toggleDarkMode = () => {
    // Do nothing - always light mode
    console.log('Dark mode toggle is disabled');
  };

  const contextValue = {
    isDarkMode: false,
    toggleDarkMode
  };

  return (
    <DarkModeContext.Provider value={contextValue}>
      {children}
    </DarkModeContext.Provider>
  );
};

export const useDarkMode = (): DarkModeContextType => {
  return useContext(DarkModeContext);
}; 