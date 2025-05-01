import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  addDoc,
  serverTimestamp,
  getCountFromServer,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import usePageTitle from "../../hooks/usePageTitle";
import BaseDashboard from "../BaseDashboard";
import { toast } from "react-toastify";
import { useTheme } from "../../context/ThemeContext";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorBoundary from "../../components/ErrorBoundary";
import { format } from "date-fns";
import Button from "../../components/Button";
import { Scanner } from "@yudiel/react-qr-scanner";

/**
 * MyRequests component - Allows users to view and manage their item requests
 * @component
 * @returns {JSX.Element} The rendered MyRequests component
 */
function MyRequests() {
  usePageTitle("QCheckCITE - My Requests");
  const { isDarkMode } = useTheme();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    itemName: "",
    quantity: 1,
    reason: "",
    usageLocation: "",
  });
  const [errors, setErrors] = useState({});
  const [scanResult, setScanResult] = useState(null);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);

  // State for dynamic counts
  const [inventoryCount, setInventoryCount] = useState(0);
  const [myRequestsCount, setMyRequestsCount] = useState(0);
  const [approvedRequestsCount, setApprovedRequestsCount] = useState(0);
  const [loadingCounts, setLoadingCounts] = useState(true);

  // Memoize the current user
  const currentUser = useMemo(() => auth.currentUser, []);

  // Shared error handler for QR scanning
  const handleScanErrorShared = useCallback((err) => {
    console.error("QR Scan Error:", err);
    setError(err.message);
    setScanning(false);
    toast.error("Failed to scan QR code");
  }, []);

  const handleScanResult = useCallback((result) => {
    try {
      setScanning(false);
      setScanResult(result);
      setPaused(true);
      toast.success("QR code scanned successfully!");
    } catch (err) {
      handleScanErrorShared(err);  // Use shared handler
    }
  }, [handleScanErrorShared]);

  const resetScanner = useCallback(() => {
    setPaused(false);
    setScanResult(null);
    setError(null);
    setScanning(true);
  }, []);

  // Consolidated effect for fetching counts and requests
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      setLoadingCounts(false);
      return;
    }

    const fetchData = async () => {
      try {
        const inventoryCol = collection(db, "inventory");
        const snapshot = await getCountFromServer(inventoryCol);
        setInventoryCount(snapshot.data().count);

        const myRequestsQuery = query(
          collection(db, "requests"),
          where("userId", "==", currentUser.uid)
        );
        const unsubscribeRequests = onSnapshot(
          myRequestsQuery,
          (snapshot) => {
            let total = 0;
            let approved = 0;
            const userRequests = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate(),
            }));
            setRequests(userRequests);
            snapshot.forEach((doc) => {
              total++;
              if (doc.data().status === "approved") approved++;
            });
            setMyRequestsCount(total);
            setApprovedRequestsCount(approved);
            setLoading(false);
            setLoadingCounts(false);
          },
          (err) => {
            console.error("Error fetching data:", err);
            toast.error("Failed to fetch requests or counts");
            setLoading(false);
            setLoadingCounts(false);
          }
        );

        return unsubscribeRequests;
      } catch (err) {
        console.error("Error in fetchData:", err);
        toast.error("Failed to fetch dashboard data");
        setLoading(false);
        setLoadingCounts(false);
      }
    };

    const unsubscribe = fetchData();
    return () => unsubscribe && unsubscribe();
  }, [currentUser]);

  // Validate form data
  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!formData.itemName.trim()) {
      newErrors.itemName = "Item name is required";
    }
    if (formData.quantity < 1) {
      newErrors.quantity = "Quantity must be at least 1";
    }
    if (!formData.reason.trim()) {
      newErrors.reason = "Reason is required";
    }
    if (!formData.usageLocation.trim()) {
      newErrors.usageLocation = "Usage location is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle form input changes
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "quantity" ? parseInt(value) || 0 : value,
    }));
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  }, [errors]);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, "requests"), {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        ...formData,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      toast.success("Request submitted successfully!");
      setFormData({
        itemName: "",
        quantity: 1,
        reason: "",
        usageLocation: "",
      });
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [formData, currentUser, validateForm]);

  // Handle request deletion
  const handleDelete = useCallback(async (id) => {
    if (!window.confirm("Are you sure you want to cancel this request?")) return;

    try {
      await deleteDoc(doc(db, "requests", id));
      toast.success("Request cancelled successfully");
    } catch (error) {
      console.error("Error cancelling request:", error);
      toast.error("Failed to cancel request. Please try again.");
    }
  }, []);

  // Memoize status colors
  const statusColors = useMemo(() => ({
    approved: "bg-green-500",
    rejected: "bg-red-500",
    pending: "bg-yellow-500",
  }), []);

  // Memoize summary cards data
  const summaryCards = useMemo(() => [
    {
      title: "Available Inventory",
      count: inventoryCount,
      icon: "📦",
      description: "Total items available for request",
    },
    {
      title: "My Requests",
      count: myRequestsCount,
      icon: "📝",
      description: "Total requests submitted",
    },
    {
      title: "Approved Requests",
      count: approvedRequestsCount,
      icon: "✅",
      description: "Total approved requests",
    },
  ], [inventoryCount, myRequestsCount, approvedRequestsCount]);

  return (
    <ErrorBoundary>
      <BaseDashboard role="user">
        <div className={`p-6 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
          <h1 className="text-3xl font-bold mb-6" role="heading" aria-level="1">
            My Requests
          </h1>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {summaryCards.map((card, index) => (
              <div
                key={index}
                className={`p-6 rounded-lg shadow-md ${isDarkMode ? "bg-gray-800" : "bg-white"
                  }`}
                role="region"
                aria-label={card.title}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">{card.title}</h2>
                  <span className="text-2xl">{card.icon}</span>
                </div>
                {loadingCounts ? (
                  <LoadingSpinner size="small" />
                ) : (
                  <>
                    <p className="text-3xl font-bold mb-2">{card.count}</p>
                    <p className="text-sm text-gray-500">{card.description}</p>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Request Form */}
          <form onSubmit={handleSubmit} className="mb-8 space-y-4 max-w-xl">
            <div>
              <label htmlFor="itemName" className="block text-sm font-medium mb-1">
                Item Name
              </label>
              <input
                id="itemName"
                name="itemName"
                type="text"
                value={formData.itemName}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 rounded border ${errors.itemName ? "border-red-500" : "border-gray-300"
                  } ${isDarkMode ? "bg-gray-700" : "bg-white"}`}
                aria-invalid={!!errors.itemName}
                aria-describedby={errors.itemName ? "itemName-error" : undefined}
              />
              {errors.itemName && (
                <p id="itemName-error" className="text-red-500 text-sm mt-1">
                  {errors.itemName}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="quantity" className="block text-sm font-medium mb-1">
                Quantity
              </label>
              <input
                id="quantity"
                name="quantity"
                type="number"
                value={formData.quantity}
                onChange={handleInputChange}
                min="1"
                className={`w-full px-3 py-2 rounded border ${errors.quantity ? "border-red-500" : "border-gray-300"
                  } ${isDarkMode ? "bg-gray-700" : "bg-white"}`}
                aria-invalid={!!errors.quantity}
                aria-describedby={errors.quantity ? "quantity-error" : undefined}
              />
              {errors.quantity && (
                <p id="quantity-error" className="text-red-500 text-sm mt-1">
                  {errors.quantity}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="reason" className="block text-sm font-medium mb-1">
                Reason
              </label>
              <textarea
                id="reason"
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 rounded border ${errors.reason ? "border-red-500" : "border-gray-300"
                  } ${isDarkMode ? "bg-gray-700" : "bg-white"}`}
                aria-invalid={!!errors.reason}
                aria-describedby={errors.reason ? "reason-error" : undefined}
              />
              {errors.reason && (
                <p id="reason-error" className="text-red-500 text-sm mt-1">
                  {errors.reason}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="usageLocation" className="block text-sm font-medium mb-1">
                Usage Location
              </label>
              <input
                id="usageLocation"
                name="usageLocation"
                type="text"
                value={formData.usageLocation}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 rounded border ${errors.usageLocation ? "border-red-500" : "border-gray-300"
                  } ${isDarkMode ? "bg-gray-700" : "bg-white"}`}
                aria-invalid={!!errors.usageLocation}
                aria-describedby={errors.usageLocation ? "usageLocation-error" : undefined}
              />
              {errors.usageLocation && (
                <p id="usageLocation-error" className="text-red-500 text-sm mt-1">
                  {errors.usageLocation}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={submitting}
              color="blue"
              className={`px-4 py-2 rounded transition-colors duration-200 ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
              aria-label="Submit request"
            >
              {submitting ? <LoadingSpinner size="small" /> : "Submit Request"}
            </Button>
          </form>

          {/* QR Scanner Section */}
          <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? "bg-gray-800" : "bg-white"
            }`}>
            <h2 className="text-xl font-semibold mb-4" role="heading" aria-level="2">
              QR Code Scanner
            </h2>

            {error && (
              <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
                <p>{error}</p>
              </div>
            )}

            {scanResult ? (
              <div className="mb-4 p-4 bg-green-100 text-green-700 rounded">
                <p>Scanned Result: {scanResult}</p>
                <Button
                  onClick={resetScanner}
                  color="blue"
                  className="mt-4"
                  aria-label="Scan another QR code"
                >
                  Scan Another
                </Button>
              </div>
            ) : (
              <div className="relative">
                {scanning && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                    <LoadingSpinner size="large" />
                  </div>
                )}
                <Scanner
                  onResult={handleScanResult}
                  onError={handleScanErrorShared}
                  options={{
                    delayBetweenScanAttempts: 100,
                    delayBetweenScanSuccess: 500,
                  }}
                  className="rounded-lg"
                />
              </div>
            )}
          </div>

          {/* Requests Table */}
          {loading ? (
            <LoadingSpinner />
          ) : requests.length === 0 ? (
            <p className="text-gray-500">You have no requests yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table
                className={`min-w-full border ${isDarkMode ? "border-gray-700" : "border-gray-300"
                  }`}
                role="table"
                aria-label="List of requests"
              >
                <thead>
                  <tr className={isDarkMode ? "bg-gray-800" : "bg-gray-100"}>
                    <th className="p-2 border">Item</th>
                    <th className="p-2 border">Quantity</th>
                    <th className="p-2 border">Reason</th>
                    <th className="p-2 border">Usage Location</th>
                    <th className="p-2 border">Status</th>
                    <th className="p-2 border">Date</th>
                    <th className="p-2 border">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr
                      key={req.id}
                      className={`text-center ${isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-50"
                        }`}
                    >
                      <td className="p-2 border">{req.itemName}</td>
                      <td className="p-2 border">{req.quantity}</td>
                      <td className="p-2 border">{req.reason || "N/A"}</td>
                      <td className="p-2 border">{req.usageLocation || "N/A"}</td>
                      <td className="p-2 border">
                        <span
                          className={`px-2 py-1 rounded text-white ${statusColors[req.status] || "bg-gray-500"
                            }`}
                        >
                          {req.status || "Pending"}
                        </span>
                      </td>
                      <td className="p-2 border">
                        {req.createdAt
                          ? format(req.createdAt, "MMM d, yyyy HH:mm")
                          : "N/A"}
                      </td>
                      <td className="p-2 border">
                        {req.status === "pending" ? (
                          <Button
                            onClick={() => handleDelete(req.id)}
                            color="red"
                            className={`px-3 py-1 rounded transition-colors duration-200`}
                            aria-label={`Cancel request for ${req.itemName}`}
                          >
                            Cancel
                          </Button>
                        ) : (
                          <span className="text-gray-400">No actions</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </BaseDashboard>
    </ErrorBoundary>
  );
}

export default MyRequests;
