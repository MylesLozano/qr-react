import React, { useState, useEffect } from "react";
import { collection, doc, updateDoc, query, orderBy, onSnapshot } from "firebase/firestore";
import { db, logAudit } from "../firebase";
import BaseDashboard from "./BaseDashboard";
import usePageTitle from "../hooks/usePageTitle";

function SuperAdminDashboard() {
  usePageTitle("QCheckCITE - SuperAdmin");

  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Fetch users in real-time
  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const userData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(userData);
    });

    return () => unsubscribe();
  }, []);

  // Fetch audit logs in real-time
  useEffect(() => {
    const q = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const logs = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAuditLogs(logs);
    });

    return () => unsubscribe();
  }, []);

  // Function to update user role
  const updateUserRole = async (userId, newRole, email) => {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { role: newRole });

    // Log the action
    await logAudit(email, `Role changed to ${newRole} by SuperAdmin`);
  };

  return (
    <BaseDashboard role="superadmin">
      <h1 className="text-3xl font-bold mb-4">SuperAdmin Dashboard</h1>

      {/* User Management Table */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
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
                        onClick={() => updateUserRole(user.id, "admin", user.email)}
                      >
                        Promote to Admin
                      </button>
                      <button
                        className="bg-red-500 text-white px-3 py-1 rounded"
                        onClick={() => updateUserRole(user.id, "user", user.email)}
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

      {/* Audit Logs Table */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Audit Logs</h2>
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2 border border-gray-300">Email</th>
              <th className="p-2 border border-gray-300">Action</th>
              <th className="p-2 border border-gray-300">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map((log) => (
              <tr key={log.id}>
                <td className="p-2 border border-gray-300">{log.email}</td>
                <td className="p-2 border border-gray-300">{log.action}</td>
                <td className="p-2 border border-gray-300">
                  {new Date(log.timestamp.toDate()).toLocaleString()}
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
