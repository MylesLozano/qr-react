import React, { useState, useEffect, useMemo } from "react";
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
import BaseDashboard from "../BaseDashboard";
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
  const [error, setError] = useState(null);

  // Permission checks
  const canManageRequests = useMemo(() => canPerformAction(role, 'manage_requests'), [role]);
  const canExportRequests = useMemo(() => canPerformAction(role, 'export_requests'), [role]);

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

  // Fetch requests
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const requestsRef = collection(db, "requests");
    const requestsQuery = query(requestsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(requestsQuery,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));
        setRequests(data);
        setError(null);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching requests:", error);
        setError("Failed to load requests");
        toast.error("Failed to load requests");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Update request status
  const updateRequestStatus = async (id, status) => {
    if (!canManageRequests) {
      toast.error("You don't have permission to manage requests");
      return;
    }

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
      toast.error("Failed to update status.");
    }
  };

  // Bulk update status
  const bulkUpdateStatus = async (status) => {
    if (!canManageRequests) {
      toast.error("You don't have permission to manage requests");
      return;
    }

    if (selectedRequests.size === 0) {
      toast.warning("No requests selected");
      return;
    }

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
      toast.error("Failed to update requests");
    }
  };

  // Export to CSV
  const exportToCSV = async () => {
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
      toast.error("Failed to export requests");
    } finally {
      setIsExporting(false);
    }
  };

  // Row component for virtual list
  const Row = ({ index, style }) => {
    const request = filteredRequests[index];
    const isSelected = selectedRequests.has(request.id);

    return (
      <div
        style={style}
        className={`border-b p-4 ${isSelected ? (isDarkMode ? 'bg-gray-700' : 'bg-blue-50') : ''}`}
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
            />
            <div>
              <div className="font-medium">{request.itemName}</div>
              <div className="text-sm text-gray-600">Requested by: {request.userEmail}</div>
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
            <button
              onClick={() => setShowDetails(request)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              View Details
            </button>
          </div>
          <div>
            <span className={`px-2 py-1 rounded text-white ${request.status === 'pending' ? 'bg-yellow-500' :
              request.status === 'approved' ? 'bg-green-500' :
                'bg-red-500'
              }`}>
              {request.status}
            </span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => updateRequestStatus(request.id, 'approved')}
              className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
              disabled={request.status === 'approved'}
            >
              Approve
            </button>
            <button
              onClick={() => updateRequestStatus(request.id, 'rejected')}
              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
              disabled={request.status === 'rejected'}
            >
              Reject
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <ErrorBoundary>
      <div className={`p-4 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        {loading && <LoadingSpinner />}
        {error && (
          <div className="text-red-500 text-center mb-4">
            {error}
          </div>
        )}
        <BaseDashboard role="admin">
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Manage Requests</h1>

            {/* Filters and Actions */}
            <div className={`p-4 rounded-lg shadow mb-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  >
                    <option value="all">All Requests</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Search</label>
                  <input
                    type="text"
                    placeholder="Search requests..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
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
                <div className="flex items-end space-x-2">
                  <button
                    onClick={() => bulkUpdateStatus('approved')}
                    disabled={selectedRequests.size === 0}
                    className={`px-4 py-2 rounded text-white ${selectedRequests.size === 0 ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'}`}
                  >
                    Bulk Approve
                  </button>
                  <button
                    onClick={() => bulkUpdateStatus('rejected')}
                    disabled={selectedRequests.size === 0}
                    className={`px-4 py-2 rounded text-white ${selectedRequests.size === 0 ? 'bg-gray-400' : 'bg-red-500 hover:bg-red-600'}`}
                  >
                    Bulk Reject
                  </button>
                  <button
                    onClick={exportToCSV}
                    disabled={isExporting || filteredRequests.length === 0}
                    className={`px-4 py-2 rounded text-white ${isExporting || filteredRequests.length === 0 ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'}`}
                  >
                    {isExporting ? 'Exporting...' : 'Export CSV'}
                  </button>
                </div>
              </div>
            </div>

            {/* Virtualized List */}
            <div className={`rounded-lg shadow ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`} style={{ height: '600px' }}>
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="text-lg">Loading requests...</div>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="flex justify-center items-center h-full">
                  <div className="text-lg text-gray-500">No requests found</div>
                </div>
              ) : (
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
              )}
            </div>

            {/* Request Details Modal */}
            {showDetails && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                <div className={`p-6 rounded-lg w-full max-w-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <h2 className="text-xl font-semibold mb-4">Request Details</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium">Item Name</p>
                      <p>{showDetails.itemName}</p>
                    </div>
                    <div>
                      <p className="font-medium">Quantity</p>
                      <p>{showDetails.quantity}</p>
                    </div>
                    <div>
                      <p className="font-medium">Lab</p>
                      <p>{showDetails.lab}</p>
                    </div>
                    <div>
                      <p className="font-medium">Status</p>
                      <p>{showDetails.status}</p>
                    </div>
                    <div>
                      <p className="font-medium">Requested By</p>
                      <p>{showDetails.userEmail}</p>
                    </div>
                    <div>
                      <p className="font-medium">Request Date</p>
                      <p>{new Date(showDetails.createdAt?.toDate()).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="font-medium">Last Updated</p>
                      <p>{new Date(showDetails.updatedAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="font-medium">Updated By</p>
                      <p>{showDetails.updatedBy}</p>
                    </div>
                  </div>
                  <div className="flex justify-end mt-6">
                    <button
                      onClick={() => setShowDetails(null)}
                      className={`px-4 py-2 rounded text-white ${isDarkMode ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-500 hover:bg-gray-600'}`}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </BaseDashboard>
      </div>
    </ErrorBoundary>
  );
}

export default Requests;
