import { useState, useEffect, useCallback, useMemo } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  query,
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
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../hooks/useAuth";
import { canPerformAction } from "../../utils/roleUtils";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorBoundary from "../../components/ErrorBoundary";
import Button from "../../components/Button";

// Add this component at the top of your file, after imports
  const RequestDetailsModal = ({ request, onClose, isDarkMode }) => {
    if (!request) return null;
    
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isDarkMode ? 'bg-black/70' : 'bg-gray-500/70'}`}>
        <div className={`w-full max-w-2xl rounded-lg shadow-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Request Details</h2>
            <button 
              onClick={onClose}
              aria-label="Close details"
              className={`p-2 rounded-full hover:bg-gray-200 ${isDarkMode ? 'hover:bg-gray-700' : ''}`}
            >
              ✕
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <h3 className="font-semibold">Item</h3>
              <p>{request.itemName}</p>
            </div>
            <div>
              <h3 className="font-semibold">Quantity</h3>
              <p>{request.quantity}</p>
            </div>
            <div>
              <h3 className="font-semibold">Lab</h3>
              <p>{request.lab}</p>
            </div>
            <div>
              <h3 className="font-semibold">Status</h3>
              <p className="capitalize">{request.status}</p>
            </div>
            <div>
              <h3 className="font-semibold">Requested By</h3>
              <p>{request.userEmail}</p>
            </div>
            <div>
              <h3 className="font-semibold">Date Requested</h3>
              <p>{request.createdAt?.toDate().toLocaleString()}</p>
            </div>
            {request.updatedAt && (
              <>
                <div>
                  <h3 className="font-semibold">Last Updated</h3>
                  <p>{new Date(request.updatedAt.toDate()).toLocaleString()}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Updated By</h3>
                  <p>{request.updatedBy}</p>
                </div>
              </>
            )}
          </div>
          
          {request.reason && (
            <div className="mb-4">
              <h3 className="font-semibold">Reason for Request</h3>
              <p>{request.reason}</p>
            </div>
          )}
          
          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded ${isDarkMode ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };
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

  // Helper function for status colors
  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500';
      case 'approved':
        return 'bg-green-500';
      case 'rejected':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  }, []);

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

  // Add this within your Requests component, alongside other handler functions
  const handleDateRangeChange = useCallback((field, value) => {
    const newDateRange = { ...dateRange, [field]: value };
    setDateRange(newDateRange);
    
    // Validate date range if both dates are set
    if (newDateRange.start && newDateRange.end) {
      validateDateRange();
    }
  }, [dateRange, validateDateRange]);

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
      await logAudit('request_updated_status', user.email, 'request', {
        requestId: id,
        status: status,
      });
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
      await logAudit('request_bulk_updated_status', user.email, 'request', {
        requestCount: selectedRequests.size,
        status: status,
      });
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
      await logAudit('report_exported', user.email, 'request', {
        recordCount: filteredRequests.length,
      });
      toast.success("Requests exported successfully!");
    } catch (error) {
      console.error("Error exporting:", error);
      setError("Failed to export requests");
      toast.error("Failed to export requests");
    } finally {
      setIsExporting(false);
    }
  }, [canExportRequests, filteredRequests, user?.email]);

  // Add this component inside the Requests file for when no requests are found
  const EmptyRequestsOptions = ({ isDarkMode, onExportSample, onToggleFilter }) => {
    return (
      <div className={`rounded-lg shadow-md p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} mb-6`}>
        <h2 className="text-xl font-semibold mb-4">No Requests Found</h2>
        <p className="mb-4">There are currently no requests that match your filters, or no requests have been submitted yet.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <h3 className="font-bold text-lg mb-2">
              <span className="mr-2" aria-hidden="true">🔍</span>
              Adjust Filters
            </h3>
            <p className="mb-3">Try changing your filter settings to see more requests.</p>
            <Button
              onClick={onToggleFilter}
              color="blue"
              size="md"
              className="w-full"
            >
              Show All Requests
            </Button>
          </div>

          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <h3 className="font-bold text-lg mb-2">
              <span className="mr-2" aria-hidden="true">📋</span>
              Request Template
            </h3>
            <p className="mb-3">Download a sample CSV of request data for reference.</p>
            <Button
              onClick={onExportSample}
              color="green"
              size="md"
              className="w-full"
            >
              Download Sample
            </Button>
          </div>
        </div>

        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-indigo-900/20' : 'bg-indigo-50'} border ${isDarkMode ? 'border-indigo-800' : 'border-indigo-200'}`}>
          <h3 className="font-semibold mb-2 flex items-center">
            <span className="mr-2 text-xl">💡</span>
            Request Management Process
          </h3>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Wait for users to submit inventory requests</li>
            <li>Review the request details and purpose</li>
            <li>Approve or reject requests based on availability and policy</li>
            <li>Add notes for users when necessary</li>
            <li>Export request data for record-keeping</li>
          </ol>
        </div>
      </div>
    );
  };

  // Function to generate sample CSV data
  const generateSampleRequestData = () => {
    return [
      {
        ID: 'sample-001',
        Item: 'MacBook Pro 16"',
        Quantity: 1,
        Lab: 'Mac Lab',
        Status: 'pending',
        'Requested By': 'student@jmc.edu.ph',
        'Request Date': new Date().toLocaleString(),
        'Last Updated': new Date().toLocaleString(),
        'Updated By': 'admin@jmc.edu.ph',
        Reason: 'For Final year project',
        'Usage Location': 'Computer Lab 2'
      },
      {
        ID: 'sample-002',
        Item: 'HDMI Cable',
        Quantity: 5,
        Lab: 'EMC Lab',
        Status: 'approved',
        'Requested By': 'faculty@jmc.edu.ph',
        'Request Date': new Date(Date.now() - 86400000).toLocaleString(),
        'Last Updated': new Date(Date.now() - 43200000).toLocaleString(),
        'Updated By': 'admin@jmc.edu.ph',
        Reason: 'For classroom presentations',
        'Usage Location': 'Room 305'
      }
    ];
  };

  // Then in your existing component code, add the handler function:
  // Add this to your existing handlers section
  const exportSampleCSV = useCallback(() => {
    try {
      const sampleData = generateSampleRequestData();
      const csv = Papa.unparse(sampleData);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      saveAs(blob, `request_template_sample.csv`);
      toast.success('Sample template downloaded');
    } catch (error) {
      console.error('Error exporting sample data:', error);
      toast.error('Failed to generate sample data');
    }
  }, []);

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
            <span className={`px-2 py-1 rounded text-white ${getStatusColor(request.status)}`}>
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
  }, [filteredRequests, selectedRequests, isDarkMode, isUpdating, updateRequestStatus, getStatusColor]);

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

                {/* Date Range Inputs */}
                <div>
                  <label className="block text-sm font-medium mb-2">Date Range</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => handleDateRangeChange('start', e.target.value)}
                      className={`p-2 rounded border transition-colors duration-200 ${
                        isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                      }`}
                      aria-label="Start date"
                    />
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => handleDateRangeChange('end', e.target.value)}
                      className={`p-2 rounded border transition-colors duration-200 ${
                        isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
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

              {filteredRequests.length === 0 ? (
                <EmptyRequestsOptions
                  isDarkMode={isDarkMode}
                  onExportSample={exportSampleCSV}
                  onToggleFilter={() => setFilter('all')}
                />
              ) : (
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
              )}
            </div>
          </div>
        )}
      </div>
      {/* Modal for request details */}
      {showDetails && (
        <RequestDetailsModal
          request={showDetails}
          onClose={() => setShowDetails(null)}
          isDarkMode={isDarkMode}
        />
      )}
    </ErrorBoundary>
  );
}

export default Requests;
