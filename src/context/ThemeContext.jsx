import { useState, useEffect, useCallback } from 'react';
import {
  getSystemThemePreference,
  getStoredThemePreference,
  setStoredThemePreference,
  toggleRootClass
} from '../utils/themeUtils';
import { ThemeContext } from './ThemeContextDef';

export function ThemeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const stored = getStoredThemePreference();
    if (stored) return stored === 'dark';
    return getSystemThemePreference() === 'dark';
  });

  const toggleTheme = useCallback(() => {
    setIsDarkMode(prev => {
      const newValue = !prev;
      setStoredThemePreference(newValue ? 'dark' : 'light');
      return newValue;
    });
  }, []);

  useEffect(() => {
    toggleRootClass(isDarkMode);
  }, [isDarkMode]);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
