import React, { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import ProtectedRoute from "./ProtectedRoute";
import { auth, getUserRole } from "./firebase";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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

function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

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
    return <div className="flex justify-center items-center h-screen text-lg font-semibold">Verifying session...</div>;
  }

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} theme="colored" />
      <Suspense fallback={<div className="flex justify-center items-center h-screen">Loading...</div>}>
        <Routes>
          {/* Login Route */}
          <Route path="/login" element={isAuthenticated ? <Navigate to={getDashboardPath(role)} /> : <Login />} />
          
          {/* SuperAdmin Routes */}
          <Route path="/superadmin-dashboard" element={<ProtectedRoute isAuthenticated={role === "superadmin"}><SuperAdminDashboard /></ProtectedRoute>} />
          <Route path="/superadmin-dashboard/manage-users" element={<ProtectedRoute isAuthenticated={role === "superadmin"}><SuperAdminDashboard /></ProtectedRoute>} />
          <Route path="/superadmin-dashboard/audit-logs" element={<ProtectedRoute isAuthenticated={role === "superadmin"}><SuperAdminDashboard /></ProtectedRoute>} />
          
          {/* Admin Routes */}
          <Route path="/admin-dashboard" element={<ProtectedRoute isAuthenticated={role === "admin"}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin-dashboard/requests" element={<ProtectedRoute isAuthenticated={role === "admin"}><Requests /></ProtectedRoute>} />
          <Route path="/admin-dashboard/reports" element={<ProtectedRoute isAuthenticated={role === "admin"}><Reports /></ProtectedRoute>} />
          <Route path="/admin-dashboard/users" element={<ProtectedRoute isAuthenticated={role === "admin"}><UserManagement /></ProtectedRoute>} />
          
          {/* Shared Routes */}
          <Route path="/inventory" element={
            <ProtectedRoute isAuthenticated={["superadmin", "admin", "user"].includes(role)}>
              <Inventory />
            </ProtectedRoute>
          } />
          
          {/* User Routes */}
          <Route path="/user-dashboard" element={<ProtectedRoute isAuthenticated={role === "user"}><UserDashboard /></ProtectedRoute>} />
          <Route path="/user-dashboard/my-requests" element={<ProtectedRoute isAuthenticated={role === "user"}><MyRequests /></ProtectedRoute>} />
          
          {/* Catch-All Redirect */}
          <Route path="*" element={<Navigate to={isAuthenticated ? getDashboardPath(role) : "/login"} />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;