import React, { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import BaseDashboard from "../BaseDashboard";
import ManageUsers from "./ManageUsers";
import Inventory from "../Inventory";
import Requests from "../admin/Requests";
import UnifiedReporting from "../UnifiedReporting";
import usePageTitle from "../../hooks/usePageTitle";
import { useTheme } from "../../context/ThemeContext";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorBoundary from "../../components/ErrorBoundary";

/**
 * SuperAdminDashboard component - Main dashboard for superadmin users
 * @component
 * @returns {JSX.Element} The rendered SuperAdminDashboard component
 */
function SuperAdminDashboard() {
  usePageTitle("QCheckCITE - SuperAdmin Dashboard");
  const { isDarkMode } = useTheme();
  const location = useLocation();

  // Determine active page based on exact path match
  const getActivePage = useCallback(() => {
    const path = location.pathname.split('/').pop();
    switch (path) {
      case 'inventory':
        return 'inventory';
      case 'requests':
        return 'requests';
      case 'reporting':
        return 'reporting';
      case 'user-management':
        return 'userManagement';
      default:
        return 'userManagement';
    }
  }, [location.pathname]);

  const [activePage, setActivePage] = useState(getActivePage);

  useEffect(() => {
    setActivePage(getActivePage());
  }, [getActivePage]);

  return (
    <ErrorBoundary>
      <BaseDashboard role="superadmin">
        <div className={`p-6 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
          <h1 className="text-3xl font-bold mb-6" role="heading" aria-level="1">
            SuperAdmin Dashboard
          </h1>
          <div className={`rounded-lg shadow-md ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
            <Routes>
              <Route path="/" element={<Navigate to="user-management" replace />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="requests" element={<Requests />} />
              <Route path="reporting" element={<UnifiedReporting />} />
              <Route path="user-management" element={<ManageUsers />} />
              <Route path="*" element={<Navigate to="user-management" replace />} />
            </Routes>
          </div>
        </div>
      </BaseDashboard>
    </ErrorBoundary>
  );
}

export default SuperAdminDashboard;