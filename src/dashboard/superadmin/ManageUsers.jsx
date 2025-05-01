import React, { useState, useEffect, useCallback, useMemo } from "react";
import { collection, doc, updateDoc, query, orderBy, onSnapshot } from "firebase/firestore";
import { db, logAudit } from "../../firebase";
import { useTheme } from "../../context/ThemeContext";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorBoundary from "../../components/ErrorBoundary";
import { toast } from "react-toastify";
import Button from "../../components/Button";

/**
 * ManageUsers component - Allows superadmin to manage user roles
 * @component
 * @returns {JSX.Element} The rendered ManageUsers component
 */
function ManageUsers() {
  const { isDarkMode } = useTheme();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Helper function for role colors
  const getRoleColor = useCallback((role) => {
    switch (role) {
      case "superadmin":
        return "bg-purple-500";
      case "admin":
        return "bg-blue-500";
      case "user":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  }, []);

  // Fetch users
  useEffect(() => {
    let unsubscribe = null;
    setLoading(true);

    const fetchUsers = () => {
      const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
      unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          setUsers(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
          setLoading(false);
        },
        (error) => {
          console.error("Error fetching users:", error);
          toast.error("Failed to fetch users");
          setLoading(false);
        }
      );
    };

    fetchUsers();
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Update user role
  const updateUserRole = useCallback(async (userId, newRole, email) => {
    if (!window.confirm(`Are you sure you want to change ${email}'s role to ${newRole}?`)) {
      return;
    }

    setUpdating(true);
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { role: newRole });
      await logAudit(email, `Role changed to ${newRole} by SuperAdmin`);
      toast.success(`Successfully updated ${email}'s role to ${newRole}`);
    } catch (error) {
      console.error("Error updating user role:", error);
      toast.error(`Failed to update ${email}'s role`);
    } finally {
      setUpdating(false);
    }
  }, []);

  // Memoize role options
  const roleOptions = useMemo(() => [
    { value: "admin", label: "Admin", color: "blue" },
    { value: "user", label: "User", color: "red" },
  ], []);

  return (
    <ErrorBoundary>
      <div className={`p-6 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
        <h2 className="text-xl font-semibold mb-6" role="heading" aria-level="2">
          Manage Users
        </h2>

        {loading ? (
          <LoadingSpinner />
        ) : users.length === 0 ? (
          <p className="text-gray-500">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table
              className={`w-full border-collapse ${isDarkMode ? "border-gray-700" : "border-gray-300"
                }`}
              role="table"
              aria-label="List of users"
            >
              <thead>
                <tr className={isDarkMode ? "bg-gray-800" : "bg-blue-500 text-white"}>
                  <th className="p-2 border">Email</th>
                  <th className="p-2 border">Role</th>
                  <th className="p-2 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className={`text-center ${isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-50"
                      }`}
                  >
                    <td className="p-2 border">{user.email}</td>
                    <td className="p-2 border">
                      <span
                        className={`px-2 py-1 rounded text-white ${getRoleColor(user.role)}`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="p-2 border">
                      {user.role !== "superadmin" && (
                        <div className="flex justify-center space-x-2">
                          {roleOptions.map((option) => (
                            <Button
                              key={option.value}
                              onClick={() => updateUserRole(user.id, option.value, user.email)}
                              disabled={updating || user.role === option.value}
                              color={option.color}
                              className={`px-3 py-1 rounded transition-colors duration-200 ${updating ? "opacity-50 cursor-not-allowed" : ""}`}
                              aria-label={`Change ${user.email}'s role to ${option.label}`}
                            >
                              {updating ? (
                                <LoadingSpinner size="small" />
                              ) : (
                                `${user.role === option.value ? "Current" : option.label}`
                              )}
                            </Button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default ManageUsers;
