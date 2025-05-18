/**
 * Custom Hook Template
 *
 * This is a template for creating new React hooks in the QCheckCITE project.
 * Copy this file and modify it to create a new hook with consistent structure.
 *
 * @module useHookTemplate
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

/**
 * Hook description goes here.
 * Explain what this hook does and when to use it.
 *
 * @hook
 * @param {Object} initialData - Initial data for the hook
 * @param {Object} options - Options for configuring the hook behavior
 * @param {boolean} [options.enabled=true] - Whether the hook functionality is enabled
 * @param {Function} [options.onSuccess] - Callback for successful operations
 * @param {Function} [options.onError] - Callback for error handling
 * @returns {Object} The hook's return values
 * @returns {boolean} return.loading - Whether an operation is in progress
 * @returns {Object|null} return.data - The current data state
 * @returns {string|null} return.error - Error message if an error occurred
 * @returns {Function} return.handleAction - Function to perform the main action
 * @returns {Function} return.reset - Function to reset the hook state
 */
function useHookTemplate(initialData = null, options = {}) {
  // Default options
  const { enabled = true, onSuccess = () => {}, onError = () => {} } = options;

  // State management
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Refs for keeping track of mounted state and latest callbacks
  const isMounted = useRef(true);
  const latestOnSuccess = useRef(onSuccess);
  const latestOnError = useRef(onError);

  // Update refs when callbacks change
  useEffect(() => {
    latestOnSuccess.current = onSuccess;
    latestOnError.current = onError;
  }, [onSuccess, onError]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Main action handler
  const handleAction = useCallback(
    async (actionData) => {
      if (!enabled) return;

      setLoading(true);
      setError(null);

      try {
        // Perform the action
        const result = await processData(actionData);

        // Only update state if component is still mounted
        if (isMounted.current) {
          setData(result);
          latestOnSuccess.current(result);
        }

        return result;
      } catch (err) {
        console.error('Error in hook action:', err);

        // Only update state if component is still mounted
        if (isMounted.current) {
          setError(err.message || 'An unknown error occurred');
          latestOnError.current(err);
        }

        return null;
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    },
    [enabled]
  );

  // Example helper function
  const processData = async (inputData) => {
    // Simulate async processing
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          ...inputData,
          processed: true,
          timestamp: new Date().toISOString(),
        });
      }, 500);
    });
  };

  // Reset the hook state
  const reset = useCallback(() => {
    setData(initialData);
    setLoading(false);
    setError(null);
  }, [initialData]);

  // Memoized derived data
  const processedData = useMemo(() => {
    if (!data) return null;

    return {
      ...data,
      isProcessed: true,
    };
  }, [data]);

  // Return values and methods
  return {
    data: processedData,
    loading,
    error,
    handleAction,
    reset,
  };
}

export default useHookTemplate;
