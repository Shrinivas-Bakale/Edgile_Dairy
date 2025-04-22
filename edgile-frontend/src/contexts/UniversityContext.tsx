import React, { createContext, useContext, useState } from 'react';
import { getUniversities } from '../utils/api';

interface UniversityContextType {
  universities: any[];
  fetchUniversities: () => Promise<void>;
}

const UniversityContext = createContext<UniversityContextType | undefined>(undefined);

export const UniversityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [universities, setUniversities] = useState<any[]>([]);

  const fetchUniversities = async () => {
    const response = await getUniversities();
    setUniversities(response.universities);
  };

  return (
    <UniversityContext.Provider value={{ universities, fetchUniversities }}>
      {children}
    </UniversityContext.Provider>
  );
};

export const useUniversity = () => {
  const context = useContext(UniversityContext);
  if (!context) {
    throw new Error('useUniversity must be used within a UniversityProvider');
  }
  return context;
}; 