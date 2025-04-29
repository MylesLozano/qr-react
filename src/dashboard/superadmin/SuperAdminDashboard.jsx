import React, { useState, useEffect, useCallback, useMemo } from "react";
import BaseDashboard from "../BaseDashboard";
import ManageUsers from "./ManageUsers";
import AuditLogs from "./AuditLogs";
import Inventory from "../Inventory";
import usePageTitle from "../../hooks/usePageTitle";
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorBoundary from "../../components/ErrorBoundary";
import { toast } from "react-toastify";

/**
 * SuperAdminDashboard component - Main dashboard for superadmin users
 * @component
 * @returns {JSX.Element} The rendered SuperAdminDashboard component
 */
function SuperAdminDashboard() {
  usePageTitle("QCheckCITE - SuperAdmin Dashboard");
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Memoize navigation items
  const navigationItems = useMemo(() => [
    {
      id: "manageUsers",
      label: "Manage Users",
      path: "/superadmin-dashboard/manage-users",
      icon: "👥",
      description: "Manage user accounts and permissions",
    },
    {
      id: "inventory",
      label: "Inventory",
      path: "/inventory",
      icon: "📦",
      description: "View and manage inventory items",
    },
    {
      id: "auditLogs",
      label: "Audit Logs",
      path: "/superadmin-dashboard/audit-logs",
      icon: "📝",
      description: "View system activity and changes",
    },
  ], []);

  // Determine active page based on URL path
  const getActivePage = useCallback(() => {
    if (location.pathname.includes("/superadmin-dashboard/manage-users")) return "manageUsers";
    if (location.pathname === "/inventory") return "inventory";
    if (location.pathname.includes("/superadmin-dashboard/audit-logs")) return "auditLogs";
    return "manageUsers"; // default for dashboard home
  }, [location.pathname]);

  // Set active page on component mount and when location changes
  const [activePage, setActivePage] = useState(() => getActivePage());

  useEffect(() => {
    setActivePage(getActivePage());
  }, [getActivePage]);

  // Handle navigation when buttons are clicked
  const handleButtonClick = useCallback(async (page) => {
    setLoading(true);
    try {
      switch (page) {
        case "manageUsers":
          await navigate("/superadmin-dashboard/manage-users");
          break;
        case "inventory":
          await navigate("/inventory");
          break;
        case "auditLogs":
          await navigate("/superadmin-dashboard/audit-logs");
          break;
        default:
          await navigate("/superadmin-dashboard");
      }
    } catch (error) {
      console.error("Navigation error:", error);
      toast.error("Failed to navigate to the requested page");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Render the appropriate component based on active page
  const renderActivePage = useCallback(() => {
    if (loading) {
      return <LoadingSpinner />;
    }

    switch (activePage) {
      case "manageUsers":
        return <ManageUsers />;
      case "inventory":
        return <Inventory />;
      case "auditLogs":
        return <AuditLogs />;
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

          {/* Navigation Menu */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleButtonClick(item.id)}
                className={`p-6 rounded-lg shadow-md transition-colors duration-200 ${isDarkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-white hover:bg-gray-50"
                  } ${activePage === item.id ? (isDarkMode ? "ring-2 ring-blue-500" : "ring-2 ring-blue-400") : ""}`}
                aria-current={activePage === item.id ? "page" : undefined}
                aria-label={`Navigate to ${item.label}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">{item.label}</h2>
                  <span className="text-2xl">{item.icon}</span>
                </div>
                <p className="text-sm text-gray-500">{item.description}</p>
              </button>
            ))}
          </div>

          {/* Active Page Content */}
          <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? "bg-gray-800" : "bg-white"
            }`}>
            {renderActivePage()}
          </div>
        </div>
      </BaseDashboard>
    </ErrorBoundary>
  );
}

export default SuperAdminDashboard;