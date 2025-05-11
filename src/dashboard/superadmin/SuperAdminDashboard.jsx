import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import BaseDashboard from "../BaseDashboard";
import ManageUsers from "./ManageUsers";
import Inventory from "../Inventory";
import Requests from "../admin/Requests";
import UnifiedReporting from "../UnifiedReporting";
import ReportTemplates from "../admin/ReportTemplates";
import ReportGenerator from "../admin/ReportGenerator";
import usePageTitle from "../../hooks/usePageTitle";
import { useTheme } from "../../context/ThemeContext";
import ErrorBoundary from "../../components/ErrorBoundary";
import ProtectedRoute from "../../ProtectedRoute";

/**
 * SuperAdminDashboard component - Main dashboard for superadmin users
 * @component
 * @returns {JSX.Element} The rendered SuperAdminDashboard component
 */
function SuperAdminDashboard() {
  usePageTitle("QCheckCITE - SuperAdmin Dashboard");
  const { isDarkMode } = useTheme();

  return (
    <ErrorBoundary>
      <BaseDashboard role="superadmin">
        <div className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>
          <Routes>
            <Route path="/" element={<Navigate to="user-management" replace />} />
            <Route path="inventory" element={<ProtectedRoute requiredAction="view_inventory"><Inventory /></ProtectedRoute>} />
            <Route path="requests" element={<ProtectedRoute requiredAction="manage_requests"><Requests /></ProtectedRoute>} />
            <Route path="reporting" element={<ProtectedRoute requiredAction="generate_reports"><UnifiedReporting /></ProtectedRoute>} />
            <Route path="templates" element={<ProtectedRoute requiredAction="manage_templates"><ReportTemplates /></ProtectedRoute>} />
            <Route path="generate-report" element={<ProtectedRoute requiredAction="generate_reports"><ReportGenerator /></ProtectedRoute>} />
            <Route path="user-management" element={<ProtectedRoute requiredAction="manage_users"><ManageUsers /></ProtectedRoute>} />
            <Route path="user-management/*" element={<Navigate to="/superadmin-dashboard/user-management" replace />} />
            <Route path="*" element={<Navigate to="/superadmin-dashboard/user-management" replace />} />
          </Routes>
        </div>
      </BaseDashboard>
    </ErrorBoundary>
  );
}

export default SuperAdminDashboard;