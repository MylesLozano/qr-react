import React, { useState, useEffect, useCallback } from "react";
import BaseDashboard from "../BaseDashboard";
import ManageUsers from "./ManageUsers";
import Inventory from "../Inventory";
import Requests from "../admin/Requests";
import UnifiedReporting from "../UnifiedReporting";
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

  // Determine active page based on URL path
  const getActivePage = useCallback(() => {
    const path = location.pathname;
    if (path.includes("/inventory")) return "inventory";
    if (path.includes("/requests")) return "requests";
    if (path.includes("/reporting")) return "reporting";
    if (path.includes("/user-management")) return "userManagement";
    return "userManagement"; // default view
  }, [location.pathname]);

  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState(() => {
    const initialPage = getActivePage();
    setLoading(false);
    return initialPage;
  });


  useEffect(() => {
    setActivePage(getActivePage());
  }, [getActivePage]);

  // Render the appropriate component based on active page
  const renderActivePage = useCallback(() => {
    if (loading) {
      return <LoadingSpinner size="md" />; // Utilize LoadingSpinner here
    }
    switch (activePage) {
      case "inventory":
        return <Inventory />;
      case "requests":
        return <Requests />;
      case "reporting":
        return <UnifiedReporting />;
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