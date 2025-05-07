import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import BaseDashboard from "../BaseDashboard";
import usePageTitle from "../../hooks/usePageTitle";
import { collection, query, where, onSnapshot, getCountFromServer } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { toast } from "react-toastify";
import { useTheme } from "../../context/ThemeContext";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorBoundary from "../../components/ErrorBoundary";
import Button from "../../components/Button";
import { Link } from "react-router-dom";

/**
 * UserDashboard component - Main dashboard for regular users
 * @component
 * @returns {JSX.Element} The rendered UserDashboard component
 */
function UserDashboard() {
  usePageTitle("QCheckCITE - User Dashboard");
  const { isDarkMode } = useTheme();
  const [scanResult, setScanResult] = useState(null);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [myRequestsCount, setMyRequestsCount] = useState(0);
  const [approvedRequestsCount, setApprovedRequestsCount] = useState(0);
  const [loadingCounts, setLoadingCounts] = useState(true);
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

  // Consolidated effect for fetching counts
  useEffect(() => {
    if (!currentUser) {
      setLoadingCounts(false);
      return;
    }

    let unsubscribeListener = null;

    const fetchData = async () => {
      try {
        // Fetch inventory count (which doesn't need cleanup)
        const inventoryCol = collection(db, "inventory");
        const snapshot = await getCountFromServer(inventoryCol);
        setInventoryCount(snapshot.data().count);

        // Set up the onSnapshot listener and store its unsubscribe function
        const myRequestsQuery = query(
          collection(db, "requests"),
          where("userId", "==", currentUser.uid)
        );

        unsubscribeListener = onSnapshot(
          myRequestsQuery,
          (snapshot) => {
            let total = 0;
            let approved = 0;
            snapshot.forEach((doc) => {
              total++;
              if (doc.data().status === "approved") approved++;
            });
            setMyRequestsCount(total);
            setApprovedRequestsCount(approved);
            setLoadingCounts(false);
          },
          (err) => {
            console.error("Error fetching request counts:", err);
            toast.error("Failed to fetch request counts");
            setLoadingCounts(false);
          }
        );
      } catch (err) {
        console.error("Error in fetchData:", err);
        toast.error("Failed to fetch dashboard data");
        setLoadingCounts(false);
      }
    };

    // Call fetchData (but don't use its return value for cleanup)
    fetchData();

    // Return a cleanup function that uses our properly stored unsubscribe
    return () => {
      if (typeof unsubscribeListener === 'function') {
        unsubscribeListener();
      }
    };
  }, [currentUser]);

  const summaryCards = useMemo(() => [
    {
      title: "Available Inventory",
      count: inventoryCount,
      icon: "📦",
      description: "Total items available for request",
      link: "/user-dashboard/inventory"
    },
    {
      title: "My Requests",
      count: myRequestsCount,
      icon: "📝",
      description: "Total requests submitted",
      link: "/user-dashboard/my-requests"
    },
    {
      title: "Approved Requests",
      count: approvedRequestsCount,
      icon: "✅",
      description: "Total approved requests",
      link: "/user-dashboard/my-requests"
    },
  ], [inventoryCount, myRequestsCount, approvedRequestsCount]);

  return (
    <ErrorBoundary>
      <BaseDashboard role="user">
        <div className={`p-6 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
          <h1 className="text-3xl font-bold mb-6" role="heading" aria-level="1">
            User Dashboard
          </h1>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {summaryCards.map((card, index) => (
              <Link
                to={card.link}
                key={index}
                className={`p-6 rounded-lg shadow-md transition-transform hover:scale-105 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}
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
              </Link>
            ))}
          </div>

          {/* Quick Access Section */}
          <div className={`p-6 rounded-lg shadow-md mb-6 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
            <h2 className="text-xl font-semibold mb-4" role="heading" aria-level="2">
              Quick Access
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                to="/user-dashboard/inventory"
                className={`p-4 rounded-lg flex items-center ${isDarkMode ? "bg-blue-900 hover:bg-blue-800" : "bg-blue-100 hover:bg-blue-200"}`}
              >
                <span className="text-2xl mr-3">📦</span>
                <div>
                  <h3 className="font-bold">Browse Inventory</h3>
                  <p className="text-sm">View and request available items</p>
                </div>
              </Link>
              <Link
                to="/user-dashboard/my-requests"
                className={`p-4 rounded-lg flex items-center ${isDarkMode ? "bg-green-900 hover:bg-green-800" : "bg-green-100 hover:bg-green-200"}`}
              >
                <span className="text-2xl mr-3">📄</span>
                <div>
                  <h3 className="font-bold">My Requests</h3>
                  <p className="text-sm">Track and manage your requests</p>
                </div>
              </Link>
            </div>
          </div>

          {/* QR Scanner Section */}
          <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
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
        </div>
      </BaseDashboard>
    </ErrorBoundary>
  );
}

export default UserDashboard;