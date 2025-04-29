import { useEffect } from "react";

/**
 * Custom hook for managing the document title
 * @param {string} title - The title to set for the document
 * @param {Object} options - Optional configuration
 * @param {string} [options.defaultTitle='QCheckCITE'] - Default title to use when title is empty
 * @param {boolean} [options.preserveOnUnmount=false] - Whether to preserve the title when component unmounts
 * @returns {void}
 * @example
 * // Basic usage
 * usePageTitle('Dashboard');
 * 
 * // With options
 * usePageTitle('Dashboard', { defaultTitle: 'My App', preserveOnUnmount: true });
 */
const usePageTitle = (title, options = {}) => {
  const {
    defaultTitle = 'QCheckCITE',
    preserveOnUnmount = false
  } = options;

  useEffect(() => {
    try {
      const previousTitle = document.title;
      document.title = title || defaultTitle;

      // Cleanup function
      return () => {
        if (!preserveOnUnmount) {
          document.title = previousTitle;
        }
      };
    } catch (error) {
      console.error('Error setting page title:', error);
    }
  }, [title, defaultTitle, preserveOnUnmount]);
};

export default usePageTitle;
