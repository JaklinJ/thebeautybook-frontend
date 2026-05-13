import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeContext = createContext();

const lightTheme = {
  // Backgrounds
  background: '#F8F5F0',
  surface: '#FFFFFF',
  surfaceSecondary: '#F2EDE6',
  card: '#FFFFFF',

  // Gradients — flat/near-flat; gold gradient reserved for CTA fills only
  gradientBackground: ['#F8F5F0', '#F8F5F0', '#F8F5F0'],
  gradientHeader: ['rgba(248,245,240,0.98)', 'rgba(248,245,240,0.96)'],
  gradientPrimary: ['#F5A830', '#E8900A', '#CC7A00'],
  gradientCard: ['#FFFFFF', '#FDFAF6'],

  // Decorative orbs
  orbPrimary: 'rgba(232, 144, 10, 0.09)',
  orbAccent: 'rgba(193, 123, 143, 0.09)',
  orbSecondary: 'rgba(193, 123, 143, 0.04)',

  // Glass card
  glassCard: 'rgba(255, 255, 255, 0.85)',
  glassCardBorder: 'rgba(232, 226, 217, 0.95)',

  // Primary — vivid amber-orange
  primary: '#E8900A',
  primaryLight: '#F5A830',
  primaryDark: '#CC7A00',
  secondary: '#5A5450',
  accent: '#E8900A',
  pink: '#C17B8F',
  blue: '#5B8DB8',

  // Text
  textPrimary: '#0E0D0C',
  textSecondary: '#5A5450',
  textTertiary: '#9E9690',
  textInverse: '#FFFFFF',

  // Status
  success: '#2D7D46',
  error: '#C0392B',
  warning: '#E8900A',
  info: '#2E6DA4',

  // UI chrome
  border: '#E8E2D9',
  divider: '#F0EBE3',
  shadow: 'rgba(14, 13, 12, 0.06)',
  overlay: 'rgba(14, 13, 12, 0.50)',

  // Inputs / buttons
  inputBackground: '#FAF8F5',
  buttonBackground: '#E8900A',
  buttonText: '#FFFFFF',
  disabled: '#D4CFC9',

  // Charts
  chartLine: '#E8900A',
  chartBackground: 'rgba(232, 144, 10, 0.10)',

  // Badges
  badgeActive: '#2D7D46',
  badgeInactive: '#9E9690',

  // Header
  headerBackground: 'rgba(248,245,240,0.98)',
  headerBorder: 'rgba(232,144,10,0.18)',
};

const darkTheme = {
  // Backgrounds — warm near-black, not cool blue-black
  background: '#0E0D0C',
  surface: '#1A1815',
  surfaceSecondary: '#231F1C',
  card: '#1A1815',

  // Gradients
  gradientBackground: ['#0E0D0C', '#0E0D0C', '#0E0D0C'],
  gradientHeader: ['rgba(14,13,12,0.98)', 'rgba(14,13,12,0.96)'],
  gradientPrimary: ['#F5A830', '#E8900A', '#CC7A00'],
  gradientCard: ['#1A1815', '#231F1C'],

  // Decorative orbs
  orbPrimary: 'rgba(232, 144, 10, 0.12)',
  orbAccent: 'rgba(193, 123, 143, 0.13)',
  orbSecondary: 'rgba(193, 123, 143, 0.05)',

  // Glass card
  glassCard: 'rgba(26, 24, 21, 0.85)',
  glassCardBorder: 'rgba(255, 255, 255, 0.06)',

  // Primary — vivid amber-orange
  primary: '#E8900A',
  primaryLight: '#F5A830',
  primaryDark: '#CC7A00',
  secondary: '#B8B0A6',
  accent: '#C8922A',
  pink: '#D4909A',
  blue: '#7AAFD4',

  // Text
  textPrimary: '#F8F5F0',
  textSecondary: '#B8B0A6',
  textTertiary: '#7A7068',
  textInverse: '#0E0D0C',

  // Status
  success: '#4CAF79',
  error: '#F87171',
  warning: '#E8900A',
  info: '#60A5FA',

  // UI chrome
  border: '#2E2A26',
  divider: '#231F1C',
  shadow: 'rgba(0, 0, 0, 0.50)',
  overlay: 'rgba(0, 0, 0, 0.75)',

  // Inputs / buttons
  inputBackground: '#231F1C',
  buttonBackground: '#E8900A',
  buttonText: '#FFFFFF',
  disabled: '#3D3834',

  // Charts
  chartLine: '#C8922A',
  chartBackground: 'rgba(200, 146, 42, 0.10)',

  // Badges
  badgeActive: '#4CAF79',
  badgeInactive: '#7A7068',

  // Header
  headerBackground: 'rgba(14,13,12,0.98)',
  headerBorder: 'rgba(232,144,10,0.25)',
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

export const useTheme = () => {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
