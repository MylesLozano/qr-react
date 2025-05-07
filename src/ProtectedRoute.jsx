// File: src/ProtectedRoute.jsx
// This component is a wrapper around route elements that enforces authentication and role/action-based authorization.
// It checks if a user is logged in and has the necessary permissions to access the requested route.

import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
// hasPermission: checks if a user's role meets a required role (e.g., admin for admin-only pages)
// canPerformAction: checks if a user's role is allowed to perform a specific action (e.g., 'generate_reports')
// getDashboardPath: returns the default dashboard path for a given role
import { hasPermission, canPerformAction, getDashboardPath } from './utils/roleUtils';
import { toast } from 'react-toastify';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';


// ProtectedRoute component props:
// children: The component(s) to render if the user is authorized.
// requiredRole: The minimum role required to access the route (e.g., 'admin', 'superadmin'). Optional.
// requiredAction: A specific action permission required to access the route (e.g., 'manage_users'). Optional.
function ProtectedRoute({ children, requiredRole, requiredAction }) {
  const { user, role, loading, error } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [delayedAuth, setDelayedAuth] = useState(true);

  // Add a slight delay to ensure all auth processes complete
  useEffect(() => {
    const timer = setTimeout(() => {
      setDelayedAuth(false);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  // Effect to display authentication errors as toasts
  useEffect(() => {
    if (error) {
      toast.error('Authentication error: ' + error.message);
    }
  }, [error]);

  // Effect for login-related toasts
  useEffect(() => {
    if (!user && location.pathname !== '/login') {
      toast.error('Please log in to access this page');
    }
  }, [user, location.pathname]);

  // Effect for permission-related toasts
  useEffect(() => {
    if (user && requiredRole && !hasPermission(role, requiredRole)) {
      toast.error('You do not have permission to access this page');
    }
    if (user && requiredAction && !canPerformAction(role, requiredAction)) {
      toast.error('You do not have permission to perform this action');
    }
  }, [user, role, requiredRole, requiredAction]);

  // Helper function to handle navigation programmatically
  const navigateToPath = (path) => {
    // Use navigate instead of Navigate component for better state handling
    navigate(path, { replace: true });
  };

  // --- Routing and Authorization Logic ---

  // 1. Handle loading state: Show a spinner while authentication state is being determined.
  if (loading || delayedAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen" role="status" aria-label="Loading authentication status">
        <LoadingSpinner fullScreen />
      </div>
    );
  }

  // 2. Handle unauthenticated users: If the user is not logged in...
  if (!user) {
    // If the user is trying to access the login page, render the Login component.
    if (location.pathname === '/login') {
      return children; // Render the Login component provided as children
    }
    // If the user is not logged in and trying to access any other page,
    // show a toast and redirect them to the login page.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Handle authenticated users: If the user is logged in...
  if (user) {
    // If the authenticated user is on the login page, redirect them to their appropriate dashboard.
    if (location.pathname === '/login') {
      const dashboardPath = getDashboardPath(role); // Get the dashboard path based on the user's role
      // Redirect to the dashboard if a valid path is found and it's not the login page itself
      if (dashboardPath && dashboardPath !== '/login') {
        return <Navigate to={dashboardPath} replace />; // Redirect to the user's dashboard
      } else {
        // This case should ideally not happen if getDashboardPath is configured correctly.
        // It might indicate an issue with the user's role or the dashboard path configuration.
        // For now, we fall through, which means the Login component will be rendered (if children for /login is Login),
        // but a more robust application might redirect to a generic safe page or show an error.
        console.warn("ProtectedRoute: User logged in at /login, but calculated dashboard path is invalid or '/login'.");
      }
    }

    // For any protected route (not /login), check required permissions.

    // Check if a specific role is required and if the user's role meets that requirement.
    if (requiredRole && !hasPermission(role, requiredRole)) {
      // If the user does not have the required role,
      // show a permission denied toast and redirect them to their dashboard.
      setTimeout(() => {
        navigateToPath(getDashboardPath(role));
      }, 100);

      return (
        <div className="flex items-center justify-center min-h-screen" role="status">
          <LoadingSpinner fullScreen />
        </div>
      );
    }

    // Check if a specific action permission is required and if the user's role can perform that action.
    // Note: This is often used for more granular control *within* a dashboard,
    // while requiredRole controls access to the dashboard section itself.
    if (requiredAction && !canPerformAction(role, requiredAction)) {
      // If the user cannot perform the required action,
      // show a permission denied toast and redirect them to their dashboard.
      setTimeout(() => {
        navigateToPath(getDashboardPath(role));
      }, 100);

      return (
        <div className="flex items-center justify-center min-h-screen" role="status">
          <LoadingSpinner fullScreen />
        </div>
      );
    }

    // If the user is logged in and has all necessary role and action permissions,
    // render the protected content.
    return (
      <ErrorBoundary> {/* Wrap children with ErrorBoundary for error handling within protected routes */}
        {children} {/* Render the component(s) for the matched protected route */}
      </ErrorBoundary>
    );
  }

  // Fallback: This part of the code should theoretically be unreachable given the checks above.
  // If somehow we reach here, it indicates an unexpected state.
  // As a safety measure, we could redirect to login, but the current logic covers all cases.
  // console.warn("ProtectedRoute: Reached end of logic without explicit return. Unexpected state.");
  // return <Navigate to="/login" state={{ from: location }} replace />;
}

export default ProtectedRoute;