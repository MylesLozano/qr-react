import React from "react";
import BaseDashboard from "../BaseDashboard";
import usePageTitle from "../../hooks/usePageTitle";

function UserManagement() {
  usePageTitle("QCheckCITE - User Management");

  // Example static users – replace with Firestore query later
  const mockUsers = [
    { uid: "123", email: "admin@jmc.edu.ph", role: "admin" },
    { uid: "456", email: "user1@jmc.edu.ph", role: "user" },
  ];

  return (
    <BaseDashboard role="admin">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      <div className="bg-white p-4 rounded shadow">
        <table className="min-w-full text-left">
          <thead>
            <tr>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {mockUsers.map((user) => (
              <tr key={user.uid} className="border-t">
                <td className="px-4 py-2">{user.email}</td>
                <td className="px-4 py-2">{user.role}</td>
                <td className="px-4 py-2">
                  <button className="text-blue-500 hover:underline">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </BaseDashboard>
  );
}

export default UserManagement;
