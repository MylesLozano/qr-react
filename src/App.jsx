import React, { lazy, Suspense, useMemo, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./Login";
import ProtectedRoute from "./ProtectedRoute";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ErrorBoundary from "./components/ErrorBoundary";
import LoadingSpinner from "./components/LoadingSpinner";
import { ThemeProvider } from "./context/ThemeContext";
import { getDashboardPath } from './utils/roleUtils';
import SessionTimeout from "./components/SessionTimeout";
import { useAuth } from "./context/AuthContext";
import ReportGenerator from "./dashboard/admin/ReportGenerator";

// Constants
const SESSION_TIMEOUT_MINUTES = 30;
const SESSION_WARNING_MINUTES = 5;
const TOAST_AUTO_CLOSE = 3000;

// Lazy load dashboards with preload hints
const SuperAdminDashboard = lazy(() => import("./dashboard/superadmin/SuperAdminDashboard"));
const AdminDashboard = lazy(() => import("./dashboard/admin/AdminDashboard"));
const UserDashboard = lazy(() => import("./dashboard/user/UserDashboard"));
const Inventory = lazy(() => import("./dashboard/Inventory"));
const ManageUsers = lazy(() => import("./dashboard/superadmin/ManageUsers"));
const MyRequests = lazy(() => import("./dashboard/user/MyRequests"));
const Requests = lazy(() => import("./dashboard/admin/Requests"));
const UserManagement = lazy(() => import("./dashboard/admin/UserManagement"));
const InventoryCategories = lazy(() => import('./dashboard/admin/InventoryCategories'));
const ReportTemplates = lazy(() => import('./dashboard/admin/ReportTemplates'));
const UnifiedReporting = lazy(() => import("./dashboard/UnifiedReporting"));

// Route configurations
const ROUTE_CONFIG = {
  superadmin: {
    path: "/superadmin-dashboard/*",
    element: <ProtectedRoute requiredRole="superadmin"><SuperAdminDashboard /></ProtectedRoute>,
    children: [
      { path: "", element: <Navigate to="user-management" replace /> },
      { path: "inventory", element: <Inventory /> },
      { path: "requests", element: <Requests /> },
      { path: "reporting", element: <UnifiedReporting /> },
      { path: "user-management", element: <ManageUsers /> }
    ]
  },
  admin: {
    path: "/admin-dashboard",
    element: <ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>,
    children: [
      { path: "", element: <Navigate to="inventory" replace /> },
      { path: "inventory", element: <ProtectedRoute requiredAction="view_inventory"><Inventory /></ProtectedRoute> },
      { path: "requests", element: <ProtectedRoute requiredAction="manage_requests"><Requests /></ProtectedRoute> },
      { path: "reporting", element: <UnifiedReporting /> },
      { path: "categories", element: <ProtectedRoute requiredAction="manage_categories"><InventoryCategories /></ProtectedRoute> },
      { path: "templates", element: <ProtectedRoute requiredAction="manage_templates"><ReportTemplates /></ProtectedRoute> },
    ]
  },
  user: {
    path: "/user-dashboard",
    element: <ProtectedRoute requiredRole="user"><UserDashboard /></ProtectedRoute>,
    children: [
      { path: "my-requests", element: <MyRequests /> }
    ]
  }
};

/**
 * App component - Main application router and layout
 * @component
 * @returns {JSX.Element} The rendered App component
 */
function App() {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  // Track page views and analytics
  useEffect(() => {
    if (user) {
      // Here you would typically send analytics data
      console.log(`Page view: ${location.pathname} by ${user.email}`);
    }
  }, [location.pathname, user]);

  const isAuthenticated = useMemo(() => user !== null, [user]);

  // Preload dashboard components based on user role
  useEffect(() => {
    if (role) {
      const preloadComponents = async () => {
        switch (role) {
          case 'superadmin':
            await Promise.all([
              import("./dashboard/superadmin/SuperAdminDashboard"),
              import("./dashboard/UnifiedReporting"),
              import("./dashboard/superadmin/ManageUsers")
            ]);
            break;
          case 'admin':
            await Promise.all([
              import("./dashboard/admin/AdminDashboard"),
              import("./dashboard/admin/Requests"),
              import("./dashboard/UnifiedReporting")
            ]);
            break;
          case 'user':
            await import("./dashboard/user/UserDashboard");
            break;
        }
      };
      preloadComponents();
    }
  }, [role]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" role="status" aria-label="Loading application">
        <LoadingSpinner fullScreen />
      </div>
    );
  }

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <ToastContainer
          position="top-right"
          autoClose={TOAST_AUTO_CLOSE}
          hideProgressBar={false}
          theme="colored"
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
        {isAuthenticated && (
          <SessionTimeout
            timeoutMinutes={SESSION_TIMEOUT_MINUTES}
            warningMinutes={SESSION_WARNING_MINUTES}
          />
        )}
        <Suspense fallback={<LoadingSpinner fullScreen />}>
          <Routes>
            {/* Login Route */}
            <Route
              path="/login"
              element={isAuthenticated ? <Navigate to={getDashboardPath(role)} /> : <Login />}
            />

            {/* SuperAdmin Routes */}
            <Route {...ROUTE_CONFIG.superadmin}>
              {ROUTE_CONFIG.superadmin.children.map((route, index) => (
                <Route key={index} {...route} />
              ))}
            </Route>

            {/* Admin Routes */}
            <Route {...ROUTE_CONFIG.admin}>
              {ROUTE_CONFIG.admin.children.map((route, index) => (
                <Route key={index} {...route} />
              ))}
            </Route>
            <Route
              path="/admin-dashboard/users"
              element={
                <ProtectedRoute requiredAction="manage_users">
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route path="/admin-dashboard/generate-report" element={<ProtectedRoute requiredAction="generate_reports"><ReportGenerator /></ProtectedRoute>} />

            {/* Shared Routes */}
            {/* Example: A shared Inventory view if roles have different permissions for it */}
            {/* The specific Inventory route within admin dashboard is already permissioned */}
            {/* Add other shared routes here if necessary */}

            {/* User Routes */}
            <Route {...ROUTE_CONFIG.user}>
              {ROUTE_CONFIG.user.children.map((route, index) => (
                <Route key={index} {...route} />
              ))}
            </Route>

            {/* Catch-All Redirect */}
            <Route
              path="*"
              element={
                <Navigate
                  to={isAuthenticated ? getDashboardPath(role) : "/login"}
                  replace
                />
              }
            />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;