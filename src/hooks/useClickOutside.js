/**
 * Custom hook for detecting clicks outside a specific element
 * Used for dropdown menus and modals
 */

import { useEffect } from 'react';

/**
 * Hook that alerts when clicked outside of the specified element
 * @param {React.RefObject} ref - Reference to the DOM element to monitor
 * @param {Function} callback - Function to call when a click outside is detected
 */
export function useClickOutside(ref, callback) {
  useEffect(() => {
    /**
     * Handle click event
     * @param {Event} event - Click event
     */
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        callback();
      }
    }

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);

    // Clean up event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, callback]);
}
