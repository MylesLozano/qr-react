import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  writeBatch,
  serverTimestamp
} from "firebase/firestore";
import { db, logAudit } from "../../firebase";
import usePageTitle from "../../hooks/usePageTitle";
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { toast } from 'react-toastify';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { canPerformAction } from "../../utils/roleUtils";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorBoundary from "../../components/ErrorBoundary";
import Button from "../../components/Button";

/**
 * Requests component - Manages inventory requests
 * @component
 * @returns {JSX.Element} The rendered Requests component
 */
function Requests() {
  usePageTitle("QCheckCITE - Manage Requests");
  const { isDarkMode } = useTheme();
  const { user, role } = useAuth();

  // State management
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [loading, setLoading] = useState(true);
  const [selectedRequests, setSelectedRequests] = useState(new Set());
  const [showDetails, setShowDetails] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

  // Permission checks
  const canManageRequests = useMemo(() => canPerformAction(role, 'manage_requests'), [role]);
  const canExportRequests = useMemo(() => canPerformAction(role, 'export_requests'), [role]);

  // Status options
  const statusOptions = useMemo(() => [
    { value: "all", label: "All Statuses" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" }
  ], []);

  // Memoize filtered requests
  const filteredRequests = useMemo(() => {
    let result = requests;

    // Apply status filter
    if (filter !== "all") {
      result = result.filter(request => request.status === filter);
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(request =>
        request.itemName.toLowerCase().includes(term) ||
        request.userEmail.toLowerCase().includes(term) ||
        request.lab.toLowerCase().includes(term)
      );
    }

    // Apply date range filter
    if (dateRange.start && dateRange.end) {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      result = result.filter(request => {
        const requestDate = request.createdAt?.toDate();
        return requestDate >= startDate && requestDate <= endDate;
      });
    }

    return result;
  }, [requests, filter, searchTerm, dateRange]);

  // Fetch requests with real-time updates
  useEffect(() => {
    if (!user) return;

    let unsubscribe;
    const setupListener = async () => {
      try {
        setLoading(true);
        setError(null);
        const requestsRef = collection(db, "requests");
        const requestsQuery = query(requestsRef, orderBy("createdAt", "desc"));
        unsubscribe = onSnapshot(requestsQuery,
          (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data()
            }));
            setRequests(data);
          },
          (error) => {
            console.error("Error in requests listener:", error);
            setError("Failed to load requests");
            toast.error("Failed to load requests");
          }
        );
      } catch (error) {
        console.error("Error setting up requests listener:", error);
        setError("Failed to initialize requests");
        toast.error("Failed to initialize requests");
      } finally {
        setLoading(false);
      }
    };

    setupListener();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  // Validate date range
  const validateDateRange = useCallback(() => {
    if (dateRange.start && dateRange.end && new Date(dateRange.start) > new Date(dateRange.end)) {
      toast.error("End date must be after start date");
      return false;
    }
    return true;
  }, [dateRange]);

  // Update request status with error handling
  const updateRequestStatus = useCallback(async (id, status) => {
    if (!canManageRequests) {
      toast.error("You don't have permission to manage requests");
      return;
    }

    setIsUpdating(true);
    try {
      await updateDoc(doc(db, "requests", id), {
        status,
        updatedAt: serverTimestamp(),
        updatedBy: user.email
      });
      await logAudit(user.email, `Updated request ${id} status to ${status}`);
      toast.success(`Request ${status}.`);
    } catch (error) {
      console.error("Error updating status:", error);
      setError("Failed to update status");
      toast.error("Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  }, [canManageRequests, user?.email]);

  // Bulk update status with error handling
  const bulkUpdateStatus = useCallback(async (status) => {
    if (!canManageRequests) {
      toast.error("You don't have permission to manage requests");
      return;
    }

    if (selectedRequests.size === 0) {
      toast.warning("No requests selected");
      return;
    }

    setIsUpdating(true);
    try {
      const batch = writeBatch(db);
      selectedRequests.forEach(id => {
        const requestRef = doc(db, "requests", id);
        batch.update(requestRef, {
          status,
          updatedAt: serverTimestamp(),
          updatedBy: user.email
        });
      });
      await batch.commit();
      await logAudit(user.email, `Bulk updated ${selectedRequests.size} requests to ${status}`);
      setSelectedRequests(new Set());
      toast.success(`Successfully ${status} ${selectedRequests.size} request(s)`);
    } catch (error) {
      console.error("Error bulk updating:", error);
      setError("Failed to update requests");
      toast.error("Failed to update requests");
    } finally {
      setIsUpdating(false);
    }
  }, [canManageRequests, selectedRequests, user?.email]);

  // Export to CSV with error handling
  const exportToCSV = useCallback(async () => {
    if (!canExportRequests) {
      toast.error("You don't have permission to export requests");
      return;
    }

    if (filteredRequests.length === 0) {
      toast.warning("No requests to export");
      return;
    }

    setIsExporting(true);
    try {
      const csv = Papa.unparse(filteredRequests.map(request => ({
        ID: request.id,
        Item: request.itemName,
        Quantity: request.quantity,
        Lab: request.lab,
        Status: request.status,
        'Requested By': request.userEmail,
        'Request Date': new Date(request.createdAt?.toDate()).toLocaleString(),
        'Last Updated': new Date(request.updatedAt).toLocaleString(),
        'Updated By': request.updatedBy
      })));
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const fileName = `requests_${new Date().toISOString().split('T')[0]}.csv`;
      saveAs(blob, fileName);
      await logAudit(user.email, "Exported requests to CSV");
      toast.success("Requests exported successfully!");
    } catch (error) {
      console.error("Error exporting:", error);
      setError("Failed to export requests");
      toast.error("Failed to export requests");
    } finally {
      setIsExporting(false);
    }
  }, [canExportRequests, filteredRequests, user?.email]);

  // Row component for virtual list
  const Row = useCallback(({ index, style }) => {
    const request = filteredRequests[index];
    const isSelected = selectedRequests.has(request.id);

    return (
      <div
        style={style}
        className={`border-b p-4 transition-colors duration-200 ${isSelected ? (isDarkMode ? 'bg-gray-700' : 'bg-blue-50') : ''
          }`}
        role="row"
        aria-selected={isSelected}
      >
        <div className="grid grid-cols-5 gap-4 items-center">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                const newSelected = new Set(selectedRequests);
                if (e.target.checked) {
                  newSelected.add(request.id);
                } else {
                  newSelected.delete(request.id);
                }
                setSelectedRequests(newSelected);
              }}
              className="mr-2"
              aria-label={`Select request for ${request.itemName}`}
            />
            <div>
              <div className="font-medium">{request.itemName}</div>
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Requested by: {request.userEmail}
              </div>
            </div>
          </div>
          <div>
            <div className="text-sm">Quantity: {request.quantity}</div>
            <div className="text-sm">Lab: {request.lab}</div>
          </div>
          <div>
            <div className="text-sm">
              Date: {new Date(request.createdAt?.toDate()).toLocaleDateString()}
            </div>
            <Button
              onClick={() => setShowDetails(request)}
              className={`text-sm transition-colors duration-200 ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'
                }`}
              aria-label={`View details for ${request.itemName}`}
            >
              View Details
            </Button>
          </div>
          <div>
            <span className={`px-2 py-1 rounded text-white ${request.status === 'pending' ? 'bg-yellow-500' :
              request.status === 'approved' ? 'bg-green-500' :
                'bg-red-500'
              }`}>
              {request.status}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => updateRequestStatus(request.id, 'approved')}
              disabled={isUpdating || request.status === 'approved'}
              color="green"
              className={`px-3 ${isUpdating || request.status === 'approved' ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label={`Approve request for ${request.itemName}`}
            >
              {isUpdating ? <LoadingSpinner size="small" /> : 'Approve'}
            </Button>
            <Button
              onClick={() => updateRequestStatus(request.id, 'rejected')}
              disabled={isUpdating || request.status === 'rejected'}
              color="red"
              className={`px-3 ${isUpdating || request.status === 'rejected' ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label={`Reject request for ${request.itemName}`}
            >
              {isUpdating ? <LoadingSpinner size="small" /> : 'Reject'}
            </Button>
          </div>
        </div>
      </div>
    );
  }, [filteredRequests, selectedRequests, isDarkMode, isUpdating, updateRequestStatus]);

  return (
    <ErrorBoundary>
      <div className={`p-6 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
        <h1 className="text-2xl font-bold mb-6">Manage Requests</h1>

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
            {/* Filters */}
            <div className={`p-4 rounded-lg mb-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
              <h2 className="text-lg font-semibold mb-4">Filters</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="statusFilter" className="block text-sm font-medium mb-2">
                    Status
                  </label>
                  <select
                    id="statusFilter"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className={`w-full p-2 rounded border transition-colors duration-200 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                      }`}
                    aria-label="Filter by status"
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="searchTerm" className="block text-sm font-medium mb-2">
                    Search
                  </label>
                  <input
                    type="text"
                    id="searchTerm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by item, user, or lab"
                    className={`w-full p-2 rounded border transition-colors duration-200 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                      }`}
                    aria-label="Search requests"
                  />
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
              </div>
            </div>

            {/* Actions */}
            <div className={`p-6 rounded-lg border transition-colors duration-200 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
              }`}>
              <h2 className="text-xl font-semibold mb-4" role="heading" aria-level="2">Actions</h2>
              <div className="flex gap-4">
                <Button
                  onClick={() => bulkUpdateStatus('approved')}
                  disabled={isUpdating || selectedRequests.size === 0}
                  color="green"
                  className={`px-4 ${isUpdating || selectedRequests.size === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  aria-label="Approve selected requests"
                >
                  {isUpdating ? <LoadingSpinner size="small" /> : 'Approve Selected'}
                </Button>
                <Button
                  onClick={() => bulkUpdateStatus('rejected')}
                  disabled={isUpdating || selectedRequests.size === 0}
                  color="red"
                  className={`px-4 ${isUpdating || selectedRequests.size === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  aria-label="Reject selected requests"
                >
                  {isUpdating ? <LoadingSpinner size="small" /> : 'Reject Selected'}
                </Button>
                <Button
                  onClick={exportToCSV}
                  disabled={isExporting || filteredRequests.length === 0}
                  color="blue"
                  className={`px-4 ${isExporting || filteredRequests.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  aria-label="Export requests to CSV"
                >
                  {isExporting ? <LoadingSpinner size="small" /> : 'Export to CSV'}
                </Button>
              </div>
            </div>

            {/* Request List */}
            <div className={`p-6 rounded-lg border transition-colors duration-200 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
              }`}>
              <h2 className="text-xl font-semibold mb-4" role="heading" aria-level="2">Requests</h2>
              <div className="h-[600px]">
                <AutoSizer>
                  {({ height, width }) => (
                    <List
                      height={height}
                      itemCount={filteredRequests.length}
                      itemSize={100}
                      width={width}
                    >
                      {Row}
                    </List>
                  )}
                </AutoSizer>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default Requests;
