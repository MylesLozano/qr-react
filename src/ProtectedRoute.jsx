import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { hasPermission, canPerformAction } from './utils/roleUtils';
import { toast } from 'react-toastify';
import LoadingSpinner from './components/LoadingSpinner';

function ProtectedRoute({ children, requiredRole, requiredAction }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    toast.error('Please log in to access this page');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && !hasPermission(role, requiredRole)) {
    toast.error('You do not have permission to access this page');
    return <Navigate to={getDashboardPath(role)} state={{ from: location }} replace />;
  }

  if (requiredAction && !canPerformAction(role, requiredAction)) {
    toast.error('You do not have permission to perform this action');
    return <Navigate to={getDashboardPath(role)} state={{ from: location }} replace />;
  }

  return children;
}

const getDashboardPath = (role) => {
  switch (role) {
    case "superadmin": return "/superadmin-dashboard";
    case "admin": return "/admin-dashboard";
    case "user": return "/user-dashboard";
    default: return "/login";
  }
};

export default ProtectedRoute;
