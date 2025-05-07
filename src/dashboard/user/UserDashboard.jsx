import React, { useState, useEffect, useMemo } from "react";
import usePageTitle from "../../hooks/usePageTitle";
import { collection, query, where, onSnapshot, getCountFromServer } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { toast } from "react-toastify";
import { useTheme } from "../../context/ThemeContext";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorBoundary from "../../components/ErrorBoundary";
import { useNavigate, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Button from "../../components/Button";
import QRScanner from "../../components/QRScanner";
import Inventory from "../Inventory";
import MyRequests from "./MyRequests";

/**
 * UserDashboard component - Main dashboard for regular users
 * @component
 * @returns {JSX.Element} The rendered UserDashboard component
 */
function UserDashboard() {
  usePageTitle("QCheckCITE - User Dashboard");
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [inventoryCount, setInventoryCount] = useState(0);
  const [myRequestsCount, setMyRequestsCount] = useState(0);
  const [approvedRequestsCount, setApprovedRequestsCount] = useState(0);
  const [loadingCounts, setLoadingCounts] = useState(true);
  const currentUser = useMemo(() => auth.currentUser, []);

  // Get active component from URL
  const getActiveComponentFromUrl = () => {
    const path = location.pathname.split('/').pop();
    if (path === 'inventory') return 'inventory';
    if (path === 'my-requests') return 'requests';
    if (path === 'scan') return 'scan';
    return null;
  };

  // Active component state
  const [activeComponent, setActiveComponent] = useState(getActiveComponentFromUrl);

  // Update active component when URL changes
  useEffect(() => {
    setActiveComponent(getActiveComponentFromUrl());
  }, [location.pathname]);

  // Update URL when active component changes
  useEffect(() => {
    if (activeComponent && activeComponent !== getActiveComponentFromUrl()) {
      const path = activeComponent === 'requests' ? 'my-requests' : activeComponent;
      navigate(`/user-dashboard/${path}`);
    }
  }, [activeComponent, navigate]);

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

    // Call fetchData
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
      component: "inventory"
    },
    {
      title: "My Requests",
      count: myRequestsCount,
      icon: "📝",
      description: "Total requests submitted",
      component: "requests"
    },
    {
      title: "Approved Requests",
      count: approvedRequestsCount,
      icon: "✅",
      description: "Total approved requests",
      component: "requests"
    },
  ], [inventoryCount, myRequestsCount, approvedRequestsCount]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast.success("Logged out successfully");
      navigate('/login');
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to log out");
    }
  };

  // Render dashboard home
  const renderDashboard = () => (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {summaryCards.map((card, index) => (
          <div
            onClick={() => setActiveComponent(card.component)}
            key={index}
            className={`p-6 rounded-lg shadow-md transition-transform hover:scale-105 cursor-pointer ${isDarkMode ? "bg-gray-800" : "bg-white"}`}
            role="button"
            aria-label={`Go to ${card.title}`}
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

      {/* Quick Access Section */}
      <div className={`p-6 rounded-lg shadow-md mb-6 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
        <h2 className="text-xl font-semibold mb-4" role="heading" aria-level="2">
          Quick Access
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={() => setActiveComponent("inventory")}
            className={`p-4 rounded-lg flex items-center cursor-pointer ${isDarkMode ? "bg-blue-900 hover:bg-blue-800" : "bg-blue-100 hover:bg-blue-200"}`}
            role="button"
            aria-label="Go to Browse Inventory"
          >
            <span className="text-2xl mr-3">📦</span>
            <div>
              <h3 className="font-bold">Browse Inventory</h3>
              <p className="text-sm">View and request available items</p>
            </div>
          </div>
          <div
            onClick={() => setActiveComponent("requests")}
            className={`p-4 rounded-lg flex items-center cursor-pointer ${isDarkMode ? "bg-green-900 hover:bg-green-800" : "bg-green-100 hover:bg-green-200"}`}
            role="button"
            aria-label="Go to My Requests"
          >
            <span className="text-2xl mr-3">📄</span>
            <div>
              <h3 className="font-bold">My Requests</h3>
              <p className="text-sm">Track and manage your requests</p>
            </div>
          </div>
          <div
            onClick={() => setActiveComponent("scan")}
            className={`p-4 rounded-lg flex items-center cursor-pointer ${isDarkMode ? "bg-purple-900 hover:bg-purple-800" : "bg-purple-100 hover:bg-purple-200"}`}
            role="button"
            aria-label="Go to Scan QR Code"
          >
            <span className="text-2xl mr-3">📱</span>
            <div>
              <h3 className="font-bold">Scan QR Code</h3>
              <p className="text-sm">Quickly scan item QR codes</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <ErrorBoundary>
      <div className={`p-6 ${isDarkMode ? "bg-gray-900 text-white" : "bg-white text-gray-800"}`}>
        {/* User Dashboard Header */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <h1 className="text-2xl font-bold" role="heading" aria-level="1">
            User Dashboard
          </h1>
          {activeComponent && (
            <Button
              color="gray"
              onClick={() => {
                setActiveComponent(null);
                navigate('/user-dashboard');
              }}
              className="mt-2 sm:mt-0"
            >
              Back to Dashboard
            </Button>
          )}
        </div>

        {/* Main Content */}
        <div className={`${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
          <Routes>
            <Route path="/" element={renderDashboard()} />
            <Route path="inventory" element={<Inventory isInDashboard={true} />} />
            <Route path="my-requests" element={<MyRequests isInDashboard={true} />} />
            <Route path="scan" element={<QRScanner isInDashboard={true} />} />
            <Route path="*" element={<Navigate to="/user-dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default UserDashboard;