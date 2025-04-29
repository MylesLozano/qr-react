import React, { useState, useEffect, useMemo } from "react";
import BaseDashboard from "../BaseDashboard";
import usePageTitle from "../../hooks/usePageTitle";
import { collection, query, where, orderBy, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { toast } from "react-toastify";
import Papa from "papaparse";
import { saveAs } from "file-saver";
import { useTheme } from "../../context/ThemeContext";

function Reports() {
  usePageTitle("QCheckCITE - Reports");
  const { isDarkMode } = useTheme();

  // State for report generation
  const [reportType, setReportType] = useState("inventory");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterLab, setFilterLab] = useState("all");
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [availableReports, setAvailableReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Report type options
  const reportTypes = [
    { value: "inventory", label: "Inventory Report" },
    { value: "requests", label: "Request Report" },
    { value: "users", label: "User Report" },
    { value: "audit", label: "Audit Log Report" }
  ];

  // Status options
  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" }
  ];

  // Lab options
  const labOptions = [
    { value: "all", label: "All Labs" },
    { value: "Mac Lab", label: "Mac Lab" },
    { value: "EMC Lab", label: "EMC Lab" },
    { value: "Others", label: "Others" }
  ];

  // Fetch available reports
  useEffect(() => {
    const q = query(collection(db, "reports"), orderBy("generatedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reports = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAvailableReports(reports);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Generate report
  const generateReport = async () => {
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

      let q = query(collection(db, collectionName));

      // Apply date range filter if specified
      if (dateRange.start && dateRange.end) {
        q = query(
          q,
          where("createdAt", ">=", new Date(dateRange.start)),
          where("createdAt", "<=", new Date(dateRange.end))
        );
      }

      // Apply status filter for requests
      if (reportType === "requests" && filterStatus !== "all") {
        q = query(q, where("status", "==", filterStatus));
      }

      // Apply lab filter for inventory
      if (reportType === "inventory" && filterLab !== "all") {
        q = query(q, where("lab", "==", filterLab));
      }

      const snapshot = await getDocs(q);
      data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setReportData(data);
      toast.success("Report generated successfully!");
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  // Export report to CSV
  const exportToCSV = () => {
    if (reportData.length === 0) {
      toast.warning("No data to export");
      return;
    }

    const csv = Papa.unparse(reportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const fileName = `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
    saveAs(blob, fileName);
    toast.success("Report exported successfully!");
  };

  // Save report to Firestore
  const saveReport = async () => {
    if (reportData.length === 0) {
      toast.warning("No data to save");
      return;
    }

    try {
      const reportRef = collection(db, "reports");
      await addDoc(reportRef, {
        type: reportType,
        data: reportData,
        generatedAt: new Date(),
        filters: {
          dateRange,
          status: filterStatus,
          lab: filterLab
        }
      });
      toast.success("Report saved successfully!");
    } catch (error) {
      console.error("Error saving report:", error);
      toast.error("Failed to save report");
    }
  };

  return (
    <BaseDashboard role="admin">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Reports</h1>

        {/* Report Generation Form */}
        <div className={`p-6 rounded-lg shadow mb-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className="text-xl font-semibold mb-4">Generate Report</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
              >
                {reportTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Date Range</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className={`p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                />
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className={`p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                />
              </div>
            </div>

            {reportType === "requests" && (
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            )}

            {reportType === "inventory" && (
              <div>
                <label className="block text-sm font-medium mb-1">Lab</label>
                <select
                  value={filterLab}
                  onChange={(e) => setFilterLab(e.target.value)}
                  className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                >
                  {labOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={generateReport}
              disabled={isGenerating}
              className={`px-4 py-2 rounded text-white ${isGenerating ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'}`}
            >
              {isGenerating ? 'Generating...' : 'Generate Report'}
            </button>
            <button
              onClick={exportToCSV}
              disabled={reportData.length === 0}
              className={`px-4 py-2 rounded text-white ${reportData.length === 0 ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'}`}
            >
              Export to CSV
            </button>
            <button
              onClick={saveReport}
              disabled={reportData.length === 0}
              className={`px-4 py-2 rounded text-white ${reportData.length === 0 ? 'bg-gray-400' : 'bg-purple-500 hover:bg-purple-600'}`}
            >
              Save Report
            </button>
          </div>
        </div>

        {/* Report Preview */}
        {reportData.length > 0 && (
          <div className={`p-6 rounded-lg shadow mb-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className="text-xl font-semibold mb-4">Report Preview</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    {Object.keys(reportData[0]).map(key => (
                      <th key={key} className="p-2 text-left">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.slice(0, 5).map((row, index) => (
                    <tr key={index} className={`${index % 2 === 0 ? (isDarkMode ? 'bg-gray-700' : 'bg-white') : (isDarkMode ? 'bg-gray-800' : 'bg-gray-50')}`}>
                      {Object.values(row).map((value, i) => (
                        <td key={i} className="p-2">{value?.toString() || ''}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {reportData.length > 5 && (
                <p className="text-sm text-gray-500 mt-2">
                  Showing first 5 of {reportData.length} records
                </p>
              )}
            </div>
          </div>
        )}

        {/* Saved Reports */}
        <div className={`p-6 rounded-lg shadow ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className="text-xl font-semibold mb-4">Saved Reports</h2>
          {loading ? (
            <p>Loading saved reports...</p>
          ) : availableReports.length === 0 ? (
            <p>No saved reports available</p>
          ) : (
            <div className="space-y-4">
              {availableReports.map(report => (
                <div key={report.id} className={`p-4 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{reportTypes.find(t => t.value === report.type)?.label}</h3>
                      <p className="text-sm text-gray-500">
                        Generated on: {new Date(report.generatedAt?.toDate()).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setReportData(report.data);
                        setReportType(report.type);
                        setDateRange(report.filters?.dateRange || { start: "", end: "" });
                        setFilterStatus(report.filters?.status || "all");
                        setFilterLab(report.filters?.lab || "all");
                      }}
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Load
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </BaseDashboard>
  );
}

export default Reports;