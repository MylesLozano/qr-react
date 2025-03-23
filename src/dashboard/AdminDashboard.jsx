import React from "react";
import BaseDashboard from "./BaseDashboard";
import usePageTitle from "../hooks/usePageTitle";

function AdminDashboard() {
  usePageTitle("QCheckCITE - Admin");

  return (
    <BaseDashboard role="admin">
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
    </BaseDashboard>
  );
}

export default AdminDashboard;
