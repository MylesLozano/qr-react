import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { hasPermission } from './utils/roleUtils';
import { toast } from 'react-toastify';

function ProtectedRoute({ children, requiredRole, requiredAction }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    toast.error('Please log in to access this page');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && !hasPermission(role, requiredRole)) {
    toast.error('You do not have permission to access this page');
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  if (requiredAction && !canPerformAction(role, requiredAction)) {
    toast.error('You do not have permission to perform this action');
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;
