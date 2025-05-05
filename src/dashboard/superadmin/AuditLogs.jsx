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
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    dateRange: { start: '', end: '' }
  });

  // Helper function for action colors
  const getActionColor = useCallback((action) => {
    switch (action) {
      case 'create': return 'bg-green-500';
      case 'update': return 'bg-blue-500';
      case 'delete': return 'bg-red-500';
      case 'login': return 'bg-yellow-500';
      case 'logout': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  }, []);

  // Safely convert any value to string for rendering
  const safeToString = useCallback((value) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch (err) {
        return '[Complex Object]';
      }
    }
    return String(value);
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

  // Process log data to ensure all fields are renderable
  const processLogData = useCallback((doc) => {
    const data = doc.data();
    
    // Process timestamp specially
    const timestamp = data.timestamp?.toDate().toLocaleString() || 'N/A';
    
    // Make sure all fields are renderable
    return {
      id: doc.id,
      timestamp,
      action: safeToString(data.action),
      entityType: safeToString(data.entityType),
      userEmail: safeToString(data.userEmail),
      details: data.details, // Will handle special rendering in the component
      userAgent: safeToString(data.userAgent),
      platform: safeToString(data.platform)
    };
  }, [safeToString]);

  // Fetch logs with filters and pagination
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
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
      const newLogs = snapshot.docs.map(processLogData);

      setLogs(newLogs);
      setLastDoc(snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null);
      setHasMore(snapshot.docs.length === 20);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setError('Failed to fetch audit logs.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [filters, processLogData]);

  // Load more logs
  const loadMore = useCallback(async () => {
    if (!lastDoc || !hasMore) return;

    try {
      setLoading(true);
      setError(null);
      const constraints = [
        orderBy('timestamp', 'desc'),
        startAfter(lastDoc),
        limit(20)
      ];

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

      const q = query(
        collection(db, 'auditLogs'),
        ...constraints
      );

      const snapshot = await getDocs(q);
      const newLogs = snapshot.docs.map(processLogData);

      setLogs(prev => [...prev, ...newLogs]);
      setLastDoc(snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null);
      setHasMore(snapshot.docs.length === 20);
    } catch (error) {
      console.error('Error loading more logs:', error);
      setError('Failed to load more logs.');
    } finally {
      setLoading(false);
    }
  }, [lastDoc, hasMore, filters, processLogData]);

  // Export logs to CSV
  const exportToCSV = useCallback(async () => {
    try {
      setExporting(true);
      const csvData = logs.map(log => ({
        ...log,
        details: typeof log.details === 'object' && log.details !== null
                  ? JSON.stringify(log.details)
                  : String(log.details || '')
      }));

      const csv = Papa.unparse(csvData, {
        header: true,
        columns: ['timestamp', 'action', 'entityType', 'userEmail', 'details', 'userAgent', 'platform']
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

  // Fetch logs initially and when filters change
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Helper function to safely render details field
  const renderDetails = (details) => {
    try {
      if (details === null || details === undefined) {
        return 'No details';
      }
      
      if (typeof details === 'object') {
        return JSON.stringify(details, null, 2);
      }
      
      return String(details);
    } catch (err) {
      console.error('Error rendering details:', err);
      return '[Error displaying details]';
    }
  };

  // Conditional rendering for loading and error states
  if (loading && logs.length === 0 && !error) {
    return <LoadingSpinner size="md" />;
  }

  if (error && logs.length === 0) {
    return <div className="text-red-500 p-4 text-center">{error}</div>;
  }

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
          {/* Filter by Action */}
          <select
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            className={`p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-300 text-gray-700'}`}
            aria-label="Filter by action"
          >
            {actionOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Filter by Entity Type */}
          <select
            value={filters.entityType}
            onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
            className={`p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-300 text-gray-700'}`}
            aria-label="Filter by entity type"
          >
            {entityOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Date Range Filters */}
          <div className="flex gap-2">
            <input
              type="date"
              value={filters.dateRange.start}
              onChange={(e) => setFilters({ ...filters, dateRange: { ...filters.dateRange, start: e.target.value } })}
              className={`p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-300 text-gray-700'}`}
              aria-label="Start date"
            />
            <input
              type="date"
              value={filters.dateRange.end}
              onChange={(e) => setFilters({ ...filters, dateRange: { ...filters.dateRange, end: e.target.value } })}
              className={`p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-300 text-gray-700'}`}
              aria-label="End date"
            />
          </div>
        </div>

        <div className={`overflow-x-auto rounded-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <table className={`min-w-full divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`} role="table" aria-label="Audit logs">
            <thead className={`${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-700'}`}>
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Timestamp</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Action</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Entity</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">User</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Details</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">User Agent</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Platform</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700 bg-gray-900' : 'divide-gray-200 bg-white'}`}>
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-100 dark:hover:bg-gray-800">
                    {/* Timestamp */}
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-800'}`}>
                      {log.timestamp}
                    </td>
                    {/* Action */}
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-800'}`}>
                      <span className={`px-2 py-1 rounded text-white text-xs font-semibold ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    {/* Entity Type */}
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-800'}`}>
                      {log.entityType}
                    </td>
                    {/* User Email */}
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-800'}`}>
                      {log.userEmail}
                    </td>
                    {/* Details - WITH IMPROVED ERROR HANDLING */}
                    <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-800'}`}>
                      <pre className={`text-xs overflow-x-auto ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {renderDetails(log.details)}
                      </pre>
                    </td>
                    {/* User Agent */}
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-800'}`}>
                      {log.userAgent}
                    </td>
                    {/* Platform */}
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-800'}`}>
                      {log.platform}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className={`px-6 py-4 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    No audit logs found for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Loading spinner for pagination - show only if loading and logs exist */}
        {loading && logs.length > 0 && <LoadingSpinner />}

        {/* Load More Button - show only if hasMore, not loading, and logs exist */}
        {hasMore && !loading && logs.length > 0 && (
          <Button
            onClick={loadMore}
            className={`mt-4 w-full`}
            aria-label="Load more audit logs"
            disabled={loading}
          >
            Load More
          </Button>
        )}

        {/* Message when no logs are found after initial load - show only if not loading and no logs */}
        {!loading && logs.length === 0 && (
          <p className="text-center text-gray-500 mt-4">
            No logs found for the selected filters.
          </p>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default AuditLogs;