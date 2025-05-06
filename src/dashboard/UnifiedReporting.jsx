import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
    serverTimestamp
} from 'firebase/firestore';
import { db, logAudit } from '../firebase';
import { toast } from 'react-toastify';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { canPerformAction } from '../utils/roleUtils';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBoundary from '../components/ErrorBoundary';
import Button from '../components/Button';
import Tab from '../components/Tab';

/**
 * UnifiedReporting component - Combines Reports and AuditLogs functionality
 * @component
 * @returns {JSX.Element} The rendered UnifiedReporting component
 */
const UnifiedReporting = () => {
    usePageTitle('QCheckCITE - Reporting');
    const { isDarkMode } = useTheme();
    const { user, role } = useAuth();

    // Tabs state
    const [activeTab, setActiveTab] = useState('reports');

    // === SHARED STATE ===
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    // === REPORTS STATE ===
    const [reportType, setReportType] = useState('inventory');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterLab, setFilterLab] = useState('all');
    const [isGenerating, setIsGenerating] = useState(false);
    const [reportData, setReportData] = useState([]);
    const [availableReports, setAvailableReports] = useState([]);
    const [isExporting, setIsExporting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // === AUDIT LOGS STATE ===
    const [logs, setLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [filters, setFilters] = useState({ action: '', entityType: '' });

    // === PERMISSION CHECKS ===
    const canGenerateReports = useMemo(() => canPerformAction(role, 'generate_reports'), [role]);
    const canExportReports = useMemo(() => canPerformAction(role, 'export_reports'), [role]);
    const canSaveReports = useMemo(() => canPerformAction(role, 'save_reports'), [role]);
    const canViewAuditLogs = useMemo(() => canPerformAction(role, 'view_audit_logs'), [role]);

    // === OPTIONS ===
    const reportTypes = useMemo(() => [
        { value: 'inventory', label: 'Inventory Report' },
        { value: 'requests', label: 'Request Report' },
        { value: 'users', label: 'User Report' },
        { value: 'audit', label: 'Audit Log Report' }
    ], []);
    const statusOptions = useMemo(() => [
        { value: 'all', label: 'All Statuses' },
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' }
    ], []);
    const labOptions = useMemo(() => [
        { value: 'all', label: 'All Labs' },
        { value: 'Mac Lab', label: 'Mac Lab' },
        { value: 'EMC Lab', label: 'EMC Lab' },
        { value: 'Others', label: 'Others' }
    ], []);
    const actionOptions = useMemo(() => [
        { value: '', label: 'All Actions' },
        { value: 'user_created', label: 'User Created' },
        { value: 'user_signed_in', label: 'User Signed In' },
        { value: 'user_role_assigned', label: 'User Role Assigned' },
        { value: 'user_role_verified', label: 'User Role Verified' },
        { value: 'user_role_updated', label: 'User Role Updated' },
        { value: 'inventory_added', label: 'Inventory Added' },
        { value: 'inventory_updated', label: 'Inventory Updated' },
        { value: 'inventory_deleted', label: 'Inventory Deleted' },
        { value: 'qr_code_generated', label: 'QR Code Generated' },
        { value: 'qr_code_downloaded', label: 'QR Code Downloaded' },
        { value: 'qr_code_previewed', label: 'QR Code Previewed' },
        { value: 'request_updated_status', label: 'Request Status Updated' },
        { value: 'request_bulk_updated_status', label: 'Requests Bulk Updated' },
        { value: 'report_generated', label: 'Report Generated' },
        { value: 'report_exported', label: 'Report Exported' },
        { value: 'report_saved', label: 'Report Saved' },
        { value: 'audit_logs_exported', label: 'Audit Logs Exported' },
        { value: 'system_action', label: 'System Action' },
    ], []);
    const entityOptions = useMemo(() => [
        { value: '', label: 'All Entities' },
        { value: 'user', label: 'User' },
        { value: 'inventory', label: 'Inventory' },
        { value: 'request', label: 'Request' },
        { value: 'report', label: 'Report' },
        { value: 'auditLog', label: 'Audit Log' },
        { value: 'system', label: 'System' },
    ], []);

    // === REPORTS EFFECT: load saved reports ===
    useEffect(() => {
        if (!user || activeTab !== 'reports') return;
        let unsubscribe;
        (async () => {
            setLoading(true);
            try {
                const q = query(collection(db, 'reports'), orderBy('generatedAt', 'desc'));
                unsubscribe = onSnapshot(q, snap => {
                    setAvailableReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                }, err => {
                    console.error(err);
                    toast.error('Failed to load reports');
                    setError('Failed to load reports');
                });
            } catch (err) {
                console.error(err);
                toast.error('Initialization error');
                setError('Initialization error');
            } finally {
                setLoading(false);
            }
        })();
        return () => unsubscribe && unsubscribe();
    }, [user, activeTab]);

    // === VALIDATION ===
    const validateReportParams = useCallback(() => {
        if (dateRange.start && dateRange.end && new Date(dateRange.start) > new Date(dateRange.end)) {
            toast.error('End date must be after start date');
            return false;
        }
        return true;
    }, [dateRange]);

    // === REPORTS HANDLERS ===
    const generateReport = useCallback(async () => {
        if (!canGenerateReports) return toast.error("No permission to generate");
        if (!validateReportParams()) return;
        setIsGenerating(true);
        try {
            let collectionName = reportType === 'audit' ? 'auditLogs' : reportType;
            let q = query(collection(db, collectionName));
            if (dateRange.start && dateRange.end) {
                const start = new Date(dateRange.start); start.setHours(0, 0, 0, 0);
                const end = new Date(dateRange.end); end.setHours(23, 59, 59, 999);
                q = query(q, where('createdAt', '>=', start), where('createdAt', '<=', end));
            }
            if (reportType === 'requests' && filterStatus !== 'all') q = query(q, where('status', '==', filterStatus));
            if (reportType === 'inventory' && filterLab !== 'all') q = query(q, where('lab', '==', filterLab));
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setReportData(data);
            await logAudit('report_generated', user.email, 'report', {
                reportType,
                filters: { dateRange, filterStatus, filterLab },
            });
            toast.success('Report generated');
        } catch (err) {
            console.error(err);
            toast.error('Failed to generate report');
            setError('Failed to generate report');
        } finally {
            setIsGenerating(false);
        }
    }, [canGenerateReports, reportType, dateRange, filterStatus, filterLab, user, validateReportParams]);

    const exportToCSV = useCallback(async () => {
        if (!canExportReports) return toast.error("No permission to export");
        if (!reportData.length) return toast.warning('No data to export');
        setIsExporting(true);
        try {
            const csv = Papa.unparse(reportData);
            saveAs(new Blob([csv], { type: 'text/csv' }), `${reportType}_report_${new Date().toISOString().slice(0, 10)}.csv`);
            await logAudit('report_exported', user.email, 'report', {
                recordCount: reportData.length,
                reportType,
            });
            toast.success('Exported CSV');
        } catch (err) {
            console.error(err);
            toast.error('Export failed');
        } finally { setIsExporting(false); }
    }, [canExportReports, reportData, reportType, user]);

    const saveReport = useCallback(async () => {
        if (!canSaveReports) return toast.error("No permission to save");
        if (!reportData.length) return toast.warning('No data to save');
        setIsSaving(true);
        try {
            await addDoc(collection(db, 'reports'), {
                type: reportType,
                data: reportData,
                generatedAt: serverTimestamp(),
                filters: { dateRange, filterStatus, filterLab },
                generatedBy: user.email
            });
            await logAudit('report_saved', user.email, 'report', {
                recordCount: reportData.length,
                reportType,
            });
            toast.success('Report saved');
        } catch (err) {
            console.error(err);
            toast.error('Save failed');
        } finally { setIsSaving(false); }
    }, [canSaveReports, reportData, reportType, dateRange, filterStatus, filterLab, user]);

    // === AUDIT LOGS HANDLERS ===
    const safeToString = useCallback(v => v == null ? 'N/A' : typeof v === 'object' ? JSON.stringify(v) : String(v), []);
    const processLogData = useCallback(doc => {
        const d = doc.data();
        return {
            id: doc.id,
            timestamp: d.timestamp?.toDate().toLocaleString() || 'N/A',
            action: safeToString(d.action),
            entityType: safeToString(d.entityType),
            userEmail: safeToString(d.userEmail),
            details: d.details,
            userAgent: safeToString(d.userAgent),
            platform: safeToString(d.platform)
        };
    }, [safeToString]);

    const fetchLogs = useCallback(async () => {
        if (!canViewAuditLogs) return setError("No permission to view logs");
        setLogsLoading(true);
        try {
            let constraints = [orderBy('timestamp', 'desc'), limit(20)];
            if (filters.action) constraints.push(where('action', '==', filters.action));
            if (filters.entityType) constraints.push(where('entityType', '==', filters.entityType));
            if (dateRange.start) { const s = new Date(dateRange.start); s.setHours(0, 0, 0, 0); constraints.push(where('timestamp', '>=', s)); }
            if (dateRange.end) { const e = new Date(dateRange.end); e.setHours(23, 59, 59, 999); constraints.push(where('timestamp', '<=', e)); }
            const snap = await getDocs(query(collection(db, 'auditLogs'), ...constraints));
            const arr = snap.docs.map(processLogData);
            setLogs(arr);
            setLastDoc(snap.docs[snap.docs.length - 1] || null);
            setHasMore(snap.docs.length === 20);
        } catch (err) {
            console.error(err);
            setError('Failed to fetch logs');
        } finally { setLogsLoading(false); }
    }, [canViewAuditLogs, filters, dateRange, processLogData]);

    const loadMore = useCallback(async () => {
        if (!lastDoc || !hasMore || !canViewAuditLogs) return;
        setLogsLoading(true);
        try {
            let constraints = [orderBy('timestamp', 'desc'), startAfter(lastDoc), limit(20)];
            if (filters.action) constraints.push(where('action', '==', filters.action));
            if (filters.entityType) constraints.push(where('entityType', '==', filters.entityType));
            if (dateRange.start) { const s = new Date(dateRange.start); s.setHours(0, 0, 0, 0); constraints.push(where('timestamp', '>=', s)); }
            if (dateRange.end) { const e = new Date(dateRange.end); e.setHours(23, 59, 59, 999); constraints.push(where('timestamp', '<=', e)); }
            const snap = await getDocs(query(collection(db, 'auditLogs'), ...constraints));
            const arr = snap.docs.map(processLogData);
            setLogs(prev => [...prev, ...arr]);
            setLastDoc(snap.docs[snap.docs.length - 1] || null);
            setHasMore(snap.docs.length === 20);
        } catch (err) {
            console.error(err);
            setError('Failed to load more logs');
        } finally { setLogsLoading(false); }
    }, [lastDoc, hasMore, canViewAuditLogs, filters, dateRange, processLogData]);

    const exportLogsToCsv = useCallback(async () => {
        if (!canExportReports) return toast.error("No permission to export");
        setExporting(true);
        try {
            const csvData = logs.map(l => ({ ...l, details: typeof l.details === 'object' ? JSON.stringify(l.details) : String(l.details || '') }));
            const csv = Papa.unparse(csvData, { header: true });
            saveAs(new Blob([csv], { type: 'text/csv' }), `audit_logs_${new Date().toISOString()}.csv`);
            await logAudit('audit_logs_exported', user.email, 'auditLog', {
                recordCount: logs.length,
                filters,
                dateRange,
            });
            toast.success('Logs exported');
        } catch (err) {
            console.error(err); toast.error('Export failed');
        } finally { setExporting(false); }
    }, [canExportReports, logs, user, filters, dateRange]);

    // fetch audit logs on tab switch
    useEffect(() => { if (activeTab === 'auditLogs') fetchLogs(); }, [activeTab, fetchLogs]);

    // renderDetails
    const renderDetails = useCallback(d => {
        if (d == null) return 'No details';
        return typeof d === 'object' ? JSON.stringify(d, null, 2) : String(d);
    }, []);

    return (
        <ErrorBoundary>
            <div className={`p-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}`}>
                <h1 className="text-2xl font-bold mb-6">Unified Reporting</h1>

                {/* Tabs */}
                <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
                    <ul className="flex -mb-px text-sm font-medium">
                        <li className="mr-2">
                            <Tab label="Reports" isActive={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
                        </li>
                        <li>
                            <Tab label="Audit Logs" isActive={activeTab === 'auditLogs'} onClick={() => setActiveTab('auditLogs')} disabled={!canViewAuditLogs} />
                        </li>
                    </ul>
                </div>

                {error && <div className={`p-4 mb-6 rounded ${isDarkMode ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-700'}`} role="alert">{error}</div>}

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
                                    <select value={reportType} onChange={e => setReportType(e.target.value)} className="w-full p-2 rounded border">
                                        {reportTypes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>
                                {/* Date Range */}
                                <div>
                                    <label className="block mb-2">Date Range</label>
                                    <div className="flex gap-2">
                                        <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="p-2 rounded border" />
                                        <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="p-2 rounded border" />
                                    </div>
                                </div>
                                {/* Status Filter */}
                                {reportType === 'requests' && (
                                    <div>
                                        <label className="block mb-2">Status</label>
                                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full p-2 rounded border">
                                            {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                    </div>
                                )}
                                {/* Lab Filter */}
                                {reportType === 'inventory' && (
                                    <div>
                                        <label className="block mb-2">Lab</label>
                                        <select value={filterLab} onChange={e => setFilterLab(e.target.value)} className="w-full p-2 rounded border">
                                            {labOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div className="mt-6 flex gap-4 flex-wrap">
                                <Button onClick={generateReport} disabled={!canGenerateReports || isGenerating} className="px-4 py-2 rounded">
                                    {isGenerating ? <LoadingSpinner size="small" /> : 'Generate'}
                                </Button>
                                <Button onClick={exportToCSV} disabled={!canExportReports || !reportData.length || isExporting} className="px-4 py-2 rounded">
                                    {isExporting ? <LoadingSpinner size="small" /> : 'Export CSV'}
                                </Button>
                                <Button onClick={saveReport} disabled={!canSaveReports || !reportData.length || isSaving} className="px-4 py-2 rounded">
                                    {isSaving ? <LoadingSpinner size="small" /> : 'Save'}
                                </Button>
                            </div>
                        </div>
                        {/* Display Data */}
                        {reportData.length > 0 && (
                            <div className={`p-6 rounded border mb-6 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                                <h2 className="text-xl font-semibold mb-4">Report Data</h2>
                                <div className="overflow-auto">
                                    <table className="min-w-full">
                                        <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                                            <tr>{Object.keys(reportData[0]).map(k => <th key={k} className="px-4 py-2 text-left">{k}</th>)}</tr>
                                        </thead>
                                        <tbody>
                                            {reportData.map((r, i) => (<tr key={i} className="border-b"><>{Object.values(r).map((v, j) => <td key={j} className="px-4 py-2">{safeToString(v)}</td>)}</></tr>))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        {/* Saved Reports */}
                        <div className={`p-6 rounded border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                            <h2 className="text-xl font-semibold mb-4">Saved Reports</h2>
                            {loading ? <LoadingSpinner /> : availableReports.length ? (
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
                                        <tbody>
                                            {availableReports.map(r => (<tr key={r.id} className="border-b">
                                                <td className="px-4 py-2">{r.type}</td>
                                                <td className="px-4 py-2">{r.generatedBy}</td>
                                                <td className="px-4 py-2">{r.generatedAt?.toDate().toLocaleString()}</td>
                                                <td className="px-4 py-2">{r.data.length}</td>
                                            </tr>))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : <p className="text-center">No saved reports.</p>}
                        </div>
                    </>
                )}

                {/* Audit Logs Tab */}
                {activeTab === 'auditLogs' && canViewAuditLogs && (
                    <>
                        <div className="flex justify-between mb-4">
                            <div className="flex gap-4 flex-wrap">
                                <select value={filters.action} onChange={e => setFilters(f => ({ ...f, action: e.target.value }))} className="p-2 rounded border">
                                    {actionOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                                <select value={filters.entityType} onChange={e => setFilters(f => ({ ...f, entityType: e.target.value }))} className="p-2 rounded border">
                                    {entityOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                                <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="p-2 rounded border" />
                                <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="p-2 rounded border" />
                                <Button onClick={fetchLogs} className="px-4 py-2 rounded">Filter</Button>
                            </div>
                            <Button onClick={exportLogsToCsv} disabled={exporting || !logs.length} className="px-4 py-2 rounded">
                                {exporting ? <LoadingSpinner size="small" /> : 'Export CSV'}
                            </Button>
                        </div>
                        {logsLoading && !logs.length ? <LoadingSpinner /> : (
                            <div className="overflow-auto rounded-lg border mb-4">
                                <table className="min-w-full">
                                    <thead className={isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-700'}>
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs uppercase tracking-wider">Timestamp</th>
                                            <th className="px-6 py-3 text-left text-xs uppercase tracking-wider">Action</th>
                                            <th className="px-6 py-3 text-left text-xs uppercase tracking-wider">Entity</th>
                                            <th className="px-6 py-3 text-left text-xs uppercase tracking-wider">User</th>
                                            <th className="px-6 py-3 text-left text-xs uppercase tracking-wider">Details</th>
                                            <th className="px-6 py-3 text-left text-xs uppercase tracking-wider">User Agent</th>
                                            <th className="px-6 py-3 text-left text-xs uppercase tracking-wider">Platform</th>
                                        </tr>
                                    </thead>
                                    <tbody className={isDarkMode ? 'divide-gray-700 bg-gray-900' : 'divide-gray-200 bg-white'}>
                                        {logs.length ? logs.map(l => (
                                            <tr key={l.id} className="hover:bg-gray-100 dark:hover:bg-gray-800">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">{l.timestamp}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm"><span className={`px-2 py-1 rounded text-white ${getActionColor(l.action)}`}>{l.action}</span></td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">{l.entityType}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">{l.userEmail}</td>
                                                <td className="px-6 py-4 text-sm"><pre className="text-xs overflow-x-auto">{renderDetails(l.details)}</pre></td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">{l.userAgent}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">{l.platform}</td>
                                            </tr>
                                        )) : <tr><td colSpan={7} className="px-6 py-4 text-center">No logs found.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {logsLoading && logs.length > 0 && <LoadingSpinner />}
                        {hasMore && !logsLoading && logs.length > 0 && <Button onClick={loadMore} className="w-full">Load More</Button>}
                    </>
                )}
            </div>
        </ErrorBoundary>
    );
};

export default UnifiedReporting;
