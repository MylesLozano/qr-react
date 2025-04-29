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

  // State for dynamic counts
  const [inventoryCount, setInventoryCount] = useState(0);
  const [myRequestsCount, setMyRequestsCount] = useState(0);
  const [approvedRequestsCount, setApprovedRequestsCount] = useState(0);
  const [loadingCounts, setLoadingCounts] = useState(true);

  // Memoize the current user
  const currentUser = useMemo(() => auth.currentUser, []);

  // Handle QR scan result
  const handleScanResult = useCallback((result) => {
    try {
      setScanning(false);
      setScanResult(result);
      setPaused(true);
      toast.success("QR code scanned successfully!");
    } catch (error) {
      console.error("Error processing scan result:", error);
      setError(error.message);
      toast.error("Failed to process QR code");
    }
  }, []);

  // Handle QR scan error
  const handleScanError = useCallback((error) => {
    console.error("QR Scan Error:", error);
    setError(error.message);
    setScanning(false);
    toast.error("Failed to scan QR code");
  }, []);

  // Reset scanner
  const resetScanner = useCallback(() => {
    setPaused(false);
    setScanResult(null);
    setError(null);
    setScanning(true);
  }, []);

  // Fetch counts
  useEffect(() => {
    let unsubscribe = null;
    setLoadingCounts(true);

    const fetchCounts = async () => {
      if (!currentUser) {
        setLoadingCounts(false);
        return;
      }

      try {
        // Fetch inventory count
        const inventoryCol = collection(db, "inventory");
        const snapshot = await getCountFromServer(inventoryCol);
        setInventoryCount(snapshot.data().count);

        // Set up real-time request counts
        const myRequestsCol = collection(db, "requests");
        const myRequestsQuery = query(
          myRequestsCol,
          where("userId", "==", currentUser.uid)
        );

        unsubscribe = onSnapshot(
          myRequestsQuery,
          (snapshot) => {
            let total = 0;
            let approved = 0;
            snapshot.forEach((doc) => {
              total++;
              if (doc.data().status === "approved") {
                approved++;
              }
            });
            setMyRequestsCount(total);
            setApprovedRequestsCount(approved);
            setLoadingCounts(false);
          },
          (error) => {
            console.error("Error fetching request counts:", error);
            toast.error("Failed to fetch request counts");
            setLoadingCounts(false);
          }
        );
      } catch (error) {
        console.error("Error in fetchCounts:", error);
        toast.error("Failed to fetch dashboard data");
        setLoadingCounts(false);
      }
    };

    fetchCounts();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser]);

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
            User Dashboard
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
                <button
                  onClick={resetScanner}
                  className={`mt-4 px-4 py-2 rounded transition-colors duration-200 ${isDarkMode
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-blue-500 hover:bg-blue-600 text-white"
                    }`}
                  aria-label="Scan another QR code"
                >
                  Scan Another
                </button>
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
                  onError={handleScanError}
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