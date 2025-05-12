import { useState, useEffect, useCallback, useMemo } from "react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db, logAudit } from "../../firebase";
import { useTheme } from "../../hooks/useTheme";
import LoadingSpinner from "../LoadingSpinner";
import ErrorBoundary from "../ErrorBoundary";
import { toast } from "react-toastify";
import Button from "../Button";
import { useAuth } from "../../hooks/useAuth";

/**
 * UserManagement component - Unified component for managing users across admin and superadmin roles
 * @component
 * @returns {JSX.Element} The rendered UserManagement component
 */
function UserManagement() {
  const { isDarkMode } = useTheme();
  const { user, role } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const isSuperAdmin = role === "superadmin";

  // Memoize role options based on user's role
  const roleOptions = useMemo(() => {
    if (isSuperAdmin) {
      return [
        { value: "admin", label: "Admin", color: "blue" },
        { value: "user", label: "User", color: "gray" },
      ];
    }
    return [{ value: "user", label: "User", color: "gray" }];
  }, [isSuperAdmin]);

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
          const fetchedUsers = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          
          // Filter out superadmin users if not a superadmin
          const filteredUsers = isSuperAdmin
            ? fetchedUsers
            : fetchedUsers.filter((u) => u.role !== "superadmin" && u.role !== "admin");
          
          setUsers(filteredUsers);
          setLoading(false);
        },
        (error) => {
          console.error("Error fetching users:", error);
          setError("Failed to fetch users");
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
  }, [isSuperAdmin]);

  // Filter users based on search and role
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch = searchTerm
        ? user.email.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      const matchesRole = roleFilter !== "all" ? user.role === roleFilter : true;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  // Update user role
  const updateUserRole = useCallback(async (userId, newRole, email) => {
    if (!window.confirm(`Are you sure you want to change ${email}'s role to ${newRole}?`)) {
      return;
    }

    setUpdating(true);
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { 
        role: newRole,
        updatedAt: new Date().toISOString(),
        updatedBy: user.email
      });
      
      await logAudit("user_role_updated", user.email, "user", {
        targetUserEmail: email,
        newRole: newRole,
      });
      
      toast.success(`Role updated to ${newRole} for ${email}`);
    } catch (error) {
      console.error("Error updating user role:", error);
      toast.error(`Failed to update ${email}'s role`);
    } finally {
      setUpdating(false);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 rounded-lg ${isDarkMode ? "bg-red-900/50" : "bg-red-100"}`}>
        <p className={`text-lg ${isDarkMode ? "text-red-200" : "text-red-700"}`}>{error}</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className={`p-6 ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Manage Users</h2>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search by email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`px-4 py-2 rounded-lg ${
                isDarkMode
                  ? "bg-gray-700 text-white"
                  : "bg-white text-gray-900"
              }`}
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className={`px-4 py-2 rounded-lg ${
                isDarkMode
                  ? "bg-gray-700 text-white"
                  : "bg-white text-gray-900"
              }`}
            >
              <option value="all">All Roles</option>
              <option value="user">User</option>
              {isSuperAdmin && <option value="admin">Admin</option>}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table
            className={`w-full border-collapse ${
              isDarkMode ? "border-gray-700" : "border-gray-300"
            }`}
          >
            <thead>
              <tr className={isDarkMode ? "bg-gray-800" : "bg-gray-100"}>
                <th className="p-4 text-left">Email</th>
                <th className="p-4 text-left">Role</th>
                <th className="p-4 text-left">Created At</th>
                <th className="p-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className={`border-t ${
                    isDarkMode ? "border-gray-700" : "border-gray-200"
                  }`}
                >
                  <td className="p-4">{user.email}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded text-white ${getRoleColor(
                        user.role
                      )}`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4">
                    {user.createdAt?.toDate().toLocaleDateString() || "N/A"}
                  </td>
                  <td className="p-4">
                    {user.role !== "superadmin" && (
                      <div className="flex space-x-2">
                        {roleOptions.map((option) => (
                          <Button
                            key={option.value}
                            onClick={() =>
                              updateUserRole(user.id, option.value, user.email)
                            }
                            disabled={updating || user.role === option.value}
                            color={option.color}
                            size="sm"
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
      </div>
    </ErrorBoundary>
  );
}

export default UserManagement;
