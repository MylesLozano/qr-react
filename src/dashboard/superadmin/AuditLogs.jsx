import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, orderBy, limit, startAfter, getDocs, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-toastify';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import { useTheme } from '../../context/ThemeContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorBoundary from '../../components/ErrorBoundary';
import Button from '../../components/Button';

/**
 * AuditLogs component - Displays and manages audit logs for superadmin
 * @component
 * @returns {JSX.Element} The rendered AuditLogs component
 */
const AuditLogs = () => {
  const { isDarkMode } = useTheme();
  const [logs, setLogs] = useState([]);
  const formattedLogs = useMemo(() =>
    logs.map(log => ({
      ...log,
      timestamp: log.timestamp instanceof Date
        ? log.timestamp.toLocaleString()
        : log.timestamp
    })), [logs]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    dateRange: { start: '', end: '' }
  });

  // Helper function for action colors
  const getActionColor = useCallback((action) => {
    switch (action) {
      case 'create':
        return 'bg-green-500';
      case 'update':
        return 'bg-blue-500';
      case 'delete':
        return 'bg-red-500';
      case 'login':
        return 'bg-yellow-500';
      case 'logout':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  }, []);

  // Memoize filter options
  const actionOptions = useMemo(() => [
    { value: '', label: 'All Actions' },
    { value: 'create', label: 'Create' },
    { value: 'update', label: 'Update' },
    { value: 'delete', label: 'Delete' },
    { value: 'login', label: 'Login' },
    { value: 'logout', label: 'Logout' }
  ], []);

  const entityOptions = useMemo(() => [
    { value: '', label: 'All Entities' },
    { value: 'user', label: 'User' },
    { value: 'inventory', label: 'Inventory' },
    { value: 'request', label: 'Request' },
    { value: 'report', label: 'Report' }
  ], []);

  // Fetch logs with filters
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const constraints = [orderBy('timestamp', 'desc'), limit(20)];

      if (filters.action) {
        constraints.push(where('action', '==', filters.action));
      }
      if (filters.entityType) {
        constraints.push(where('entityType', '==', filters.entityType));
      }
      if (filters.dateRange.start) {
        const startDate = new Date(filters.dateRange.start);
        startDate.setHours(0, 0, 0, 0);
        constraints.push(where('timestamp', '>=', startDate));
      }
      if (filters.dateRange.end) {
        const endDate = new Date(filters.dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        constraints.push(where('timestamp', '<=', endDate));
      }

      const q = query(collection(db, 'auditLogs'), ...constraints);

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
  }, [filters]);

  // Load more logs
  const loadMore = useCallback(async () => {
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
  }, [lastDoc, hasMore]);

  // Export logs to CSV
  const exportToCSV = useCallback(async () => {
    try {
      setExporting(true);
      const csv = Papa.unparse(logs, {
        header: true,
        columns: ['timestamp', 'action', 'entityType', 'userEmail', 'details']
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, `audit_logs_${new Date().toISOString()}.csv`);
      toast.success('Audit logs exported successfully');
    } catch (error) {
      console.error('Error exporting logs:', error);
      toast.error('Failed to export audit logs');
    } finally {
      setExporting(false);
    }
  }, [logs]);

  // Fetch logs when filters change
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <ErrorBoundary>
      <div className={`p-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}`}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold" role="heading" aria-level="1">Audit Logs</h1>
          <Button
            onClick={exportToCSV}
            disabled={exporting || logs.length === 0}
            className={`px-4 py-2 rounded transition-colors duration-200`}
            aria-label="Export audit logs to CSV"
          >
            {exporting ? <LoadingSpinner size="small" /> : 'Export to CSV'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <select
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            className={`p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
              }`}
            aria-label="Filter by action"
          >
            {actionOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={filters.entityType}
            onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
            className={`p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
              }`}
            aria-label="Filter by entity type"
          >
            {entityOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <input
              type="date"
              value={filters.dateRange.start}
              onChange={(e) => setFilters({ ...filters, dateRange: { ...filters.dateRange, start: e.target.value } })}
              className={`p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                }`}
              aria-label="Start date"
            />
            <input
              type="date"
              value={filters.dateRange.end}
              onChange={(e) => setFilters({ ...filters, dateRange: { ...filters.dateRange, end: e.target.value } })}
              className={`p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                }`}
              aria-label="End date"
            />
          </div>
        </div>

        <div className={`overflow-x-auto rounded-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
          <table className="min-w-full" role="table" aria-label="Audit logs">
            <thead className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
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
              {formattedLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-100 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap">{log.timestamp}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-white ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
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
        {!loading && logs.length === 0 && (
          <p className="text-center text-gray-500 mt-4">
            No logs found for the selected filters.
          </p>
        )}
        {loading && <LoadingSpinner />}

        {hasMore && !loading && (
          <Button
            onClick={loadMore}
            className={`mt-4`}
            aria-label="Load more audit logs"
          >
            Load More
          </Button>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default AuditLogs;
