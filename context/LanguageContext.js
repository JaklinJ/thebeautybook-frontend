import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../config/translations';

export const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(null); // Start as null to detect loading
  const [isLoadingLanguage, setIsLoadingLanguage] = useState(true);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('language');
      setLanguage(savedLanguage || 'bg'); // Default to Bulgarian
    } catch (error) {
      console.error('Error loading language:', error);
      setLanguage('bg'); // Fallback to default
    } finally {
      setIsLoadingLanguage(false);
    }
  };

  const changeLanguage = useCallback(async (lang) => {
    try {
      await AsyncStorage.setItem('language', lang);
      setLanguage(lang); // This state change will trigger re-render
    } catch (error) {
      console.error('Error saving language:', error);
    }
  }, []);

  // Memoize the translation function but recreate it when language changes
  const t = useCallback((key) => {
    if (!language) return key; // Safety check during loading
    return translations[language]?.[key] || translations['en']?.[key] || key;
  }, [language]); // Re-create when language changes

  // Memoize the context value to prevent unnecessary re-renders
  // but ensure it updates when language changes
  const contextValue = useMemo(() => ({
    language,
    changeLanguage,
    t,
    isLoadingLanguage,
  }), [language, changeLanguage, t, isLoadingLanguage]);

  // Don't render children until language is loaded
  if (isLoadingLanguage) {
    return null; // or a loading spinner
  }

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

