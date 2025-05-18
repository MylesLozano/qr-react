import { useState, useEffect, useCallback, useMemo } from 'react';
import usePageTitle from '../hooks/usePageTitle';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, logAudit } from '../firebase';
import { toast } from 'react-toastify';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { canPerformAction } from '../utils/roleUtils';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBoundary from '../components/ErrorBoundary';
import Button from '../components/Button';
import Tab from '../components/Tab';

// Add getActionColor function at the top with other utility functions
const getActionColor = (action, isDarkMode = false) => {
  const colors = {
    // User actions
    user_created: 'bg-blue-600',
    user_signed_in: 'bg-blue-500',
    user_role_assigned: 'bg-blue-700',
    user_role_verified: 'bg-blue-400',
    user_signed_out: 'bg-purple-600',
    user_role_updated: 'bg-blue-800',

    // Inventory actions
    inventory_added: 'bg-green-600',
    inventory_updated: 'bg-green-500',
    inventory_deleted: 'bg-red-600',

    // QR code actions
    qr_code_generated: 'bg-green-700',
    qr_code_downloaded: 'bg-yellow-600',
    qr_code_previewed: 'bg-yellow-500',

    // Request actions
    request_approved: 'bg-purple-500',
    request_rejected: 'bg-red-500',
    request_updated_status: 'bg-purple-600',
    request_bulk_updated_status: 'bg-purple-700',

    // Report actions
    report_generated: 'bg-purple-500',
    report_exported: 'bg-purple-600',
    report_saved: 'bg-purple-700',
    audit_logs_exported: 'bg-purple-800',

    // System actions
    system_action: isDarkMode ? 'bg-gray-600' : 'bg-gray-500',
  };

  return colors[action] || (isDarkMode ? 'bg-gray-700' : 'bg-gray-500');
};

/**
 * UnifiedReporting component - Combines Reports and AuditLogs functionality
 * @component
 * @returns {JSX.Element} The rendered UnifiedReporting component
 */
function UnifiedReporting() {
  usePageTitle('QCheckCITE - Reporting');
  const { isDarkMode } = useTheme();
  const { user, role } = useAuth();

  // Tabs state
  const [activeTab, setActiveTab] = useState('reports'); // === SHARED STATE ===
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // === LOADING STATES ===
  const [loadingStates, setLoadingStates] = useState({
    initialLoad: true, // Initial page load
    fetchingReports: false, // Fetching saved reports
    generatingReport: false, // Generating new report
    exportingCSV: false, // Exporting report to CSV
    savingReport: false, // Saving report to database
    fetchingLogs: false, // Fetching audit logs
    exportingLogs: false, // Exporting audit logs to CSV
    loadingMoreLogs: false, // Loading more audit logs
    fetchingSpecificLogs: false, // Fetching specific log types (sign-out logs)
  });

  // Helper function to update loading states
  const updateLoadingState = useCallback((stateKey, value) => {
    setLoadingStates((prev) => ({ ...prev, [stateKey]: value }));
  }, []);

  // === REPORTS STATE ===
  const [reportType, setReportType] = useState('inventory');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLab, setFilterLab] = useState('all');
  const [reportData, setReportData] = useState([]);
  const [availableReports, setAvailableReports] = useState([]); // === AUDIT LOGS STATE ===
  const [logs, setLogs] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [compactView, setCompactView] = useState(true); // Add state for compact view toggle

  // === PERMISSION CHECKS ===
  const canGenerateReports = useMemo(() => canPerformAction(role, 'generate_reports'), [role]);
  const canExportReports = useMemo(() => canPerformAction(role, 'generate_reports'), [role]);
  const canSaveReports = useMemo(() => canPerformAction(role, 'generate_reports'), [role]);
  const canViewAuditLogs = useMemo(() => canPerformAction(role, 'view_audit_logs'), [role]);

  // === OPTIONS ===
  const reportTypes = useMemo(
    () => [
      { value: 'inventory', label: 'Inventory Report' },
      { value: 'requests', label: 'Request Report' },
      { value: 'users', label: 'User Report' },
      { value: 'audit', label: 'Audit Log Report' },
    ],
    []
  );
  const statusOptions = useMemo(
    () => [
      { value: 'all', label: 'All Statuses' },
      { value: 'pending', label: 'Pending' },
      { value: 'approved', label: 'Approved' },
      { value: 'rejected', label: 'Rejected' },
    ],
    []
  );
  const labOptions = useMemo(
    () => [
      { value: 'all', label: 'All Labs' },
      { value: 'Mac Lab', label: 'Mac Lab' },
      { value: 'EMC Lab', label: 'EMC Lab' },
      { value: 'Others', label: 'Others' },
    ],
    []
  );
  const actionOptions = useMemo(
    () => [
      { value: '', label: 'All Actions' },
      { value: 'user_created', label: 'User Created' },
      { value: 'user_signed_in', label: 'User Signed In' },
      { value: 'user_signed_out', label: 'User Signed Out' },
      { value: 'user_role_assigned', label: 'User Role Assigned' },
      { value: 'user_role_verified', label: 'User Role Verified' },
      { value: 'user_role_updated', label: 'User Role Updated' },
      { value: 'inventory_added', label: 'Inventory Added' },
      { value: 'inventory_updated', label: 'Inventory Updated' },
      { value: 'inventory_deleted', label: 'Inventory Deleted' },
      { value: 'qr_code_generated', label: 'QR Code Generated' },
      { value: 'qr_code_downloaded', label: 'QR Code Downloaded' },
      { value: 'qr_code_previewed', label: 'QR Code Previewed' },
      {
        value: 'request_updated_status',
        label: 'Request Status Updated',
      },
      {
        value: 'request_bulk_updated_status',
        label: 'Requests Bulk Updated',
      },
      { value: 'report_generated', label: 'Report Generated' },
      { value: 'report_exported', label: 'Report Exported' },
      { value: 'report_saved', label: 'Report Saved' },
      { value: 'audit_logs_exported', label: 'Audit Logs Exported' },
      { value: 'system_action', label: 'System Action' },
    ],
    []
  );
  const entityOptions = useMemo(
    () => [
      { value: '', label: 'All Entities' },
      { value: 'user', label: 'User' },
      { value: 'inventory', label: 'Inventory' },
      { value: 'request', label: 'Request' },
      { value: 'report', label: 'Report' },
      { value: 'auditLog', label: 'Audit Log' },
      { value: 'system', label: 'System' },
    ],
    []
  ); // === REPORTS EFFECT: load saved reports ===
  useEffect(() => {
    if (!user || activeTab !== 'reports') return;
    let unsubscribe;
    (async () => {
      updateLoadingState('fetchingReports', true);
      try {
        const q = query(collection(db, 'reports'), orderBy('generatedAt', 'desc'));
        unsubscribe = onSnapshot(
          q,
          (snap) => {
            setAvailableReports(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          },
          (err) => {
            console.error(err);
            toast.error('Failed to load reports');
            setError('Failed to load reports');
          }
        );
      } catch (err) {
        console.error(err);
        toast.error('Initialization error');
        setError('Initialization error');
      } finally {
        updateLoadingState('fetchingReports', false);
        updateLoadingState('initialLoad', false);
      }
    })();
    return () => unsubscribe && unsubscribe();
  }, [user, activeTab, updateLoadingState]);

  // === VALIDATION ===
  const validateReportParams = useCallback(() => {
    if (dateRange.start && dateRange.end && new Date(dateRange.start) > new Date(dateRange.end)) {
      toast.error('End date must be after start date');
      return false;
    }
    return true;
  }, [dateRange]); // === REPORTS HANDLERS ===
  const generateReport = useCallback(async () => {
    if (!canGenerateReports) return toast.error('No permission to generate');
    if (!validateReportParams()) return;
    updateLoadingState('generatingReport', true);
    setReportData([]); // Clear previous data
    setError(null); // Clear previous errors
    try {
      let collectionName = reportType;
      let dateFieldName = 'createdAt'; // Default date field

      if (reportType === 'audit') {
        collectionName = 'auditLogs';
        dateFieldName = 'timestamp'; // Audit logs use 'timestamp'
      } else if (reportType === 'users') {
        collectionName = 'users';
        // dateFieldName = 'createdAt'; // Or 'lastLogin' depending on report needs
      } else if (reportType === 'requests') {
        collectionName = 'requests';
        // dateFieldName = 'createdAt'; // Assuming requests use createdAt
      } else if (reportType === 'inventory') {
        collectionName = 'inventory';
        // dateFieldName = 'createdAt'; // Assuming inventory uses createdAt
      }

      let q = query(collection(db, collectionName));

      // Apply date range filter using the correct field name
      if (dateRange.start) {
        const start = new Date(dateRange.start);
        start.setHours(0, 0, 0, 0);
        q = query(q, where(dateFieldName, '>=', start));
      }
      if (dateRange.end) {
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);
        q = query(q, where(dateFieldName, '<=', end));
      }

      // Apply report-specific filters
      if (reportType === 'requests' && filterStatus !== 'all') {
        q = query(q, where('status', '==', filterStatus));
      }
      if (reportType === 'inventory' && filterLab !== 'all') {
        q = query(q, where('lab', '==', filterLab));
      }

      // Consider adding orderBy for consistency, e.g., orderBy(dateFieldName, 'desc')
      // Note: This might require composite indexes in Firestore
      // q = query(q, orderBy(dateFieldName, 'desc'));

      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(), // Ensure timestamp fields are consistently handled (e.g., convert to ISO string)
        ...(d.data()[dateFieldName]?.toDate && {
          [dateFieldName]: d.data()[dateFieldName].toDate().toISOString(),
        }),
        ...(d.data().createdAt?.toDate && {
          createdAt: d.data().createdAt.toDate().toISOString(),
        }),
        ...(d.data().updatedAt?.toDate && {
          updatedAt: d.data().updatedAt.toDate().toISOString(),
        }),
        ...(d.data().timestamp?.toDate && {
          timestamp: d.data().timestamp.toDate().toISOString(),
        }),
        ...(d.data().lastLogin?.toDate && {
          lastLogin: d.data().lastLogin.toDate().toISOString(),
        }),
      }));

      if (data.length === 0) {
        toast.info('No data found matching the selected criteria.');
      } else {
        toast.success(`Report generated with ${data.length} record(s).`);
      }
      setReportData(data);
      await logAudit('report_generated', user.email, 'report', {
        reportType,
        recordCount: data.length,
        filters: { dateRange, filterStatus, filterLab },
      });
    } catch (err) {
      console.error('Error generating report:', err);
      // Check for Firestore index errors (err.code === 'failed-precondition')
      if (err.code === 'failed-precondition') {
        toast.error('Query requires a Firestore index. Please create it in the Firebase console.');
        setError('Query requires a Firestore index. Check console for details.');
      } else if (err.code === 'permission-denied') {
        toast.error('Permission denied while generating report.');
        setError('Permission denied.');
      } else {
        toast.error('Failed to generate report: ' + err.message);
        setError('Failed to generate report.');
      }
    } finally {
      updateLoadingState('generatingReport', false);
    }
  }, [
    canGenerateReports,
    reportType,
    dateRange,
    filterStatus,
    filterLab,
    user,
    validateReportParams,
    updateLoadingState,
  ]);

  const exportToCSV = useCallback(async () => {
    if (!canExportReports) return toast.error('No permission to export');
    if (!reportData.length) return toast.warning('No data to export');
    updateLoadingState('exportingCSV', true);
    try {
      const csv = Papa.unparse(reportData);
      saveAs(
        new Blob([csv], { type: 'text/csv' }),
        `${reportType}_report_${new Date().toISOString().slice(0, 10)}.csv`
      );
      await logAudit('report_exported', user.email, 'report', {
        recordCount: reportData.length,
        reportType,
      });
      toast.success('Exported CSV');
    } catch (err) {
      console.error(err);
      toast.error('Export failed');
    } finally {
      updateLoadingState('exportingCSV', false);
    }
  }, [canExportReports, reportData, reportType, user, updateLoadingState]);

  const saveReport = useCallback(async () => {
    if (!canSaveReports) return toast.error('No permission to save');
    if (!reportData.length) return toast.warning('No data to save');
    updateLoadingState('savingReport', true);
    try {
      await addDoc(collection(db, 'reports'), {
        type: reportType,
        data: reportData,
        generatedAt: serverTimestamp(),
        filters: { dateRange, filterStatus, filterLab },
        generatedBy: user.email,
      });
      await logAudit('report_saved', user.email, 'report', {
        recordCount: reportData.length,
        reportType,
      });
      toast.success('Report saved');
    } catch (err) {
      console.error(err);
      toast.error('Save failed');
    } finally {
      updateLoadingState('savingReport', false);
    }
  }, [
    canSaveReports,
    reportData,
    reportType,
    dateRange,
    filterStatus,
    filterLab,
    user,
    updateLoadingState,
  ]);

  // === AUDIT LOGS HANDLERS ===
  const safeToString = useCallback(
    (v) => (v == null ? 'N/A' : typeof v === 'object' ? JSON.stringify(v) : String(v)),
    []
  );
  const processLogData = useCallback(
    (doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        timestamp: d.timestamp?.toDate().toLocaleString() || d.clientTimestamp || 'N/A',
        action: safeToString(d.action),
        entityType: safeToString(d.entityType),
        userEmail: safeToString(d.userEmail),
        details: d.details,
        userAgent: safeToString(d.userAgent),
        platform: safeToString(d.platform),
      };
    },
    [safeToString]
  );
  const fetchLogs = useCallback(async () => {
    if (!canViewAuditLogs) return setError('No permission to view logs');
    updateLoadingState('fetchingLogs', true);
    try {
      let constraints = [orderBy('timestamp', 'desc'), limit(20)];
      if (filters.action) constraints.push(where('action', '==', filters.action));
      if (filters.entityType) constraints.push(where('entityType', '==', filters.entityType));
      if (dateRange.start) {
        const s = new Date(dateRange.start);
        s.setHours(0, 0, 0, 0);
        constraints.push(where('timestamp', '>=', s));
      }
      if (dateRange.end) {
        const e = new Date(dateRange.end);
        e.setHours(23, 59, 59, 999);
        constraints.push(where('timestamp', '<=', e));
      }
      const snap = await getDocs(query(collection(db, 'auditLogs'), ...constraints));
      const arr = snap.docs.map(processLogData);
      setLogs(arr);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === 20);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch logs');
    } finally {
      updateLoadingState('fetchingLogs', false);
      updateLoadingState('initialLoad', false);
    }
  }, [canViewAuditLogs, filters, dateRange, processLogData, updateLoadingState]);

  const loadMore = useCallback(async () => {
    if (!lastDoc || !hasMore || !canViewAuditLogs) return;
    updateLoadingState('loadingMoreLogs', true);
    try {
      let constraints = [orderBy('timestamp', 'desc'), startAfter(lastDoc), limit(20)];
      if (filters.action) constraints.push(where('action', '==', filters.action));
      if (filters.entityType) constraints.push(where('entityType', '==', filters.entityType));
      if (dateRange.start) {
        const s = new Date(dateRange.start);
        s.setHours(0, 0, 0, 0);
        constraints.push(where('timestamp', '>=', s));
      }
      if (dateRange.end) {
        const e = new Date(dateRange.end);
        e.setHours(23, 59, 59, 999);
        constraints.push(where('timestamp', '<=', e));
      }
      const snap = await getDocs(query(collection(db, 'auditLogs'), ...constraints));
      const arr = snap.docs.map(processLogData);
      setLogs((prev) => [...prev, ...arr]);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === 20);
    } catch (err) {
      console.error(err);
      setError('Failed to load more logs');
    } finally {
      updateLoadingState('loadingMoreLogs', false);
    }
  }, [lastDoc, hasMore, canViewAuditLogs, filters, dateRange, processLogData, updateLoadingState]);

  const exportLogsToCsv = useCallback(async () => {
    if (!canExportReports) return toast.error('No permission to export');
    updateLoadingState('exportingLogs', true);
    try {
      const csvData = logs.map((l) => ({
        ...l,
        details:
          typeof l.details === 'object' ? JSON.stringify(l.details) : String(l.details || ''),
      }));
      const csv = Papa.unparse(csvData, { header: true });
      saveAs(new Blob([csv], { type: 'text/csv' }), `audit_logs_${new Date().toISOString()}.csv`);
      await logAudit('audit_logs_exported', user.email, 'auditLog', {
        recordCount: logs.length,
        filters,
        dateRange,
      });
      toast.success('Logs exported');
    } catch (err) {
      console.error(err);
      toast.error('Export failed');
    } finally {
      updateLoadingState('exportingLogs', false);
    }
  }, [canExportReports, logs, user, filters, dateRange, updateLoadingState]);

  // Function to filter for sign-out events specifically
  const fetchSignOutLogs = useCallback(async () => {
    if (!canViewAuditLogs) return;
    try {
      updateLoadingState('fetchingSpecificLogs', true);
      const signOutQuery = query(
        collection(db, 'auditLogs'),
        where('action', '==', 'user_signed_out'),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
      const snap = await getDocs(signOutQuery);
      const signOutLogs = snap.docs.map(processLogData);

      if (signOutLogs.length > 0) {
        console.info(`Found ${signOutLogs.length} sign-out logs:`, signOutLogs);
        toast.info(`${signOutLogs.length} sign-out events found`);
      } else {
        console.info('No sign-out logs found');
        toast.info('No sign-out logs found');
      } // Add a tab option to view only sign-out logs
      setLogs(signOutLogs);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === 20);
    } catch (err) {
      console.error('Error fetching sign-out logs:', err);
      toast.error('Failed to fetch sign-out logs');
    } finally {
      updateLoadingState('fetchingSpecificLogs', false);
    }
  }, [canViewAuditLogs, processLogData, updateLoadingState]);

  // fetch audit logs on tab switch
  useEffect(() => {
    if (activeTab === 'auditLogs') fetchLogs();
  }, [activeTab, fetchLogs]); // renderDetails - improved for better readability
  const renderDetails = useCallback((d, compact = false) => {
    if (d == null) return 'No details';

    if (typeof d === 'object') {
      if (compact) {
        // In compact view, extract and display only key information
        const keyInfo = [];
        if (d.itemName) keyInfo.push(`Item: ${d.itemName}`);
        if (d.id) keyInfo.push(`ID: ${d.id}`);
        if (d.reportType) keyInfo.push(`Type: ${d.reportType}`);
        if (d.recordCount) keyInfo.push(`Records: ${d.recordCount}`);
        if (d.status) keyInfo.push(`Status: ${d.status}`);
        if (d.lab) keyInfo.push(`Lab: ${d.lab}`);

        // Return simplified representation or fall back to keys only
        return keyInfo.length
          ? keyInfo.join(' | ')
          : Object.keys(d)
              .slice(0, 3)
              .map((k) => `${k}: ${String(d[k]).substring(0, 20)}`)
              .join(' | ');
      }
      return JSON.stringify(d, null, 2);
    }
    return String(d);
  }, []);

  return (
    <ErrorBoundary>
      <div
        className={`max-w-7xl mx-auto p-4 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}`}
      >
        <h1 className="text-2xl font-bold mb-6">Unified Reporting</h1>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <ul className="flex -mb-px text-sm font-medium">
            <li className="mr-2">
              <Tab
                label="Reports"
                isActive={activeTab === 'reports'}
                onClick={() => setActiveTab('reports')}
              />
            </li>
            <li>
              <Tab
                label="Audit Logs"
                isActive={activeTab === 'auditLogs'}
                onClick={() => setActiveTab('auditLogs')}
                disabled={!canViewAuditLogs}
              />
            </li>
          </ul>
        </div>

        {error && (
          <div
            className={`p-4 mb-6 rounded ${isDarkMode ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-700'}`}
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <>
            {/* Generation Form */}
            <div className={`p-4 rounded mb-6 shadow ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className="text-lg font-semibold mb-4">Generate Report</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Report Type */}
                <div>
                  <label className="block mb-2">Report Type</label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    className="w-full p-2 rounded border"
                  >
                    {reportTypes.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Date Range */}
                <div>
                  <label className="block mb-2">Date Range</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) =>
                        setDateRange((prev) => ({
                          ...prev,
                          start: e.target.value,
                        }))
                      }
                      className="p-2 rounded border"
                    />
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) =>
                        setDateRange((prev) => ({
                          ...prev,
                          end: e.target.value,
                        }))
                      }
                      className="p-2 rounded border"
                    />
                  </div>
                </div>
                {/* Status Filter */}
                {reportType === 'requests' && (
                  <div>
                    <label className="block mb-2">Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full p-2 rounded border"
                    >
                      {statusOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {/* Lab Filter */}
                {reportType === 'inventory' && (
                  <div>
                    <label className="block mb-2">Lab</label>
                    <select
                      value={filterLab}
                      onChange={(e) => setFilterLab(e.target.value)}
                      className="w-full p-2 rounded border"
                    >
                      {labOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="mt-6 flex gap-4 flex-wrap">
                {' '}
                <Button
                  onClick={generateReport}
                  disabled={!canGenerateReports || loadingStates.generatingReport}
                  className="px-4 py-2 rounded"
                >
                  {loadingStates.generatingReport ? <LoadingSpinner size="small" /> : 'Generate'}
                </Button>
                <Button
                  onClick={exportToCSV}
                  disabled={!canExportReports || !reportData.length || loadingStates.exportingCSV}
                  className="px-4 py-2 rounded"
                >
                  {loadingStates.exportingCSV ? <LoadingSpinner size="small" /> : 'Export CSV'}
                </Button>{' '}
                <Button
                  onClick={saveReport}
                  disabled={!canSaveReports || !reportData.length || loadingStates.savingReport}
                  className="px-4 py-2 rounded"
                >
                  {loadingStates.savingReport ? <LoadingSpinner size="small" /> : 'Save'}
                </Button>
              </div>
            </div>
            {/* Display Data */}
            {reportData.length > 0 && (
              <div
                className={`p-6 rounded border mb-6 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}
              >
                <h2 className="text-xl font-semibold mb-4">Report Data</h2>
                <div className="overflow-auto">
                  <table className="min-w-full">
                    <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                      <tr>
                        {Object.keys(reportData[0]).map((k) => (
                          <th key={k} className="px-4 py-2 text-left">
                            {k}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((r, i) => (
                        <tr key={i} className="border-b">
                          <>
                            {Object.values(r).map((v, j) => (
                              <td key={j} className="px-4 py-2">
                                {safeToString(v)}
                              </td>
                            ))}
                          </>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {/* Saved Reports */}
            <div
              className={`p-6 rounded border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}
            >
              <h2 className="text-xl font-semibold mb-4">Saved Reports</h2>
              {loadingStates.fetchingReports ? (
                <LoadingSpinner />
              ) : availableReports.length ? (
                <div className="overflow-auto">
                  <table className="min-w-full">
                    <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                      <tr>
                        <th className="px-4 py-2 text-left">Type</th>
                        <th className="px-4 py-2 text-left">Generated By</th>
                        <th className="px-4 py-2 text-left">Date</th>
                        <th className="px-4 py-2 text-left">Records</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {availableReports.map((r) => (
                        <tr
                          key={r.id}
                          className={`hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
                        >
                          <td className="px-3 py-2 whitespace-nowrap text-sm">{r.type}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">{r.generatedBy}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">
                            {r.generatedAt?.toDate().toLocaleString()}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">{r.data.length}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-4">No saved reports.</p>
              )}
            </div>
          </>
        )}

        {/* Audit Logs Tab */}
        {activeTab === 'auditLogs' && canViewAuditLogs && (
          <>
            <div className="relative">
              {' '}
              {/* Filter Button */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className={`px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                    aria-expanded={isFilterOpen}
                    aria-haspopup="true"
                  >
                    <span className="flex items-center gap-2">
                      <span>Filters</span>
                      <span
                        className={`transform transition-transform ${isFilterOpen ? 'rotate-180' : ''}`}
                      >
                        ▼
                      </span>
                    </span>
                  </Button>

                  {/* Toggle for compact/detailed view */}
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {compactView ? 'Compact View' : 'Detailed View'}
                    </span>
                    <button
                      onClick={() => setCompactView(!compactView)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        compactView ? 'bg-blue-600' : isDarkMode ? 'bg-gray-700' : 'bg-gray-300'
                      }`}
                      role="switch"
                      aria-checked={compactView}
                    >
                      <span
                        aria-hidden="true"
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          compactView ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  {' '}
                  <Button
                    onClick={fetchSignOutLogs}
                    disabled={loadingStates.fetchingSpecificLogs}
                    className="px-4 py-2 rounded"
                  >
                    {loadingStates.fetchingSpecificLogs ? (
                      <LoadingSpinner size="small" />
                    ) : (
                      'View Sign-Out Logs'
                    )}
                  </Button>{' '}
                  <Button
                    onClick={exportLogsToCsv}
                    disabled={loadingStates.exportingLogs || !logs.length}
                    className="px-4 py-2 rounded"
                  >
                    {loadingStates.exportingLogs ? <LoadingSpinner size="small" /> : 'Export CSV'}
                  </Button>
                </div>
              </div>
              {/* Filter Dropdown */}
              {isFilterOpen && (
                <div
                  className={`absolute z-10 mt-1 w-80 rounded-md shadow-lg ${
                    isDarkMode
                      ? 'bg-gray-800 border border-gray-700'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className="p-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Action Type</label>
                      <select
                        value={filters.action}
                        onChange={(e) =>
                          setFilters((f) => ({
                            ...f,
                            action: e.target.value,
                          }))
                        }
                        className={`w-full p-2 rounded border ${
                          isDarkMode
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-black'
                        }`}
                      >
                        {actionOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Entity Type</label>
                      <select
                        value={filters.entityType}
                        onChange={(e) =>
                          setFilters((f) => ({
                            ...f,
                            entityType: e.target.value,
                          }))
                        }
                        className={`w-full p-2 rounded border ${
                          isDarkMode
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-black'
                        }`}
                      >
                        {entityOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Date Range</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={dateRange.start}
                          onChange={(e) =>
                            setDateRange((prev) => ({
                              ...prev,
                              start: e.target.value,
                            }))
                          }
                          className={`w-full p-2 rounded border ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white'
                              : 'bg-white border-gray-300 text-black'
                          }`}
                        />
                        <input
                          type="date"
                          value={dateRange.end}
                          onChange={(e) =>
                            setDateRange((prev) => ({
                              ...prev,
                              end: e.target.value,
                            }))
                          }
                          className={`w-full p-2 rounded border ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white'
                              : 'bg-white border-gray-300 text-black'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <Button
                        onClick={() => {
                          setFilters({ action: '', entityType: '' });
                          setDateRange({ start: '', end: '' });
                          setIsFilterOpen(false);
                          fetchLogs();
                        }}
                        className={`px-4 py-2 rounded ${
                          isDarkMode
                            ? 'bg-gray-700 hover:bg-gray-600'
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        Clear Filters
                      </Button>
                      <Button
                        onClick={() => {
                          fetchLogs();
                          setIsFilterOpen(false);
                        }}
                        className="px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        Apply Filters
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>{' '}
            {/* Table Section */}
            {loadingStates.fetchingLogs && !logs.length ? (
              <LoadingSpinner />
            ) : (
              <div className="overflow-auto rounded-lg border mb-4">
                <table className="min-w-full">
                  <thead
                    className={
                      isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-700'
                    }
                  >
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Action
                      </th>
                      {!compactView && (
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Entity
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Details
                      </th>
                      {!compactView && (
                        <>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                            User Agent
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                            Platform
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody
                    className={
                      isDarkMode
                        ? 'divide-y divide-gray-700 bg-gray-900'
                        : 'divide-y divide-gray-200 bg-white'
                    }
                  >
                    {logs.length ? (
                      logs.map((l) => (
                        <tr key={l.id} className={'hover:bg-gray-100 dark:hover:bg-gray-800'}>
                          {' '}
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {typeof l.timestamp === 'string'
                              ? l.timestamp.split(',')[1] || l.timestamp
                              : l.timestamp}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span
                              className={`${getActionColor(l.action, isDarkMode)} px-2 py-1 text-white rounded-full font-medium`}
                            >
                              {l.action.replace(/_/g, ' ')}
                            </span>
                          </td>
                          {!compactView && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{l.entityType}</td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{l.userEmail}</td>
                          <td className="px-6 py-4 text-sm">
                            {compactView ? (
                              <div className="max-w-xs truncate">
                                {renderDetails(l.details, true)}
                              </div>
                            ) : (
                              <pre
                                className={`overflow-x-auto p-2 rounded ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-black'}`}
                              >
                                {renderDetails(l.details)}
                              </pre>
                            )}
                          </td>
                          {!compactView && (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                                {l.userAgent?.substring(0, 50)}
                                {l.userAgent?.length > 50 ? '...' : ''}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">{l.platform}</td>
                            </>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={compactView ? 4 : 7} className="px-6 py-4 text-center">
                          No logs found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>{' '}
              </div>
            )}
            {loadingStates.fetchingLogs && logs.length > 0 && <LoadingSpinner />}
            {hasMore && !loadingStates.loadingMoreLogs && logs.length > 0 && (
              <div className="mt-4">
                <Button
                  onClick={loadMore}
                  className="w-full"
                  disabled={loadingStates.loadingMoreLogs}
                >
                  {loadingStates.loadingMoreLogs ? <LoadingSpinner size="small" /> : 'Load More'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default UnifiedReporting;
