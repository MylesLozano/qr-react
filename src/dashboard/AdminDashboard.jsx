import React from "react";
import { Link } from "react-router-dom";
import { auth, logAudit } from "../firebase";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

function AdminDashboard() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (auth.currentUser) {
      await logAudit(auth.currentUser.email, "Signed out");
    }
    await auth.signOut();
    toast.info("You have been logged out.");
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-blue-900 text-white p-6 flex flex-col">
        <h2 className="text-2xl font-bold mb-6">Admin Dashboard</h2>
        <nav className="flex-1">
          <ul className="space-y-4">
            <li>
              <Link to="/inventory" className="block hover:bg-blue-700 p-2 rounded">Inventory</Link>
            </li>
            <li>
              <Link to="/requests" className="block hover:bg-blue-700 p-2 rounded">Requests</Link>
            </li>
            <li>
              <Link to="/reports" className="block hover:bg-blue-700 p-2 rounded">Reports</Link>
            </li>
            <li>
              <Link to="/users" className="block hover:bg-blue-700 p-2 rounded">User Management</Link>
            </li>
          </ul>
        </nav>
        <button onClick={handleLogout} className="mt-10 w-full bg-red-500 hover:bg-red-600 py-2 px-4 rounded">
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold">Total Inventory</h2>
            <p className="text-3xl font-bold text-blue-600 mt-2">150</p>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold">Pending Requests</h2>
            <p className="text-3xl font-bold text-yellow-500 mt-2">5</p>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold">Registered Users</h2>
            <p className="text-3xl font-bold text-green-600 mt-2">45</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
