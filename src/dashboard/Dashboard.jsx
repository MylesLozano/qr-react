import React from "react";
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-4xl">
        <h1 className="text-2xl font-bold mb-4">
          {role === "admin" ? "Admin Dashboard" : "User Dashboard"}
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {role === "admin" ? (
            <>
              <div className="p-4 bg-blue-500 text-white rounded-md shadow-md text-center">
                Manage Users
              </div>
              <div className="p-4 bg-green-500 text-white rounded-md shadow-md text-center">
                Generate Reports
              </div>
            </>
          ) : (
            <>
              <div className="p-4 bg-blue-500 text-white rounded-md shadow-md text-center">
                View Inventory
              </div>
              <div className="p-4 bg-green-500 text-white rounded-md shadow-md text-center">
                Request Items
              </div>
            </>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="mt-6 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-md"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default Dashboard;
