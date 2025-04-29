import React, { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./Login";
import ProtectedRoute from "./ProtectedRoute";
import { auth, getUserRole } from "./firebase";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ErrorBoundary from "./components/ErrorBoundary";
import LoadingSpinner from "./components/LoadingSpinner";
import { ThemeProvider } from "./context/ThemeContext";
import { canPerformAction } from './utils/roleUtils';

const getDashboardPath = (role) => {
  switch (role) {
    case "superadmin": return "/superadmin-dashboard";
    case "admin": return "/admin-dashboard";
    case "user": return "/user-dashboard";
    default: return "/login";
  }
};

// Lazy load dashboards
const SuperAdminDashboard = lazy(() => import("./dashboard/superadmin/SuperAdminDashboard"));
const AdminDashboard = lazy(() => import("./dashboard/admin/AdminDashboard"));
const UserDashboard = lazy(() => import("./dashboard/user/UserDashboard"));
const Inventory = lazy(() => import("./dashboard/Inventory"));
const AuditLogs = lazy(() => import("./dashboard/superadmin/AuditLogs"));
const ManageUsers = lazy(() => import("./dashboard/superadmin/ManageUsers"));
const MyRequests = lazy(() => import("./dashboard/user/MyRequests"));
const Requests = lazy(() => import("./dashboard/admin/Requests"));
const Reports = lazy(() => import("./dashboard/admin/Reports"));
const UserManagement = lazy(() => import("./dashboard/admin/UserManagement"));
const InventoryCategories = lazy(() => import('./dashboard/admin/InventoryCategories'));
const ReportTemplates = lazy(() => import('./dashboard/admin/ReportTemplates'));
const ReportGenerator = lazy(() => import('./dashboard/admin/ReportGenerator'));

function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // Track page views
  useEffect(() => {
    if (user) {
      // Here you would typically send analytics data
      console.log(`Page view: ${location.pathname} by ${user.email}`);
    }
  }, [location.pathname, user]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser && currentUser.email.endsWith("@jmc.edu.ph")) {
        setUser(currentUser);
        const userRole = await getUserRole(currentUser.uid);
        setRole(userRole);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const isAuthenticated = useMemo(() => user !== null, [user]);

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} theme="colored" />
        <Suspense fallback={<LoadingSpinner fullScreen />}>
          <Routes>
            {/* Login Route */}
            <Route path="/login" element={isAuthenticated ? <Navigate to={getDashboardPath(role)} /> : <Login />} />

            {/* SuperAdmin Routes */}
            <Route path="/superadmin-dashboard" element={
              <ProtectedRoute requiredRole="superadmin">
                <SuperAdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/superadmin-dashboard/manage-users" element={
              <ProtectedRoute requiredAction="manage_users">
                <ManageUsers />
              </ProtectedRoute>
            } />
            <Route path="/superadmin-dashboard/audit-logs" element={
              <ProtectedRoute requiredAction="view_audit_logs">
                <AuditLogs />
              </ProtectedRoute>
            } />

            {/* Admin Routes */}
            <Route path="/admin-dashboard" element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="inventory" replace />} />
              <Route path="inventory" element={
                <ProtectedRoute requiredAction="view_inventory">
                  <Inventory />
                </ProtectedRoute>
              } />
              <Route path="requests" element={
                <ProtectedRoute requiredAction="manage_requests">
                  <Requests />
                </ProtectedRoute>
              } />
              <Route path="reports" element={
                <ProtectedRoute requiredAction="generate_reports">
                  <Reports />
                </ProtectedRoute>
              } />
              <Route path="categories" element={
                <ProtectedRoute requiredAction="manage_categories">
                  <InventoryCategories />
                </ProtectedRoute>
              } />
              <Route path="templates" element={
                <ProtectedRoute requiredAction="manage_templates">
                  <ReportTemplates />
                </ProtectedRoute>
              } />
              <Route path="generate-report" element={
                <ProtectedRoute requiredAction="generate_reports">
                  <ReportGenerator />
                </ProtectedRoute>
              } />
            </Route>
            <Route path="/admin-dashboard/users" element={<ProtectedRoute isAuthenticated={role === "admin"}><UserManagement /></ProtectedRoute>} />

            {/* Shared Routes */}
            <Route path="/inventory" element={
              <ProtectedRoute isAuthenticated={["superadmin", "admin", "user"].includes(role)}>
                <Inventory />
              </ProtectedRoute>
            } />

            {/* User Routes */}
            <Route path="/user-dashboard" element={
              <ProtectedRoute requiredRole="user">
                <UserDashboard />
              </ProtectedRoute>
            } />
            <Route path="/user-dashboard/my-requests" element={
              <ProtectedRoute requiredRole="user">
                <MyRequests />
              </ProtectedRoute>
            } />

            {/* Catch-All Redirect */}
            <Route path="*" element={<Navigate to={isAuthenticated ? getDashboardPath(role) : "/login"} />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;