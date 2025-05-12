// Theme constants and utility functions
export const THEME_STORAGE_KEY = "qcheckcite-theme-preference";
export const DARK_THEME_CLASS = "dark";

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
