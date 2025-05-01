import { useState } from 'react';
import { toast } from 'react-toastify';

export function useErrorHandler() {
    const [error, setError] = useState(null);

    const handleError = (err) => {
        setError(err.message);
        toast.error(err.message || 'An error occurred');
    };

    return { error, setError, handleError };
} 