import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeContext = createContext();

// Modern color themes with golden yellow accent
const lightTheme = {
  // Background colors
  background: '#FAFBFC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F5F6F8',
  card: '#FFFFFF',

  // Gradient arrays
  gradientBackground: ['#FDF0F8', '#FFF9F5', '#EEF0FF'],
  gradientHeader: ['rgba(255,255,255,0.97)', 'rgba(253,250,255,0.94)'],
  gradientPrimary: ['#FBBF24', '#F59E0B', '#E08800'],
  gradientCard: ['#FFFFFF', '#FFF8FD'],

  // Decorative orb colors
  orbPrimary: 'rgba(245, 158, 11, 0.18)',
  orbAccent: 'rgba(220, 38, 127, 0.09)',
  orbSecondary: 'rgba(139, 92, 246, 0.07)',

  // Glass card
  glassCard: 'rgba(255, 255, 255, 0.82)',
  glassCardBorder: 'rgba(255, 255, 255, 0.95)',

  // Primary colors - Golden Yellow theme
  primary: '#F59E0B',
  primaryLight: '#FCD34D',
  primaryDark: '#D97706',
  secondary: '#3B82F6',
  accent: '#F59E0B',
  
  // Text colors
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',
  
  // Status colors
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  
  // UI elements
  border: '#E5E7EB',
  divider: '#F3F4F6',
  shadow: 'rgba(0, 0, 0, 0.08)',
  overlay: 'rgba(0, 0, 0, 0.5)',
  
  // Specific UI states
  inputBackground: '#F9FAFB',
  buttonBackground: '#F59E0B',
  buttonText: '#FFFFFF',
  disabled: '#D1D5DB',
  
  // Chart colors
  chartLine: '#F59E0B',
  chartBackground: 'rgba(245, 158, 11, 0.1)',
  
  // Badge colors
  badgeActive: '#10B981',
  badgeInactive: '#9CA3AF',
  
  // Header
  headerBackground: 'rgba(255,255,255,0.97)',
  headerBorder: 'rgba(245,158,11,0.22)',
};

const darkTheme = {
  // Background colors
  background: '#0A0E1A',
  surface: '#151B2B',
  surfaceSecondary: '#1E2638',
  card: '#151B2B',

  // Gradient arrays
  gradientBackground: ['#07051A', '#0D0A28', '#09101E'],
  gradientHeader: ['rgba(12,8,26,0.97)', 'rgba(9,6,19,0.94)'],
  gradientPrimary: ['#FDE047', '#FCD34D', '#F59E0B'],
  gradientCard: ['#160F3A', '#100D26'],

  // Decorative orb colors
  orbPrimary: 'rgba(252, 211, 77, 0.13)',
  orbAccent: 'rgba(139, 92, 246, 0.22)',
  orbSecondary: 'rgba(56, 189, 248, 0.10)',

  // Glass card
  glassCard: 'rgba(20, 14, 56, 0.75)',
  glassCardBorder: 'rgba(255, 255, 255, 0.07)',

  // Primary colors - Golden Yellow theme (adjusted for dark)
  primary: '#FCD34D',
  primaryLight: '#FEF3C7',
  primaryDark: '#F59E0B',
  secondary: '#60A5FA',
  accent: '#FCD34D',
  
  // Text colors
  textPrimary: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textTertiary: '#9CA3AF',
  textInverse: '#111827',
  
  // Status colors
  success: '#34D399',
  error: '#F87171',
  warning: '#FCD34D',
  info: '#60A5FA',
  
  // UI elements
  border: '#2D3748',
  divider: '#1E2638',
  shadow: 'rgba(0, 0, 0, 0.5)',
  overlay: 'rgba(0, 0, 0, 0.7)',
  
  // Specific UI states
  inputBackground: '#1E2638',
  buttonBackground: '#FCD34D',
  buttonText: '#111827',
  disabled: '#374151',
  
  // Chart colors
  chartLine: '#FCD34D',
  chartBackground: 'rgba(252, 211, 77, 0.1)',
  
  // Badge colors
  badgeActive: '#34D399',
  badgeInactive: '#6B7280',
  
  // Header
  headerBackground: 'rgba(12,8,26,0.97)',
  headerBorder: 'rgba(167,139,250,0.30)',
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  const [isLoadingTheme, setIsLoadingTheme] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme !== null) {
        setIsDark(savedTheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setIsLoadingTheme(false);
    }
  };

  const toggleTheme = useCallback(async () => {
    try {
      const newTheme = !isDark;
      await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
      setIsDark(newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  }, [isDark]);

  const theme = useMemo(() => isDark ? darkTheme : lightTheme, [isDark]);

  const contextValue = useMemo(() => ({
    isDark,
    theme,
    toggleTheme,
    isLoadingTheme,
  }), [isDark, theme, toggleTheme, isLoadingTheme]);

  if (isLoadingTheme) {
    return null;
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook for easy access to theme
export const useTheme = () => {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
