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
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import usePageTitle from "../../hooks/usePageTitle";
import BaseDashboard from "../BaseDashboard";
import { toast } from "react-toastify";
import { useTheme } from "../../context/ThemeContext";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorBoundary from "../../components/ErrorBoundary";
import { format } from "date-fns";

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

  // Memoize the current user
  const currentUser = useMemo(() => auth.currentUser, []);

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

  // Fetch requests
  useEffect(() => {
    let unsubscribe = null;
    setLoading(true);

    const fetchRequests = () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const q = query(collection(db, "requests"), where("userId", "==", currentUser.uid));
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const userRequests = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
          }));
          setRequests(userRequests);
          setLoading(false);
        },
        (error) => {
          console.error("Error fetching requests:", error);
          toast.error("Failed to fetch requests");
          setLoading(false);
        }
      );
    };

    fetchRequests();
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser]);

  // Memoize status colors
  const statusColors = useMemo(() => ({
    approved: "bg-green-500",
    rejected: "bg-red-500",
    pending: "bg-yellow-500",
  }), []);

  return (
    <ErrorBoundary>
      <BaseDashboard role="user">
        <div className={`p-6 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
          <h1 className="text-3xl font-bold mb-6" role="heading" aria-level="1">
            My Requests
          </h1>

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

            <button
              type="submit"
              disabled={submitting}
              className={`px-4 py-2 rounded transition-colors duration-200 ${isDarkMode
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
                } ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
              aria-label="Submit request"
            >
              {submitting ? <LoadingSpinner size="small" /> : "Submit Request"}
            </button>
          </form>

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
                          <button
                            onClick={() => handleDelete(req.id)}
                            className={`px-3 py-1 rounded transition-colors duration-200 ${isDarkMode
                                ? "bg-red-600 hover:bg-red-700 text-white"
                                : "bg-red-500 hover:bg-red-600 text-white"
                              }`}
                            aria-label={`Cancel request for ${req.itemName}`}
                          >
                            Cancel
                          </button>
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
