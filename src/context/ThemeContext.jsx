import React, { createContext, useContext, useState, useLayoutEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';

const STORAGE_KEY = 'theme';
const DARK_CLASS = 'dark';
const LIGHT_CLASS = 'light';

const ThemeContext = createContext();

export function ThemeProvider({ children, defaultTheme = 'system' }) {
  // Initialize theme state with a function to avoid unnecessary re-renders
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEY);
    if (savedTheme === DARK_CLASS || savedTheme === LIGHT_CLASS) {
      return savedTheme === DARK_CLASS;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Create memoized media query for system theme changes
  const systemThemeMedia = useMemo(
    () => window.matchMedia('(prefers-color-scheme: dark)'),
    []
  );

  // Handle system theme changes
  useLayoutEffect(() => {
    const handleSystemThemeChange = (e) => {
      const savedTheme = localStorage.getItem(STORAGE_KEY);
      // Only update if using system preference
      if (!savedTheme || savedTheme === 'system') {
        setIsDarkMode(e.matches);
      }
    };

    systemThemeMedia.addEventListener('change', handleSystemThemeChange);
    return () => {
      systemThemeMedia.removeEventListener('change', handleSystemThemeChange);
    };
  }, [systemThemeMedia]);

  // Apply theme changes to document
  useLayoutEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(DARK_CLASS, LIGHT_CLASS);
    root.classList.add(isDarkMode ? DARK_CLASS : LIGHT_CLASS);
  }, [isDarkMode]);

  // Persist theme changes
  useLayoutEffect(() => {
    localStorage.setItem(STORAGE_KEY, isDarkMode ? DARK_CLASS : LIGHT_CLASS);
  }, [isDarkMode]);

  // Memoized toggle function
  const toggleTheme = useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  // Reset to system preference
  const resetToSystem = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setIsDarkMode(systemThemeMedia.matches);
  }, [systemThemeMedia]);

  // Memoize context value
  const contextValue = useMemo(() => ({
    isDarkMode,
    toggleTheme,
    resetToSystem
  }), [isDarkMode, toggleTheme, resetToSystem]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
  defaultTheme: PropTypes.oneOf(['dark', 'light', 'system'])
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Helper function for class name generation
export function getThemeClass(isDarkMode, baseClass, darkClass, lightClass) {
  return isDarkMode ? `${baseClass} ${darkClass}` : `${baseClass} ${lightClass}`;
}

// Helper for conditional styles
export function getThemeStyles(isDarkMode, { dark, light }) {
  return isDarkMode ? dark : light;
}
