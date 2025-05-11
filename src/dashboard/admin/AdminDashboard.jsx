import React, { useState, useEffect, useCallback, useMemo } from 'react';
import QRCodeManager from '../../components/QRCodeManager';
import { toast } from 'react-toastify';
import BaseDashboard from "../BaseDashboard";
import usePageTitle from "../../hooks/usePageTitle";
import { collection, query, where, getCountFromServer, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorBoundary from '../../components/ErrorBoundary';
import Button from '../../components/Button';

/**
 * AdminDashboard component - Main dashboard for admin users
 * @component
 * @returns {JSX.Element} The rendered AdminDashboard component
 */
const AdminDashboard = () => {
  usePageTitle("QCheckCITE - Admin");
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const [userCount, setUserCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [error, setError] = useState(null);

  const [showSampleQrPreview, setShowSampleQrPreview] = useState(false);

  const navigationItems = useMemo(() => [
    { path: '/admin-dashboard/inventory', icon: 'fas fa-boxes', label: 'Manage Inventory' },
    { path: '/admin-dashboard/requests', icon: 'fas fa-inbox', label: 'Manage Requests' },
    { path: '/admin-dashboard/templates', icon: 'fas fa-file-alt', label: 'Report Templates' },
    { path: '/admin-dashboard/reporting', icon: 'fas fa-chart-bar', label: 'View Reports/Audits' },
    { path: '/admin-dashboard/generate-report', icon: 'fas fa-file-export', label: 'Generate New Report' },
    { path: '/admin-dashboard/user-management', icon: 'fas fa-users', label: 'User Management' }
  ], []);

  const handleNavigation = useCallback((path) => {
    navigate(path);
  }, [navigate]);

  useEffect(() => {
    let unsubscribeUsers = null;
    let unsubscribeRequests = null;
    setLoadingCounts(true);
    setError(null);

    const fetchCounts = async () => {
      try {
        const usersCol = collection(db, "users");
        const requestsCol = collection(db, "requests");

        const userSnapshot = await getCountFromServer(usersCol);
        setUserCount(userSnapshot.data().count);

        const pendingQuery = query(requestsCol, where("status", "==", "pending"));
        const pendingSnapshot = await getCountFromServer(pendingQuery);
        setPendingRequestsCount(pendingSnapshot.data().count);

        unsubscribeUsers = onSnapshot(usersCol, (snapshot) => {
          setUserCount(snapshot.size);
        }, (err) => {
          console.error("Error in users snapshot:", err);
          setError(err.message || "Failed to subscribe to users updates");
        });

        unsubscribeRequests = onSnapshot(pendingQuery, (snapshot) => {
          setPendingRequestsCount(snapshot.size);
        }, (err) => {
          console.error("Error in requests snapshot:", err);
          setError(err.message || "Failed to subscribe to requests updates");
        });
      } catch (fetchError) {
        console.error("Error fetching dashboard counts:", fetchError);
        toast.error("Failed to load dashboard statistics");
        setError(fetchError.message || "Failed to fetch dashboard data");
      } finally {
        setLoadingCounts(false);
      }
    };

    fetchCounts();

    return () => {
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeRequests) unsubscribeRequests();
    };
  }, []);

  const sampleItemForDisplay = useMemo(() => ({
    id: 'sample-display-only',
    name: 'Sample QR Code',
    serialNumber: 'N/A',
    unitNumber: 'N/A',
    category: 'Sample',
    lab: 'N/A',
    itemCondition: 'N/A',
  }), []);

  const sampleQrDataToEncode = useMemo(() => ({
    id: sampleItemForDisplay.id,
    name: sampleItemForDisplay.name,
    info: "This is a sample QR code from the Admin Dashboard.",
    timestamp: new Date().toISOString(),
  }), [sampleItemForDisplay]);

  return (
    <ErrorBoundary>
      <BaseDashboard role="admin">
        <div className={`p-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}`}>
          <h1 className="text-3xl font-bold mb-6" role="heading" aria-level="1">Admin Dashboard</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className={`p-6 rounded-lg shadow transition-colors duration-200 ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'}`}>
              <h2 className="text-xl font-semibold mb-2">Total Users</h2>
              <div className={`text-3xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                {loadingCounts ? <LoadingSpinner size="small" /> : userCount}
              </div>
            </div>
            <div className={`p-6 rounded-lg shadow transition-colors duration-200 ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'}`}>
              <h2 className="text-xl font-semibold mb-2">Pending Requests</h2>
              <div className={`text-3xl font-bold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                {loadingCounts ? <LoadingSpinner size="small" /> : pendingRequestsCount}
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-lg shadow ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className="text-xl font-semibold mb-4">Sample QR Code Display</h2>
            <div className="flex flex-col items-center">
              <QRCodeManager
                item={sampleItemForDisplay}
                qrData={sampleQrDataToEncode}
                showActions={false}
              />
              <Button
                onClick={() => setShowSampleQrPreview(true)}
                className="mt-4"
                size="sm"
              >
                Show Sample Preview Modal
              </Button>
            </div>
          </div>

          {showSampleQrPreview && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h3 className="text-xl font-semibold mb-4">Sample QR Code Preview</h3>
                <QRCodeManager
                  item={sampleItemForDisplay}
                  qrData={sampleQrDataToEncode}
                  showActions={true}
                />
                <Button
                  onClick={() => setShowSampleQrPreview(false)}
                  className={`mt-4 px-4 py-2 rounded ${isDarkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-500 hover:bg-gray-600'} text-white`}
                  aria-label="Close QR preview"
                  color="gray"
                >
                  Close
                </Button>
              </div>
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {navigationItems.map((navItem) => (
              <Button
                key={navItem.path}
                onClick={() => handleNavigation(navItem.path)}
                className={`p-4 rounded-lg text-left shadow transition-colors duration-200 ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'}`}
                aria-label={navItem.label}
              >
                {navItem.icon && <span className="mr-2" aria-hidden="true">{/* Consider rendering icon components or emojis */}</span>}
                {navItem.label}
              </Button>
            ))}
          </div>

          {error && (
            <div className="mt-4 p-4 rounded-lg bg-red-100 text-red-700" role="alert">
              <p>Error: {error}</p>
            </div>
          )}
        </div>
      </BaseDashboard>
    </ErrorBoundary>
  );
};

export default AdminDashboard;