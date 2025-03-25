import React, { useState, useEffect } from "react";
import { collection, doc, updateDoc, query, orderBy, onSnapshot } from "firebase/firestore";
import { db, logAudit } from "../../firebase";

function ManageUsers() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      setUsers(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, []);

  const updateUserRole = async (userId, newRole, email) => {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { role: newRole });
    await logAudit(email, `Role changed to ${newRole} by SuperAdmin`);
  };

  return (
    <div>
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
  );
}

export default ManageUsers;
