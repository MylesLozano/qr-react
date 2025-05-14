import { useState, useEffect, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { collection, query, orderBy, onSnapshot, doc } from "firebase/firestore";
import { db } from "../../firebase";
import { useTheme } from "../../hooks/useTheme";
import LoadingSpinner from "../LoadingSpinner";
import ErrorBoundary from "../ErrorBoundary";
import Button from "../Button";
import { useAuth } from "../../hooks/useAuth";
import { useUserManagement } from "../../hooks/useUserManagement";
import { debounce } from "../../utils/inventoryUtils";

/**
 * UserManagement component - Unified component for managing users across admin and superadmin roles
 * @component
 * @returns {JSX.Element} The rendered UserManagement component
 */
function UserManagement() {
  const { isDarkMode } = useTheme();
  const { user, role } = useAuth();
  const { updating, updateUserRole, getRoleColor, getRoleOptions } = useUserManagement(user);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const isSuperAdmin = role === "superadmin";
  
  // Memoize role options based on user's role
  const roleOptions = useMemo(() => getRoleOptions(role), [getRoleOptions, role]);
  
  // Debounced search function
  const debouncedSetSearchTerm = useCallback(
    debounce((value) => {
      setSearchTerm(value);
    }, 300),
    []
  );
  
  // Handle search input change with debouncing
  const handleSearchChange = useCallback((e) => {
    debouncedSetSearchTerm(e.target.value);
  }, [debouncedSetSearchTerm]);

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

  // Using updateUserRole from useUserManagement hook

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
            <label className="sr-only" htmlFor="user-search">Search users by email</label>
            <input
              id="user-search"
              type="text"
              placeholder="Search by email..."
              onChange={handleSearchChange}
              className={`px-4 py-2 rounded-lg ${
                isDarkMode
                  ? "bg-gray-700 text-white"
                  : "bg-white text-gray-900"
              }`}
              aria-label="Search users by email"
            />
            
            <label className="sr-only" htmlFor="role-filter">Filter by role</label>
            <select
              id="role-filter"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className={`px-4 py-2 rounded-lg ${
                isDarkMode
                  ? "bg-gray-700 text-white"
                  : "bg-white text-gray-900"
              }`}
              aria-label="Filter users by role"
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
            aria-label="User management table"
          >
            <thead>
              <tr className={isDarkMode ? "bg-gray-800" : "bg-gray-100"}>
                <th scope="col" className="p-4 text-left">Email</th>
                <th scope="col" className="p-4 text-left">Role</th>
                <th scope="col" className="p-4 text-left">Created At</th>
                <th scope="col" className="p-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((userItem) => (
                  <tr
                    key={userItem.id}
                    className={`border-t ${
                      isDarkMode ? "border-gray-700" : "border-gray-200"
                    }`}
                  >
                    <td className="p-4">{userItem.email}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded text-white ${getRoleColor(
                          userItem.role
                        )}`}
                      >
                        {userItem.role}
                      </span>
                    </td>
                    <td className="p-4">
                      {userItem.createdAt?.toDate().toLocaleDateString() || "N/A"}
                    </td>
                    <td className="p-4">
                      {userItem.role !== "superadmin" && (
                        <div className="flex space-x-2">
                          {roleOptions.map((option) => (
                            <Button
                              key={option.value}
                              onClick={() =>
                                updateUserRole(userItem.id, option.value, userItem.email)
                              }
                              disabled={updating || userItem.role === option.value}
                              color={option.color}
                              size="sm"
                              aria-label={`Change ${userItem.email}'s role to ${option.label}`}
                            >
                              {updating ? (
                                <LoadingSpinner size="sm" showText={false} />
                              ) : (
                                `${userItem.role === option.value ? "Current" : option.label}`
                              )}
                            </Button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="p-4 text-center">
                    No users found matching your search criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ErrorBoundary>
  );
}

UserManagement.propTypes = {
  // This component doesn't have direct props, but including PropTypes
  // definition is a good practice for documentation
};

export default UserManagement;
