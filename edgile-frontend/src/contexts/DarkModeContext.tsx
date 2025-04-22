import React, { createContext, useContext, useEffect, useState } from 'react';

interface DarkModeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const DarkModeContext = createContext<DarkModeContextType>({
  isDarkMode: true,
  toggleDarkMode: () => {}
});

export const DarkModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize with dark mode as default
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // Initialize from localStorage only on client
  useEffect(() => {
    // This runs only in the browser after hydration
    try {
      // Force dark mode and save it
      setIsDarkMode(true);
      localStorage.setItem('darkMode', 'true');
    } catch (e) {
      console.error('Error initializing dark mode:', e);
    }
  }, []);

  // Apply theme changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      
      // Always add dark class
      root.classList.add('dark');
      
      // Save preference
      try {
        localStorage.setItem('darkMode', 'true');
      } catch (e) {
        console.error('Error saving dark mode preference:', e);
      }
    }
  }, [isDarkMode]);

  // Toggle function is now a no-op (but we keep it for API compatibility)
  const toggleDarkMode = () => {
    // Do nothing - dark mode is always on
    console.log('Dark mode toggle is disabled');
  };

  const contextValue = {
    isDarkMode: true,
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