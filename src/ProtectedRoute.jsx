import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { hasPermission, canPerformAction, getDashboardPath } from './utils/roleUtils';
import { toast } from 'react-toastify';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';

function ProtectedRoute({ children, requiredRole, requiredAction }) {
  const { user, role, loading, error } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (error) {
      toast.error('Authentication error: ' + error.message);
    }

    if (!user) {
    toast.error('Please log in to access this page');
    } else if (requiredRole && !hasPermission(role, requiredRole)) {
      toast.error('You do not have permission to access this page');
    } else if (requiredAction && !canPerformAction(role, requiredAction)) {
      toast.error('You do not have permission to perform this action');
    }
  }, [error, user, role, requiredRole, requiredAction]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" role="status" aria-label="Loading authentication status">
        <LoadingSpinner fullScreen />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  if (requiredRole && !hasPermission(role, requiredRole)) {
    return <Navigate to={getDashboardPath(role)} state={{ from: location }} replace />;
  }
  
  if (requiredAction && !canPerformAction(role, requiredAction)) {
    return <Navigate to={getDashboardPath(role)} state={{ from: location }} replace />;
  }

  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}

export default ProtectedRoute;
