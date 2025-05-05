// File: src/ProtectedRoute.jsx

import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { hasPermission, canPerformAction, getDashboardPath } from './utils/roleUtils'; // Ensure correct import paths
import { toast } from 'react-toastify';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary'; // Ensure correct import paths


function ProtectedRoute({ children, requiredRole, requiredAction }) {
  const { user, role, loading, error } = useAuth();
  const location = useLocation();

  // Optional: Effect for showing toasts based on auth/permission status on mount/state change
  // Be mindful of when these toasts show - having them inside conditional renders is often better.
  useEffect(() => {
    if (error) {
      toast.error('Authentication error: ' + error.message);
    }
    // Decide when you want the "Please log in" toast to appear
    // Currently, your Login.jsx useEffect handles navigation and implicitly requires user/role
    // If you want a toast only when trying to access a protected page while logged out:
    // if (!user && !loading && location.pathname !== '/login') {
    //     toast.error('Please log in to access this page');
    // }

    // Toasts for permission denied are handled by the Navigate components below
  }, [error, user, loading, location.pathname]); // Added loading and location.pathname to deps


  // --- Routing Logic ---

  // 1. While authentication state is loading, show a spinner.
  if (loading) {
    // console.log("ProtectedRoute: Loading authentication state..."); // Debug log
    return (
      <div className="flex items-center justify-center min-h-screen" role="status" aria-label="Loading authentication status">
        <LoadingSpinner fullScreen />
      </div>
    );
  }

  // 2. If user is NOT logged in...
  if (!user) {
    // console.log("ProtectedRoute: User not authenticated."); // Debug log
      // If the current path is /login, render the children (the Login component).
    if (location.pathname === '/login') {
        // console.log("ProtectedRoute: Currently on /login, rendering Login component."); // Debug log
      return children; // Render the Login component
    }
      // If the current path is NOT /login, redirect to /login.
    // console.log(`ProtectedRoute: Not authenticated and not on /login (${location.pathname}), redirecting to /login.`); // Debug log
    // You might want to move the "Please log in" toast here if you want it only on redirect
    toast.error('Please log in to access this page'); // Show toast on redirect
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. If user IS logged in...
  if (user) {
     // console.log(`ProtectedRoute: User authenticated. Role: ${role}, Path: ${location.pathname}`); // Debug log

      // Check if the authenticated user is currently on the /login page.
    if (location.pathname === '/login') {
        const dashboardPath = getDashboardPath(role); // Get the correct dashboard path based on the user's role
        // console.log(`ProtectedRoute: User logged in at /login. Calculated dashboard path: ${dashboardPath}`); // Debug log

        // If a valid dashboard path is found and it's not '/login' itself, redirect.
      if (dashboardPath && dashboardPath !== '/login') {
          // console.log(`ProtectedRoute: Redirecting authenticated user from /login to ${dashboardPath}`); // Debug log
        return <Navigate to={dashboardPath} replace />; // <-- Redirect to the dashboard
      } else {
          // console.warn("ProtectedRoute: User logged in at /login, but calculated dashboard path is invalid or '/login'. Not redirecting."); // Debug log
          // This case indicates a potential issue with getDashboardPath or user role data.
          // You might want to redirect to a default authenticated page (like home) or show an error.
          // For now, it will fall through and render children, which for the /login route is the Login component.
          // This is why you were stuck - because this redirect logic was missing entirely.
          // Consider adding a redirect to a safe route if getDashboardPath fails, e.g.:
          // return <Navigate to="/" replace />; // Redirect to homepage if it exists and is safe
      }
    }

      // If the user is logged in and is trying to access a protected route (not /login), check permissions.
    if (requiredRole && !hasPermission(role, requiredRole)) {
        // console.log(`ProtectedRoute: Permission denied. User role: ${role}, Required role: ${requiredRole}`); // Debug log
      toast.error('You do not have permission to access this page'); // Show toast
      return <Navigate to={getDashboardPath(role)} state={{ from: location }} replace />; // Redirect to their dashboard
    }

    if (requiredAction && !canPerformAction(role, requiredAction)) {
        // console.log(`ProtectedRoute: Permission denied. User role: ${role}, Required action: ${requiredAction}`); // Debug log
      toast.error('You do not have permission to perform this action'); // Show toast
      return <Navigate to={getDashboardPath(role)} state={{ from: location }} replace />; // Redirect to their dashboard
    }

    // If logged in and has the necessary permissions for this route, render the protected content.
    // console.log(`ProtectedRoute: User authenticated and has permissions. Rendering children for ${location.pathname}`); // Debug log
    return (
      <ErrorBoundary> {/* Assuming ErrorBoundary is correctly implemented */}
        {children} {/* Render the component for the matched route */}
      </ErrorBoundary>
    );
  }

  // Fallback: If somehow the logic above doesn't result in a return,
  // which theoretically shouldn't happen with the current structure,
  // you might have a default render or redirect.
  // Given the `if (!user)` and `if (user)` structure, all paths should be covered.
  // Adding a final fallback redirect to login for safety in case of unexpected state:
  // console.warn("ProtectedRoute: Reached end of logic without explicit return. Unexpected state.");
  // return <Navigate to="/login" state={{ from: location }} replace />;
}

export default ProtectedRoute;