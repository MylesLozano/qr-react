import React, { useState, useEffect, useCallback, useMemo } from "react";
import usePageTitle from "../../hooks/usePageTitle";
import { collection, query, where, orderBy, onSnapshot, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db, logAudit } from "../../firebase";
import { toast } from "react-toastify";
import Papa from "papaparse";
import { saveAs } from "file-saver";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { canPerformAction } from "../../utils/roleUtils";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorBoundary from "../../components/ErrorBoundary";

/**
 * Reports component - Manages report generation, export, and storage
 * @component
 * @returns {JSX.Element} The rendered Reports component
 */
function Reports() {
  usePageTitle("QCheckCITE - Reports");
  const { isDarkMode } = useTheme();
  const { user, role } = useAuth();

  // State for report generation
  const [reportType, setReportType] = useState("inventory");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterLab, setFilterLab] = useState("all");
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [availableReports, setAvailableReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Permission checks
  const canGenerateReports = useMemo(() => canPerformAction(role, 'generate_reports'), [role]);
  const canExportReports = useMemo(() => canPerformAction(role, 'export_reports'), [role]);
  const canSaveReports = useMemo(() => canPerformAction(role, 'save_reports'), [role]);

  // Report type options
  const reportTypes = useMemo(() => [
    { value: "inventory", label: "Inventory Report" },
    { value: "requests", label: "Request Report" },
    { value: "users", label: "User Report" },
    { value: "audit", label: "Audit Log Report" }
  ], []);

  // Status options
  const statusOptions = useMemo(() => [
    { value: "all", label: "All Statuses" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" }
  ], []);

  // Lab options
  const labOptions = useMemo(() => [
    { value: "all", label: "All Labs" },
    { value: "Mac Lab", label: "Mac Lab" },
    { value: "EMC Lab", label: "EMC Lab" },
    { value: "Others", label: "Others" }
  ], []);

  // Fetch available reports with real-time updates
  useEffect(() => {
    if (!user) return;

    let unsubscribe;
    const setupListener = async () => {
      try {
        setLoading(true);
        setError(null);
        const reportsQuery = query(collection(db, "reports"), orderBy("generatedAt", "desc"));
        unsubscribe = onSnapshot(reportsQuery,
          (snapshot) => {
            const reports = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setAvailableReports(reports);
          },
          (error) => {
            console.error("Error in reports listener:", error);
            setError("Failed to load reports");
            toast.error("Failed to load reports");
          }
        );
      } catch (error) {
        console.error("Error setting up reports listener:", error);
        setError("Failed to initialize reports");
        toast.error("Failed to initialize reports");
      } finally {
        setLoading(false);
      }
    };

    setupListener();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  // Validate report parameters
  const validateReportParams = useCallback(() => {
    if (dateRange.start && dateRange.end && new Date(dateRange.start) > new Date(dateRange.end)) {
      toast.error("End date must be after start date");
      return false;
    }
    return true;
  }, [dateRange]);

  // Generate report with error handling
  const generateReport = useCallback(async () => {
    if (!canGenerateReports) {
      toast.error("You don't have permission to generate reports");
      return;
    }

    if (!validateReportParams()) return;

    setIsGenerating(true);
    try {
      let data = [];
      let collectionName = "";

      switch (reportType) {
        case "inventory":
          collectionName = "inventory";
          break;
        case "requests":
          collectionName = "requests";
          break;
        case "users":
          collectionName = "users";
          break;
        case "audit":
          collectionName = "auditLogs";
          break;
        default:
          throw new Error("Invalid report type");
      }

      let reportQuery = query(collection(db, collectionName));

      // Apply date range filter if specified
      if (dateRange.start && dateRange.end) {
        reportQuery = query(
          reportQuery,
          where("createdAt", ">=", new Date(dateRange.start)),
          where("createdAt", "<=", new Date(dateRange.end))
        );
      }

      // Apply status filter for requests
      if (reportType === "requests" && filterStatus !== "all") {
        reportQuery = query(reportQuery, where("status", "==", filterStatus));
      }

      // Apply lab filter for inventory
      if (reportType === "inventory" && filterLab !== "all") {
        reportQuery = query(reportQuery, where("lab", "==", filterLab));
      }

      const snapshot = await getDocs(reportQuery);
      data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (data.length === 0) {
        toast.warning("No data found for the selected criteria");
      }

      setReportData(data);
      await logAudit(user.email, `Generated ${reportType} report`);
      toast.success("Report generated successfully!");
    } catch (error) {
      console.error("Error generating report:", error);
      setError("Failed to generate report");
      toast.error("Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  }, [canGenerateReports, reportType, dateRange, filterStatus, filterLab, user?.email, validateReportParams]);

  // Export report to CSV with error handling
  const exportToCSV = useCallback(async () => {
    if (!canExportReports) {
      toast.error("You don't have permission to export reports");
      return;
    }

    if (reportData.length === 0) {
      toast.warning("No data to export");
      return;
    }

    setIsExporting(true);
    try {
      const csv = Papa.unparse(reportData);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const fileName = `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
      saveAs(blob, fileName);
      await logAudit(user.email, `Exported ${reportType} report to CSV`);
      toast.success("Report exported successfully!");
    } catch (error) {
      console.error("Error exporting report:", error);
      setError("Failed to export report");
      toast.error("Failed to export report");
    } finally {
      setIsExporting(false);
    }
  }, [canExportReports, reportData, reportType, user?.email]);

  // Save report to Firestore with error handling
  const saveReport = useCallback(async () => {
    if (!canSaveReports) {
      toast.error("You don't have permission to save reports");
      return;
    }

    if (reportData.length === 0) {
      toast.warning("No data to save");
      return;
    }

    setIsSaving(true);
    try {
      const reportRef = collection(db, "reports");
      await addDoc(reportRef, {
        type: reportType,
        data: reportData,
        generatedAt: serverTimestamp(),
        filters: {
          dateRange,
          status: filterStatus,
          lab: filterLab
        },
        generatedBy: user.email
      });
      await logAudit(user.email, `Saved ${reportType} report`);
      toast.success("Report saved successfully!");
    } catch (error) {
      console.error("Error saving report:", error);
      setError("Failed to save report");
      toast.error("Failed to save report");
    } finally {
      setIsSaving(false);
    }
  }, [canSaveReports, reportData, reportType, dateRange, filterStatus, filterLab, user?.email]);

  return (
    <ErrorBoundary>
      <div className={`p-6 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
        <h1 className="text-2xl font-bold mb-6">Reports</h1>

        {error && (
          <div className={`p-4 mb-6 rounded-lg ${isDarkMode ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-700'
            }`} role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="space-y-6">
            {/* Report Generation Form */}
            <div className={`p-4 rounded-lg mb-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
              <h2 className="text-lg font-semibold mb-4">Generate Report</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="reportType" className="block text-sm font-medium mb-2">
                    Report Type
                  </label>
                  <select
                    id="reportType"
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    className={`w-full p-2 rounded border transition-colors duration-200 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                      }`}
                    aria-label="Report type"
                  >
                    {reportTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Date Range</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className={`p-2 rounded border transition-colors duration-200 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                        }`}
                      aria-label="Start date"
                    />
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className={`p-2 rounded border transition-colors duration-200 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                        }`}
                      aria-label="End date"
                    />
                  </div>
                </div>

                {reportType === "requests" && (
                  <div>
                    <label htmlFor="filterStatus" className="block text-sm font-medium mb-2">
                      Status
                    </label>
                    <select
                      id="filterStatus"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className={`w-full p-2 rounded border transition-colors duration-200 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                        }`}
                      aria-label="Filter by status"
                    >
                      {statusOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {reportType === "inventory" && (
                  <div>
                    <label htmlFor="filterLab" className="block text-sm font-medium mb-2">
                      Lab
                    </label>
                    <select
                      id="filterLab"
                      value={filterLab}
                      onChange={(e) => setFilterLab(e.target.value)}
                      className={`w-full p-2 rounded border transition-colors duration-200 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                        }`}
                      aria-label="Filter by lab"
                    >
                      {labOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-4">
                <button
                  onClick={generateReport}
                  disabled={isGenerating}
                  className={`px-4 py-2 rounded transition-colors duration-200 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                    } text-white ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  aria-label="Generate report"
                >
                  {isGenerating ? <LoadingSpinner size="small" /> : 'Generate Report'}
                </button>

                <button
                  onClick={exportToCSV}
                  disabled={isExporting || reportData.length === 0}
                  className={`px-4 py-2 rounded transition-colors duration-200 ${isDarkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'
                    } text-white ${(isExporting || reportData.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  aria-label="Export report to CSV"
                >
                  {isExporting ? <LoadingSpinner size="small" /> : 'Export to CSV'}
                </button>

                <button
                  onClick={saveReport}
                  disabled={isSaving || reportData.length === 0}
                  className={`px-4 py-2 rounded transition-colors duration-200 ${isDarkMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-500 hover:bg-purple-600'
                    } text-white ${(isSaving || reportData.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  aria-label="Save report"
                >
                  {isSaving ? <LoadingSpinner size="small" /> : 'Save Report'}
                </button>
              </div>
            </div>

            {/* Report Data Display */}
            {reportData.length > 0 && (
              <div className={`p-6 rounded-lg border transition-colors duration-200 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
                }`}>
                <h2 className="text-xl font-semibold mb-4" role="heading" aria-level="2">Report Data</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full" role="table" aria-label="Report data">
                    <thead>
                      <tr className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        {Object.keys(reportData[0]).map(key => (
                          <th key={key} className="px-4 py-2 text-left">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((row, index) => (
                        <tr key={index} className={`${isDarkMode ? 'border-gray-700' : 'border-gray-200'} border-b`}>
                          {Object.values(row).map((value, i) => (
                            <td key={i} className="px-4 py-2">{String(value)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Saved Reports */}
            <div className={`p-6 rounded-lg border transition-colors duration-200 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
              }`}>
              <h2 className="text-xl font-semibold mb-4" role="heading" aria-level="2">Saved Reports</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full" role="table" aria-label="Saved reports">
                  <thead>
                    <tr className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <th className="px-4 py-2 text-left">Type</th>
                      <th className="px-4 py-2 text-left">Generated By</th>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Records</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableReports.map(report => (
                      <tr key={report.id} className={`${isDarkMode ? 'border-gray-700' : 'border-gray-200'} border-b`}>
                        <td className="px-4 py-2">{report.type}</td>
                        <td className="px-4 py-2">{report.generatedBy}</td>
                        <td className="px-4 py-2">
                          {report.generatedAt?.toDate().toLocaleString()}
                        </td>
                        <td className="px-4 py-2">{report.data.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default Reports;