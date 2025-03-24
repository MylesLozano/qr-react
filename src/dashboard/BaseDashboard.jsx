import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { auth, db, logAudit } from "../firebase";
import { useNavigate } from "react-router-dom";
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
  }, [location.pathname]); // Refetch role if URL changes

  const handleLogout = async () => {
    if (auth.currentUser) {
      await logAudit(auth.currentUser.email, "Signed out");
    }
    await auth.signOut();
    toast.info("You have been logged out.");
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-100">
      {/* Sidebar with Dynamic Role Handling */}
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
            <li>
              <Link
                to="/inventory"
                className={`block p-2 rounded ${
                  location.pathname === "/inventory" ? "bg-blue-700" : "hover:bg-blue-700"
                }`}
              >
                Inventory
              </Link>
            </li>

            {userRole === "admin" && (
              <>
                <li>
                  <Link
                    to="/requests"
                    className={`block p-2 rounded ${
                      location.pathname === "/requests" ? "bg-blue-700" : "hover:bg-blue-700"
                    }`}
                  >
                    Requests
                  </Link>
                </li>
                <li>
                  <Link
                    to="/reports"
                    className={`block p-2 rounded ${
                      location.pathname === "/reports" ? "bg-blue-700" : "hover:bg-blue-700"
                    }`}
                  >
                    Reports
                  </Link>
                </li>
                <li>
                  <Link
                    to="/users"
                    className={`block p-2 rounded ${
                      location.pathname === "/users" ? "bg-blue-700" : "hover:bg-blue-700"
                    }`}
                  >
                    User Management
                  </Link>
                </li>
              </>
            )}

            {userRole === "superadmin" && (
              <>
                <li>
                  <Link
                    to="/superadmin-dashboard"
                    className={`block p-2 rounded ${
                      location.pathname === "/superadmin-dashboard" ? "bg-blue-700" : "hover:bg-blue-700"
                    }`}
                  >
                    Manage Users
                  </Link>
                </li>
                <li>
                  <Link
                    to="/audit-logs"
                    className={`block p-2 rounded ${
                      location.pathname === "/audit-logs" ? "bg-blue-700" : "hover:bg-blue-700"
                    }`}
                  >
                    Audit Logs
                  </Link>
                </li>
              </>
            )}

            {userRole === "user" && (
              <li>
                <Link
                  to="/my-requests"
                  className={`block p-2 rounded ${
                    location.pathname === "/my-requests" ? "bg-blue-700" : "hover:bg-blue-700"
                  }`}
                >
                  My Requests
                </Link>
              </li>
            )}
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
