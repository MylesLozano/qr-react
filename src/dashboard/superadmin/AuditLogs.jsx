import React, { useState, useEffect, useMemo } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db, auth, getUserRole } from "../../firebase"; // Adjust import path
import BaseDashboard from "../BaseDashboard";
import usePageTitle from "../../hooks/usePageTitle";
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { toast } from 'react-toastify';

function AuditLogs() {
  usePageTitle("QCheckCITE - Audit Logs");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
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

  // Memoize filtered logs
  const filteredLogs = useMemo(() => {
    let result = logs;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(log =>
        log.userEmail.toLowerCase().includes(term) ||
        log.action.toLowerCase().includes(term)
      );
    }

    // Apply type filter
    if (filter !== 'all') {
      result = result.filter(log => log.type === filter);
    }

    return result;
  }, [logs, searchTerm, filter]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const q = query(collection(db, "auditLogs"), orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedLogs = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setLogs(fetchedLogs);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching audit logs:", err);
        setError("Failed to load audit logs. Please try again later.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Restrict access to non-SuperAdmins
  if (role !== "superadmin") {
    return <p className="text-red-500">⚠️ Access Denied: You do not have permission to view audit logs.</p>;
  }

  // Row component for virtual list
  const Row = ({ index, style }) => {
    const log = filteredLogs[index];
    return (
      <div style={style} className="border-b p-4">
        <div className="grid grid-cols-4 gap-4 items-center">
          <div>
            <div className="font-medium">{log.userEmail}</div>
            <div className="text-sm text-gray-600">
              {log.timestamp?.toDate().toLocaleString() || 'N/A'}
            </div>
          </div>
          <div>
            <span className={`px-2 py-1 rounded text-white ${log.type === 'create' ? 'bg-green-500' :
                log.type === 'update' ? 'bg-blue-500' :
                  log.type === 'delete' ? 'bg-red-500' :
                    'bg-gray-500'
              }`}>
              {log.type}
            </span>
          </div>
          <div className="text-sm">
            {log.action}
          </div>
          <div className="text-sm text-gray-600">
            {log.details || 'No additional details'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <BaseDashboard role="superadmin">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Audit Logs</h1>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border p-2 rounded"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="all">All Types</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
          </select>
        </div>

        {/* Virtualized List */}
        <div className="bg-white rounded-lg shadow" style={{ height: '600px' }}>
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="text-lg">Loading audit logs...</div>
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
                  itemCount={filteredLogs.length}
                  itemSize={100}
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

export default AuditLogs;
