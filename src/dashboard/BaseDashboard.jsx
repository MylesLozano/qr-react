import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { auth, db, logAudit } from "../firebase";
import { toast } from "react-toastify";
import { doc, getDoc } from "firebase/firestore";

function BaseDashboard({ role, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [userRole, setUserRole] = useState(role);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role);
        }
      }
    };
    fetchUserRole();
  }, [location.pathname]); // Refetch role when navigating

  const handleLogout = async () => {
    if (auth.currentUser) {
      await logAudit(auth.currentUser.email, "Signed out");
    }
    await auth.signOut();
    toast.info("You have been logged out.");
    navigate("/login");
  };

  // Updated sidebar links with consistent path structure
  const sidebarLinks = {
    superadmin: [
      { name: "Manage Users", path: "/superadmin-dashboard/manage-users" },
      { name: "Inventory", path: "/inventory" },
      { name: "Audit Logs", path: "/superadmin-dashboard/audit-logs" },
    ],
    admin: [
      { name: "Dashboard", path: "/admin-dashboard" },
      { name: "Inventory", path: "/inventory" },
      { name: "Requests", path: "/admin-dashboard/requests" },
      { name: "Reports", path: "/admin-dashboard/reports" },
      { name: "User Management", path: "/admin-dashboard/users" },
    ],
    user: [
      { name: "Dashboard", path: "/user-dashboard" },
      { name: "Inventory", path: "/inventory" },
      { name: "My Requests", path: "/user-dashboard/my-requests" },
    ],
  };

  // Check if the current path matches or starts with the link path
  const isActiveLink = (path) => {
    if (path === "/inventory" && location.pathname === "/inventory") {
      return true;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-100">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-blue-900 text-white p-5 md:h-screen">
        <h2 className="text-2xl font-bold mb-6">
          {userRole === "superadmin"
            ? "SuperAdmin Dashboard"
            : userRole === "admin"
            ? "Admin Dashboard"
            : "User Dashboard"}
        </h2>

        <nav>
          <ul className="space-y-4">
            {sidebarLinks[userRole]?.map(({ name, path }) => (
              <li key={path}>
                <Link
                  to={path}
                  className={`block p-2 rounded ${
                    isActiveLink(path) ? "bg-blue-700" : "hover:bg-blue-700"
                  }`}
                >
                  {name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <button
          onClick={handleLogout}
          className="mt-10 w-full bg-red-500 hover:bg-red-600 py-2 px-4 rounded"
        >
          Logout
        </button>
      </div>
      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">{children}</div>
    </div>
  );
}

export default BaseDashboard;