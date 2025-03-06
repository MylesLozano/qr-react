import React from "react";
import { Link } from "react-router-dom";
import { auth, logAudit } from "../firebase";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

function UserDashboard() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (auth.currentUser) {
      console.log("Logging out user:", auth.currentUser.email); // Debugging
      await logAudit(auth.currentUser.email, "Signed out");
    } else {
      console.error("No authenticated user found for logging out.");
    }
    await auth.signOut();
    toast.info("You have been logged out.");
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-blue-900 text-white p-5 fixed h-full">
        <h2 className="text-2xl font-bold mb-6">User Dashboard</h2>
        <nav>
          <ul className="space-y-4">
            <li><Link to="/inventory" className="block hover:bg-blue-700 p-2 rounded">View Inventory</Link></li>
            <li><Link to="/my-requests" className="block hover:bg-blue-700 p-2 rounded">My Requests</Link></li>
          </ul>
        </nav>
        <button onClick={handleLogout} className="mt-10 w-full bg-red-500 hover:bg-red-600 py-2 px-4 rounded">
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-6 w-full">
        <h1 className="text-3xl font-bold mb-4">User Dashboard</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 bg-white shadow rounded-lg text-center">
            <h2 className="text-xl font-bold">Available Inventory</h2>
            <p className="text-2xl mt-2">150</p>
          </div>
          <div className="p-5 bg-white shadow rounded-lg text-center">
            <h2 className="text-xl font-bold">My Requests</h2>
            <p className="text-2xl mt-2">3</p>
          </div>
          <div className="p-5 bg-white shadow rounded-lg text-center">
            <h2 className="text-xl font-bold">Approved Requests</h2>
            <p className="text-2xl mt-2">2</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserDashboard;
