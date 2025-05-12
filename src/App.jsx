import { lazy, Suspense, useMemo, useEffect } from "react";
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
import { useAuth } from "./hooks/useAuth";

// Core components that are used across multiple routes

// Feature-specific components
const Inventory = lazy(() => import("./dashboard/Inventory"));
const UnifiedReporting = lazy(() => import("./dashboard/UnifiedReporting"));

// Admin-specific components
const AdminDashboard = lazy(() => import("./dashboard/admin/AdminDashboard"));
const InventoryCategories = lazy(() => import('./dashboard/admin/InventoryCategories'));
const ReportTemplates = lazy(() => import('./dashboard/admin/ReportTemplates'));
const ReportGenerator = lazy(() => import("./dashboard/admin/ReportGenerator"));
const Requests = lazy(() => import("./dashboard/admin/Requests"));

// User-specific components
const UserDashboard = lazy(() => import("./dashboard/user/UserDashboard"));
const MyRequests = lazy(() => import("./dashboard/user/MyRequests"));
const QRScanner = lazy(() => import("./components/QRScanner"));

// Superadmin-specific components
const SuperAdminDashboard = lazy(() => import("./dashboard/superadmin/SuperAdminDashboard"));
const UserManagement = lazy(() => import("./components/users/UserManagement"));

// Constants
const SESSION_TIMEOUT_MINUTES = 30;
const SESSION_WARNING_MINUTES = 5;
const TOAST_AUTO_CLOSE = 3000;

/**
 * App component - Main application router and layout
 * @component
 * @returns {JSX.Element} The rendered App component
 */
function App() {
  const { user, role, loading } = useAuth();
  const location = useLocation();
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
              import("./components/users/UserManagement"),
              import("./dashboard/Inventory")
            ]);
            break;
          case 'admin':
            await Promise.all([
              import("./dashboard/admin/AdminDashboard"),
              import("./dashboard/admin/Requests"),
              import("./dashboard/admin/ReportGenerator"),
              import("./dashboard/UnifiedReporting"),
              import("./dashboard/Inventory")
            ]);
            break;
          case 'user':
            await Promise.all([
              import("./dashboard/user/UserDashboard"),
              import("./dashboard/user/MyRequests"),
              import("./dashboard/Inventory")
            ]);
            break;
        }
      };
      preloadComponents();
    }
  }, [role]);

  // Track page views and analytics
  useEffect(() => {
    if (user) {
      // Here you would typically send analytics data
      console.log(`Page view: ${location.pathname} by ${user.email}`);
    }
  }, [location.pathname, user]);

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
            <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to={getDashboardPath(role)} replace />} />
            <Route path="/" element={isAuthenticated ? <Navigate to={getDashboardPath(role)} replace /> : <Navigate to="/login" replace />} />

            {/* Superadmin Routes */}
            <Route
              path="/superadmin-dashboard/*"
              element={<ProtectedRoute requiredRole="superadmin"><SuperAdminDashboard /></ProtectedRoute>}
            >
              <Route path="user-management" element={<ProtectedRoute requiredRole="superadmin" requiredAction="manage_users"><UserManagement /></ProtectedRoute>} />
            </Route>

            {/* Admin Routes */}
            <Route
              path="/admin-dashboard/*"
              element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>}
            >
              <Route path="inventory" element={<ProtectedRoute requiredRole="admin" requiredAction="view_inventory"><Inventory /></ProtectedRoute>} />
              <Route path="categories" element={<ProtectedRoute requiredRole="admin" requiredAction="manage_categories"><InventoryCategories /></ProtectedRoute>} />
              <Route path="requests" element={<ProtectedRoute requiredRole="admin" requiredAction="manage_requests"><Requests /></ProtectedRoute>} />
              <Route path="templates" element={<ProtectedRoute requiredRole="admin" requiredAction="manage_templates"><ReportTemplates /></ProtectedRoute>} />
              <Route path="reporting" element={<ProtectedRoute requiredRole="admin" requiredAction="generate_reports"><UnifiedReporting /></ProtectedRoute>} />
              <Route path="generate-report" element={<ProtectedRoute requiredRole="admin" requiredAction="generate_reports"><ReportGenerator /></ProtectedRoute>} />
              <Route path="user-management" element={<ProtectedRoute requiredRole="admin" requiredAction="manage_users"><UserManagement /></ProtectedRoute>} />
            </Route>

            {/* User Routes */}
            <Route
              path="/user-dashboard/*"
              element={<ProtectedRoute requiredRole="user"><UserDashboard /></ProtectedRoute>}
            />

            {/* Direct access routes for common user actions */}
            <Route path="/scan-qr" element={<ProtectedRoute requiredRole="user" requiredAction="view_inventory">
              <QRScanner />
            </ProtectedRoute>} />

            <Route path="/my-requests" element={<ProtectedRoute requiredRole="user" requiredAction="view_requests">
              <MyRequests />
            </ProtectedRoute>} />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to={isAuthenticated ? getDashboardPath(role) : "/login"} replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;