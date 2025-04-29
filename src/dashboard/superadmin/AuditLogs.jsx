import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, startAfter, getDocs, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-toastify';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import { useTheme } from '../../context/ThemeContext';
import LoadingSpinner from '../../components/LoadingSpinner';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    dateRange: { start: '', end: '' }
  });
  const { isDarkMode } = useTheme();

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      let q = query(
        collection(db, 'auditLogs'),
        orderBy('timestamp', 'desc'),
        limit(20)
      );

      // Apply filters
      if (filters.action) {
        q = query(q, where('action', '==', filters.action));
      }
      if (filters.entityType) {
        q = query(q, where('entityType', '==', filters.entityType));
      }
      if (filters.dateRange.start) {
        q = query(q, where('timestamp', '>=', new Date(filters.dateRange.start)));
      }
      if (filters.dateRange.end) {
        q = query(q, where('timestamp', '<=', new Date(filters.dateRange.end)));
      }

      const snapshot = await getDocs(q);
      const newLogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate().toLocaleString()
      }));

      setLogs(newLogs);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === 20);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!lastDoc || !hasMore) return;

    try {
      setLoading(true);
      let q = query(
        collection(db, 'auditLogs'),
        orderBy('timestamp', 'desc'),
        startAfter(lastDoc),
        limit(20)
      );

      const snapshot = await getDocs(q);
      const newLogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate().toLocaleString()
      }));

      setLogs(prev => [...prev, ...newLogs]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === 20);
    } catch (error) {
      console.error('Error loading more logs:', error);
      toast.error('Failed to load more logs');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const csv = Papa.unparse(logs);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `audit_logs_${new Date().toISOString()}.csv`);
  };

  return (
    <div className={`p-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}`}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <button
          onClick={exportToCSV}
          className={`px-4 py-2 rounded ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
            } text-white`}
        >
          Export to CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <select
          value={filters.action}
          onChange={(e) => setFilters({ ...filters, action: e.target.value })}
          className={`p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
            }`}
        >
          <option value="">All Actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
        </select>

        <select
          value={filters.entityType}
          onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
          className={`p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
            }`}
        >
          <option value="">All Entities</option>
          <option value="user">User</option>
          <option value="inventory">Inventory</option>
          <option value="request">Request</option>
          <option value="report">Report</option>
        </select>

        <div className="flex gap-2">
          <input
            type="date"
            value={filters.dateRange.start}
            onChange={(e) => setFilters({ ...filters, dateRange: { ...filters.dateRange, start: e.target.value } })}
            className={`p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
              }`}
          />
          <input
            type="date"
            value={filters.dateRange.end}
            onChange={(e) => setFilters({ ...filters, dateRange: { ...filters.dateRange, end: e.target.value } })}
            className={`p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
              }`}
          />
        </div>
      </div>

      <div className={`overflow-x-auto rounded-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
        <table className="min-w-full">
          <thead className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
            }`}>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Timestamp</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Action</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Entity</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Details</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700 bg-gray-900' : 'divide-gray-200 bg-white'
            }`}>
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-6 py-4 whitespace-nowrap">{log.timestamp}</td>
                <td className="px-6 py-4 whitespace-nowrap">{log.action}</td>
                <td className="px-6 py-4 whitespace-nowrap">{log.entityType}</td>
                <td className="px-6 py-4 whitespace-nowrap">{log.userEmail}</td>
                <td className="px-6 py-4">
                  <pre className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && <LoadingSpinner />}

      {hasMore && !loading && (
        <button
          onClick={loadMore}
          className={`mt-4 px-4 py-2 rounded ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
            } text-white`}
        >
          Load More
        </button>
      )}
    </div>
  );
};

export default AuditLogs;
