import React, { useState, useEffect } from "react";
import { getDocs, collection, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import BaseDashboard from "./BaseDashboard";
import usePageTitle from "../hooks/usePageTitle";

function SuperAdminDashboard() {
  usePageTitle("QCheckCITE - SuperAdmin");

  const [users, setUsers] = useState([]);

  // Fetch all users from Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      const querySnapshot = await getDocs(collection(db, "users"));
      const userData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setUsers(userData);
    };
    fetchUsers();
  }, []);

  // Function to update user role
  const updateUserRole = async (userId, newRole) => {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { role: newRole });

    // Update local state
    setUsers((prevUsers) =>
      prevUsers.map((user) => (user.id === userId ? { ...user, role: newRole } : user))
    );
  };

  return (
    <BaseDashboard role="superadmin">
      <h1 className="text-3xl font-bold mb-4">SuperAdmin Dashboard</h1>

      {/* User Management Table */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Manage Users</h2>
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2 border border-gray-300">Email</th>
              <th className="p-2 border border-gray-300">Role</th>
              <th className="p-2 border border-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td className="p-2 border border-gray-300">{user.email}</td>
                <td className="p-2 border border-gray-300">{user.role}</td>
                <td className="p-2 border border-gray-300">
                  {user.role !== "superadmin" && (
                    <>
                      <button
                        className="mr-2 bg-blue-500 text-white px-3 py-1 rounded"
                        onClick={() => updateUserRole(user.id, "admin")}
                      >
                        Promote to Admin
                      </button>
                      <button
                        className="bg-red-500 text-white px-3 py-1 rounded"
                        onClick={() => updateUserRole(user.id, "user")}
                      >
                        Demote to User
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </BaseDashboard>
  );
}

export default SuperAdminDashboard;
