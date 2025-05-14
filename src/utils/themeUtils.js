// Theme constants and utility functions
export const THEME_STORAGE_KEY = "qcheckcite-theme-preference";
export const DARK_THEME_CLASS = "dark";

/**
 * Returns the appropriate class name based on the current theme mode
 *
 * @param {boolean} isDarkMode - Whether dark mode is active
 * @param {Object} options - Object containing class names for dark and light modes
 * @param {string} options.dark - Class name for dark mode
 * @param {string} options.light - Class name for light mode
 * @returns {string} The selected class name
 */
export const getThemeStyles = (isDarkMode, options) => {
  return isDarkMode ? options.dark : options.light;
};

export const getSystemThemePreference = () => {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

export const getStoredThemePreference = () => {
  return localStorage.getItem(THEME_STORAGE_KEY);
};

export const setStoredThemePreference = (theme) => {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
};

export const toggleRootClass = (isDark) => {
  document.documentElement.classList.toggle(DARK_THEME_CLASS, isDark);
};
