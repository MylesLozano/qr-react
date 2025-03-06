import React from "react";
import { Link } from "react-router-dom";
import { auth, logAudit } from "../firebase";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

function Dashboard({ role }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logAudit(auth.currentUser.email, "Signed out");
    await auth.signOut();
    toast.info("You have been logged out.");
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-blue-900 text-white p-5 fixed h-full">
        <h2 className="text-2xl font-bold mb-6">{role === "admin" ? "Admin Dashboard" : "User Dashboard"}</h2>
        <nav>
          <ul className="space-y-4">
            <li><Link to="/inventory" className="block hover:bg-blue-700 p-2 rounded">Inventory</Link></li>
            {role === "admin" ? (
              <>
                <li><Link to="/requests" className="block hover:bg-blue-700 p-2 rounded">Requests</Link></li>
                <li><Link to="/reports" className="block hover:bg-blue-700 p-2 rounded">Reports</Link></li>
                <li><Link to="/users" className="block hover:bg-blue-700 p-2 rounded">User Management</Link></li>
              </>
            ) : (
              <li><Link to="/my-requests" className="block hover:bg-blue-700 p-2 rounded">My Requests</Link></li>
            )}
          </ul>
        </nav>
        <button onClick={handleLogout} className="mt-10 w-full bg-red-500 hover:bg-red-600 py-2 px-4 rounded">
          Logout
        </button>
      </div>
    </div>
  );
}

export default Dashboard;
