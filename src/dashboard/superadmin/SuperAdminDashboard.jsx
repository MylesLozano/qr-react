import React, { useState, useEffect, useCallback } from "react";
import BaseDashboard from "../BaseDashboard";
import ManageUsers from "./ManageUsers";
import AuditLogs from "./AuditLogs";
import Inventory from "../Inventory";
import Requests from "../admin/Requests";
import Reports from "../admin/Reports";
import usePageTitle from "../../hooks/usePageTitle";
import { useLocation } from "react-router-dom";
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
  const [loading, setLoading] = useState(false);

  // Determine active page based on URL path
  const getActivePage = useCallback(() => {
    const path = location.pathname;
    if (path.includes("/inventory")) return "inventory";
    if (path.includes("/requests")) return "requests";
    if (path.includes("/reports")) return "reports";
    if (path.includes("/audit-logs")) return "auditLogs";
    if (path.includes("/user-management")) return "userManagement";
    return "userManagement"; // default view
  }, [location.pathname]);

  // Set active page on component mount and when location changes
  const [activePage, setActivePage] = useState(() => getActivePage());

  useEffect(() => {
    setActivePage(getActivePage());
  }, [getActivePage]);

  // Render the appropriate component based on active page
  const renderActivePage = useCallback(() => {
    if (loading) {
      return <LoadingSpinner />;
    }

    switch (activePage) {
      case "inventory":
        return <Inventory />;
      case "requests":
        return <Requests />;
      case "reports":
        return <Reports />;
      case "auditLogs":
        return <AuditLogs />;
      case "userManagement":
        return <ManageUsers />;
      default:
        return <ManageUsers />;
    }
  }, [activePage, loading]);

  return (
    <ErrorBoundary>
      <BaseDashboard role="superadmin">
        <div className={`p-6 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
          <h1 className="text-3xl font-bold mb-6" role="heading" aria-level="1">
            SuperAdmin Dashboard
          </h1>

          {/* Active Page Content */}
          <div className={`rounded-lg shadow-md ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
            {renderActivePage()}
          </div>
        </div>
      </BaseDashboard>
    </ErrorBoundary>
  );
}

export default SuperAdminDashboard;