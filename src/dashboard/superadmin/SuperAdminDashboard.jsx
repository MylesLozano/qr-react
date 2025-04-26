import React, { useState, useEffect } from "react";
import BaseDashboard from "../BaseDashboard";
import ManageUsers from "./ManageUsers";
import AuditLogs from "./AuditLogs";
import Inventory from "../Inventory";
import usePageTitle from "../../hooks/usePageTitle";
import { useLocation, useNavigate } from "react-router-dom";

function SuperAdminDashboard() {
  usePageTitle("QCheckCITE - SuperAdmin");
  
  const location = useLocation();
  const navigate = useNavigate();
  
  // Determine active page based on URL path
  const getActivePage = () => {
    if (location.pathname.includes("/superadmin-dashboard/manage-users")) return "manageUsers";
    if (location.pathname === "/inventory") return "inventory";
    if (location.pathname.includes("/superadmin-dashboard/audit-logs")) return "auditLogs";
    return "manageUsers"; // default for dashboard home
  };

  // Set active page on component mount and when location changes
  const [activePage, setActivePage] = useState(() => getActivePage());
  
  useEffect(() => {
    setActivePage(getActivePage());
  }, [location.pathname]);

  // Handle navigation when buttons are clicked
  const handleButtonClick = (page) => {
    switch (page) {
      case "manageUsers":
        navigate("/superadmin-dashboard/manage-users");
        break;
      case "inventory":
        navigate("/inventory");
        break;
      case "auditLogs":
        navigate("/superadmin-dashboard/audit-logs");
        break;
      default:
        navigate("/superadmin-dashboard");
    }
  };

  // Render the appropriate component based on active page
  const renderActivePage = () => {
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
  };

  return (
    <BaseDashboard role="superadmin">
      <h1 className="text-3xl font-bold mb-4">SuperAdmin Dashboard</h1>
      
      {/* Secondary Navigation Buttons */}
      <div className="flex gap-4 mb-6">
        <button
          className={`px-4 py-2 rounded ${
            activePage === "manageUsers" ? "bg-blue-700" : "bg-blue-500"
          } text-white`}
          onClick={() => handleButtonClick("manageUsers")}
        >
          Manage Users
        </button>
        <button
          className={`px-4 py-2 rounded ${
            activePage === "inventory" ? "bg-green-700" : "bg-green-500"
          } text-white`}
          onClick={() => handleButtonClick("inventory")}
        >
          Inventory
        </button>
        <button
          className={`px-4 py-2 rounded ${
            activePage === "auditLogs" ? "bg-purple-700" : "bg-purple-500"
          } text-white`}
          onClick={() => handleButtonClick("auditLogs")}
        >
          Audit Logs
        </button>
      </div>
      
      {/* Render the component for the active page */}
      {renderActivePage()}
    </BaseDashboard>
  );
}

export default SuperAdminDashboard;