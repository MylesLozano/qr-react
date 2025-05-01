import React, { useState, useEffect, useCallback, useMemo } from "react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import BaseDashboard from "../BaseDashboard";
import usePageTitle from "../../hooks/usePageTitle";
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { toast } from 'react-toastify';
import { useTheme } from '../../context/ThemeContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorBoundary from '../../components/ErrorBoundary';
import Button from '../../components/Button';

/**
 * UserManagement component - Manages user roles and information for admin users
 * @component
 * @returns {JSX.Element} The rendered UserManagement component
 */
const UserManagement = () => {
  usePageTitle("QCheckCITE - User Management");
  const { isDarkMode } = useTheme();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [roleFilter, setRoleFilter] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper function for role colors
  const getRoleColor = useCallback((role) => {
    switch (role) {
      case 'admin':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'superadmin':
        return 'bg-purple-500 hover:bg-purple-600';
      case 'user':
        return 'bg-green-500 hover:bg-green-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  }, []);

  // Memoize filtered users
  const filteredUsers = useMemo(() => {
    let result = users;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(user =>
        user.email.toLowerCase().includes(term) ||
        user.displayName?.toLowerCase().includes(term) ||
        user.role.toLowerCase().includes(term)
      );
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      result = result.filter(user => user.role === roleFilter);
    }

    return result;
  }, [users, searchTerm, roleFilter]);

  // Fetch users with real-time updates
  useEffect(() => {
    setLoading(true);
    setError(null);
    const q = query(collection(db, "users"), orderBy("email", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedUsers = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(fetchedUsers);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching users:", err);
        setError("Failed to load users. Please try again later.");
        setLoading(false);
        toast.error("Failed to load users");
      }
    );

    return () => unsubscribe();
  }, []);

  // Handle role change
  const handleRoleChange = useCallback(async (userId, newRole) => {
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "users", userId), {
        role: newRole,
        updatedAt: new Date().toISOString()
      });
      toast.success("User role updated successfully");
    } catch (error) {
      console.error("Error updating user role:", error);
      toast.error("Failed to update user role");
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  // Handle user deletion
  const handleDeleteUser = useCallback(async (userId, email) => {
    if (!window.confirm(`Are you sure you want to delete user ${email}? This action cannot be undone.`)) return;

    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, "users", userId));
      toast.success("User deleted successfully");
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  // Validate user data
  const validateUserData = useCallback((userData) => {
    if (!userData.email) {
      toast.error("Email is required");
      return false;
    }
    if (userData.displayName && userData.displayName.length > 50) {
      toast.error("Display name must be less than 50 characters");
      return false;
    }
    return true;
  }, []);

  // Row component for virtual list
  const Row = useCallback(({ index, style }) => {
    const user = filteredUsers[index];
    return (
      <div
        style={style}
        className={`border-b p-4 transition-colors duration-200 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}
        role="row"
        aria-label={`User row ${index + 1}`}
      >
        <div className="grid grid-cols-4 gap-4 items-center">
          <div>
            <div className="font-medium">{user.email}</div>
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
              {user.displayName || 'No display name'}
            </div>
          </div>
          <div>
            <select
              value={user.role}
              onChange={(e) => handleRoleChange(user.id, e.target.value)}
              className={`px-2 py-1 rounded text-white transition-colors duration-200 ${getRoleColor(user.role)}`}
              aria-label={`Role for ${user.email}`}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </select>
          </div>
          <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
            Created: {user.createdAt?.toDate().toLocaleDateString() || 'N/A'}
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={() => setEditingUser(user)}
              className={`transition-colors duration-200 ${isDarkMode ? 'text-yellow-400 hover:text-yellow-300' : 'text-yellow-600 hover:text-yellow-800'}`}
              aria-label={`Edit ${user.email}`}
            >
              Edit
            </Button>
            <Button
              onClick={() => handleDeleteUser(user.id, user.email)}
              className={`transition-colors duration-200 ${isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-800'}`}
              aria-label={`Delete ${user.email}`}
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
    );
  }, [filteredUsers, isDarkMode, handleRoleChange, handleDeleteUser]);

  return (
    <ErrorBoundary>
      <BaseDashboard role="admin">
        <div className={`p-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}`}>
          <h1 className="text-2xl font-bold mb-6" role="heading" aria-level="1">User Management</h1>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`border p-2 rounded transition-colors duration-200 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                }`}
              aria-label="Search users"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className={`border p-2 rounded transition-colors duration-200 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                }`}
              aria-label="Filter by role"
            >
              <option value="all">All Roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </select>
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
              Total Users: {filteredUsers.length}
            </div>
          </div>

          {/* Virtualized List */}
          <div className={`rounded-lg shadow transition-colors duration-200 ${isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`} style={{ height: '600px' }}>
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <LoadingSpinner />
              </div>
            ) : error ? (
              <div className="flex justify-center items-center h-full">
                <div className="text-red-500">{error}</div>
              </div>
            ) : (
              <AutoSizer>
                {({ height, width }) => (
                  <List
                    height={height}
                    itemCount={filteredUsers.length}
                    itemSize={80}
                    width={width}
                  >
                    {Row}
                  </List>
                )}
              </AutoSizer>
            )}
          </div>

          {/* Edit User Modal */}
          {editingUser && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className={`p-6 rounded-lg w-full max-w-md transition-colors duration-200 ${isDarkMode ? 'bg-gray-800' : 'bg-white'
                }`}>
                <h2 className="text-xl font-semibold mb-4" role="heading" aria-level="2">Edit User</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                      type="email"
                      value={editingUser.email}
                      disabled
                      className={`border p-2 rounded w-full transition-colors duration-200 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'
                        }`}
                      aria-label="User email"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Display Name</label>
                    <input
                      type="text"
                      value={editingUser.displayName || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, displayName: e.target.value })}
                      className={`border p-2 rounded w-full transition-colors duration-200 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                        }`}
                      aria-label="User display name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Role</label>
                    <select
                      value={editingUser.role}
                      onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                      className={`border p-2 rounded w-full transition-colors duration-200 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                        }`}
                      aria-label="User role"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="superadmin">Super Admin</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end space-x-4 mt-6">
                  <Button
                    onClick={() => setEditingUser(null)}
                    className={`px-4 py-2 rounded transition-colors duration-200 ${isDarkMode ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-400 hover:bg-gray-500'} text-white`}
                    aria-label="Cancel editing"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (validateUserData(editingUser)) {
                        handleRoleChange(editingUser.id, editingUser.role);
                        setEditingUser(null);
                      }
                    }}
                    className={`px-4 py-2 rounded transition-colors duration-200 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isSubmitting}
                    aria-label="Save changes"
                  >
                    {isSubmitting ? <LoadingSpinner size="small" /> : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </BaseDashboard>
    </ErrorBoundary>
  );
};

export default UserManagement;
