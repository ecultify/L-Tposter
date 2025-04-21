import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import type { ProcessedImage } from '../types';

// Define your data interface
interface UserData {
  phoneNumber: string;
  name?: string;
  email?: string;
  companyName?: string;
  tagline?: string;
  businessType?: string;
  address?: string;
  logo_url?: string | null;
}

interface FormDataContextType {
  userData: UserData;
  setUserData: React.Dispatch<React.SetStateAction<UserData>>;
  processedImage: ProcessedImage | null;
  setProcessedImage: React.Dispatch<React.SetStateAction<ProcessedImage | null>>;
  posterImage: string | null;
  setPosterImage: React.Dispatch<React.SetStateAction<string | null>>;
  selectedTemplate: string;
  setSelectedTemplate: React.Dispatch<React.SetStateAction<string>>;
  clearAllData: () => void;
  isVerified: boolean;
  setIsVerified: React.Dispatch<React.SetStateAction<boolean>>;
}

// Create the context with a default value
const FormDataContext = createContext<FormDataContextType | undefined>(undefined);

// Create provider component
export const FormDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userData, setUserData] = useState<UserData>({ phoneNumber: '' });
  const [processedImage, setProcessedImage] = useState<ProcessedImage | null>(null);
  const [posterImage, setPosterImage] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('1');
  const [isVerified, setIsVerified] = useState<boolean>(false);

  // Function to clear all data - wrapped in useCallback to prevent infinite re-renders
  const clearAllData = useCallback(() => {
    setUserData({ phoneNumber: '' });
    setProcessedImage(null);
    setPosterImage(null);
    setSelectedTemplate('1');
    setIsVerified(false);
  }, []);

  const value = {
    userData,
    setUserData,
    processedImage,
    setProcessedImage,
    posterImage,
    setPosterImage,
    selectedTemplate,
    setSelectedTemplate,
    clearAllData,
    isVerified,
    setIsVerified
  };

  return (
    <FormDataContext.Provider value={value}>
      {children}
    </FormDataContext.Provider>
  );
};

// Custom hook for easy context usage
export const useFormData = (): FormDataContextType => {
  const context = useContext(FormDataContext);
  if (context === undefined) {
    throw new Error('useFormData must be used within a FormDataProvider');
  }
  return context;
}; 