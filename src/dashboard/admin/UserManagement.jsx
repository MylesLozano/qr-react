import React, { useState, useEffect} from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import BaseDashboard from "../BaseDashboard";
import usePageTitle from "../../hooks/usePageTitle";

function UserManagement() {
  usePageTitle("QCheckCITE - User Management");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    // Query to fetch users, ordered by creation time or email
    const q = query(collection(db, "users"), orderBy("email", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedUsers = querySnapshot.docs.map((doc) => ({
          id: doc.id, // Use doc.id as key
          ...doc.data(),
        }));
        setUsers(fetchedUsers);
        setLoading(false);
      },
      (err) => {
        // Handle errors during fetch
        console.error("Error fetching users:", err);
        setError("Failed to load users. Please try again later.");
        setLoading(false);
      }
    );

    // Cleanup listener on component unmount
    return () => unsubscribe();
  }, []);

  return (
    <BaseDashboard role="admin">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      <div className="bg-white p-4 rounded shadow">
      {loading ? (
          <p className="text-center text-gray-500">Loading users...</p>
        ) : error ? (
          <p className="text-center text-red-500">{error}</p>
        ) : users.length === 0 ? (
          <p className="text-center text-gray-500">No users found.</p>
        ) : (
          <table className="min-w-full text-left">
            <thead>
              <tr>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t">
                  {" "}
                  {/* Use user.id as key */}
                  <td className="px-4 py-2">{user.email}</td>
                  <td className="px-4 py-2">{user.role}</td>
                  <td className="px-4 py-2">
                    <button className="text-blue-500 hover:underline">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </BaseDashboard>
  );
}

export default UserManagement;
