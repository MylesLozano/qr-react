import { Routes, Route, Navigate } from 'react-router-dom';
import BaseDashboard from '../BaseDashboard';
import UserManagement from '../../components/users/UserManagement';
import Inventory from '../Inventory';
import Requests from '../admin/Requests';
import UnifiedReporting from '../UnifiedReporting';
import ReportTemplates from '../admin/ReportTemplates';
import ReportGenerator from '../admin/ReportGenerator';
import usePageTitle from '../../hooks/usePageTitle';
import ErrorBoundary from '../../components/ErrorBoundary';
import ProtectedRoute from '../../ProtectedRoute';
import { useAuth } from '../../hooks/useAuth';
import { useState, useEffect } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

/**
 * SuperAdminDashboard component - Main dashboard for superadmin users
 * @component
 * @returns {JSX.Element} The rendered SuperAdminDashboard component
 */
function SuperAdminDashboard() {
  usePageTitle('QCheckCITE - SuperAdmin Dashboard');
  // Removed isDarkMode as it's not being used in this component
  const { role } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Add a small delay to ensure components are properly loaded
    console.info('SuperAdminDashboard mounted, role:', role);

    const timer = setTimeout(() => {
      setIsReady(true);
      console.info('SuperAdminDashboard ready to render');
    }, 800);

    return () => clearTimeout(timer);
  }, [role]);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner text="Loading SuperAdmin Dashboard..." />
      </div>
    );
  }  return (
    <ErrorBoundary>
      <BaseDashboard role="superadmin">
        <div className="w-full h-full flex flex-col">
          <Routes>
            <Route path="/" element={<Navigate to="user-management" replace />} />
            <Route
              path="inventory"
              element={
                <ProtectedRoute requiredAction="view_inventory">
                  <Inventory />
                </ProtectedRoute>
              }
            />
            <Route
              path="requests"
              element={
                <ProtectedRoute requiredAction="manage_requests">
                  <Requests />
                </ProtectedRoute>
              }
            />
            <Route
              path="reporting"
              element={
                <ProtectedRoute requiredAction="generate_reports">
                  <UnifiedReporting />
                </ProtectedRoute>
              }
            />
            <Route
              path="templates"
              element={
                <ProtectedRoute requiredAction="manage_templates">
                  <ReportTemplates />
                </ProtectedRoute>
              }
            />
            <Route
              path="generate-report"
              element={
                <ProtectedRoute requiredAction="generate_reports">
                  <ReportGenerator />
                </ProtectedRoute>
              }
            />
            <Route
              path="user-management"
              element={
                <ProtectedRoute requiredAction="manage_users">
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="user-management/*"
              element={<Navigate to="/superadmin-dashboard/user-management" replace />}
            />
            <Route
              path="*"
              element={<Navigate to="/superadmin-dashboard/user-management" replace />}
            />
          </Routes>
        </div>
      </BaseDashboard>
    </ErrorBoundary>
  );
}

export default SuperAdminDashboard;
