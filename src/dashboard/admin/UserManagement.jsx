import React, { useState, useEffect, useMemo } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import BaseDashboard from "../BaseDashboard";
import usePageTitle from "../../hooks/usePageTitle";
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { toast } from 'react-toastify';

function UserManagement() {
  usePageTitle("QCheckCITE - User Management");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Memoize filtered users
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const term = searchTerm.toLowerCase();
    return users.filter(user =>
      user.email.toLowerCase().includes(term) ||
      user.role.toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

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
      }
    );

    return () => unsubscribe();
  }, []);

  // Row component for virtual list
  const Row = ({ index, style }) => {
    const user = filteredUsers[index];
    return (
      <div style={style} className="border-b p-4">
        <div className="grid grid-cols-3 gap-4 items-center">
          <div>
            <div className="font-medium">{user.email}</div>
            <div className="text-sm text-gray-600">ID: {user.id}</div>
          </div>
          <div>
            <span className={`px-2 py-1 rounded text-white ${user.role === 'admin' ? 'bg-blue-500' :
                user.role === 'superadmin' ? 'bg-purple-500' :
                  'bg-green-500'
              }`}>
              {user.role}
            </span>
          </div>
          <div className="text-sm">
            Created: {user.createdAt?.toDate().toLocaleDateString() || 'N/A'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <BaseDashboard role="admin">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">User Management</h1>

        {/* Search Input */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border p-2 rounded w-full"
          />
        </div>

        {/* Virtualized List */}
        <div className="bg-white rounded-lg shadow" style={{ height: '600px' }}>
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="text-lg">Loading users...</div>
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
      </div>
    </BaseDashboard>
  );
}

export default UserManagement;
