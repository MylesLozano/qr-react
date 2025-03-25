import React, { useState } from "react";
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
    if (location.pathname.includes("manage-users")) return "manageUsers";
    if (location.pathname.includes("inventory")) return "inventory";
    if (location.pathname.includes("audit-logs")) return "auditLogs";
    return "manageUsers"; // default
  };

  const [activePage, setActivePage] = useState(getActivePage());

  // Handle navigation when buttons are clicked
  const handleButtonClick = (page) => {
    setActivePage(page);
    switch (page) {
      case "manageUsers":
        navigate("/superadmin-dashboard/manage-users");
        break;
      case "inventory":
        navigate("/inventory");
        break;
      case "auditLogs":
        navigate("/audit-logs");
        break;
      default:
        navigate("/superadmin-dashboard");
    }
  };

  return (
    <BaseDashboard role="superadmin">
      <h1 className="text-3xl font-bold mb-4">SuperAdmin Dashboard</h1>

      {/* Secondary Navigation Buttons (optional) */}
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

      {/* Render the Selected Component */}
      {activePage === "manageUsers" && <ManageUsers />}
      {activePage === "inventory" && <Inventory />}
      {activePage === "auditLogs" && <AuditLogs />}
    </BaseDashboard>
  );
}

export default SuperAdminDashboard;