import React, { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db, auth, getUserRole } from "../../firebase"; // Adjust import path

function AuditLogs() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [role, setRole] = useState(null);

  // Fetch user role
  useEffect(() => {
    const fetchRole = async () => {
      if (auth.currentUser) {
        const userRole = await getUserRole(auth.currentUser.uid);
        setRole(userRole);
      }
    };
    fetchRole();
  }, []);

  // Fetch audit logs only if SuperAdmin
  useEffect(() => {
    if (role === "superadmin") {
      const q = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        setAuditLogs(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      });

      return () => unsubscribe();
    }
  }, [role]);

  // Restrict access to non-SuperAdmins
  if (role !== "superadmin") {
    return <p className="text-red-500">⚠️ Access Denied: You do not have permission to view audit logs.</p>;
  }

  return (
    <div>
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
                {log.timestamp ? new Date(log.timestamp.toDate()).toLocaleString() : "No timestamp"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AuditLogs;
