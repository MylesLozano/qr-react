// src/hooks/useInventoryValidation.js
import { useState, useCallback } from 'react';
import { validateItem } from '../utils/inventoryUtils';

export function useInventoryValidation(formData) {
  const [errors, setErrors] = useState({});

  const validate = useCallback(() => {
    const validationErrors = validateItem(formData);
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  }, [formData]);

  return {
    errors,
    validate,
  };
}
