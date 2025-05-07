import React, { useState, useEffect, useCallback, useMemo } from 'react';
import QRCodeManager from '../../components/QRCodeManager';
import { toast } from 'react-toastify';
import BaseDashboard from "../BaseDashboard";
import usePageTitle from "../../hooks/usePageTitle";
import { collection, query, where, getCountFromServer, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import { Link } from 'react-router-dom';
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

  const [isGenerating, setIsGenerating] = useState(false);
  const [qrPreview, setQrPreview] = useState(null);
  const [userCount, setUserCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [error, setError] = useState(null);

  // Memoize navigation items
  const navigationItems = useMemo(() => [
    { path: 'reporting', icon: 'fas fa-chart-bar', label: 'Reports' },
    { path: 'templates', icon: 'fas fa-file-alt', label: 'Report Templates' },
    { path: 'generate-report', icon: 'fas fa-file-export', label: 'Generate Report' }
  ], []);

  // Handle QR code generation
  const handleGenerateQR = useCallback(async (item) => {
    setIsGenerating(true);
    setError(null); // Clear previous errors when starting a new operation
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setQrPreview({
        item,
        data: {
          id: item.id,
          name: item.name,
          unitNumber: item.unitNumber,
          lab: item.lab,
          condition: item.itemCondition,
          lastUpdated: new Date().toISOString()
        }
      });
      toast.success('QR code generated successfully!');
    } catch (error) {
      console.error('Error generating QR:', error);
      toast.error('Failed to generate QR code');
      setError(error.message || 'Unknown error occurred');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Handle QR code preview
  const handlePreviewQR = useCallback((item) => {
    setQrPreview({
      item,
      data: {
        id: item.id,
        name: item.name,
        unitNumber: item.unitNumber,
        lab: item.lab,
        condition: item.itemCondition,
        lastUpdated: new Date().toISOString()
      }
    });
  }, []);

  // Fetch and subscribe to counts - fixed to prevent memory leaks
  useEffect(() => {
    let unsubscribeUsers = null;
    let unsubscribeRequests = null;
    setLoadingCounts(true);
    setError(null); // Clear previous errors

    const fetchCounts = async () => {
      try {
        const usersCol = collection(db, "users");
        const requestsCol = collection(db, "requests");

        // Fetch total users
        const userSnapshot = await getCountFromServer(usersCol);
        setUserCount(userSnapshot.data().count);

        // Fetch pending requests
        const pendingQuery = query(requestsCol, where("status", "==", "pending"));
        const pendingSnapshot = await getCountFromServer(pendingQuery);
        setPendingRequestsCount(pendingSnapshot.data().count);

        // Set up real-time listeners
        unsubscribeUsers = onSnapshot(usersCol, (snapshot) => {
          setUserCount(snapshot.size);
        }, (error) => {
          console.error("Error in users snapshot:", error);
          setError(error.message || "Failed to subscribe to users updates");
        });

        unsubscribeRequests = onSnapshot(pendingQuery, (snapshot) => {
          setPendingRequestsCount(snapshot.size);
        }, (error) => {
          console.error("Error in requests snapshot:", error);
          setError(error.message || "Failed to subscribe to requests updates");
        });
      } catch (error) {
        console.error("Error fetching dashboard counts:", error);
        toast.error("Failed to load dashboard statistics");
        setError(error.message || "Failed to fetch dashboard data");
      } finally {
        setLoadingCounts(false);
      }
    };

    fetchCounts();

    // Proper cleanup function
    return () => {
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeRequests) unsubscribeRequests();
    };
  }, []);

  // Memoize the QR sample item to prevent unnecessary re-renders
  const sampleItem = useMemo(() => ({
    id: 'sample',
    name: 'Sample Item',
    unitNumber: '123',
    lab: 'Main Lab',
    itemCondition: 'Good',
    uniqueQR: true
  }), []);

  return (
    <ErrorBoundary>
      <BaseDashboard role="admin">
        <div className={`p-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}`}>
          <h1 className="text-3xl font-bold mb-6" role="heading" aria-level="1">Admin Dashboard</h1>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className={`p-6 rounded-lg shadow transition-colors duration-200 ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
              }`}>
              <h2 className="text-xl font-semibold mb-2">Total Users</h2>
              <div className={`text-3xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'
                }`}>
                {loadingCounts ? <LoadingSpinner size="small" /> : userCount}
              </div>
            </div>
            <div className={`p-6 rounded-lg shadow transition-colors duration-200 ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
              }`}>
              <h2 className="text-xl font-semibold mb-2">Pending Requests</h2>
              <div className={`text-3xl font-bold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
                }`}>
                {loadingCounts ? <LoadingSpinner size="small" /> : pendingRequestsCount}
              </div>
            </div>
          </div>

          {/* QR Code Generator Section */}
          <div className={`p-6 rounded-lg shadow transition-colors duration-200 ${isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
            <h2 className="text-xl font-semibold mb-4">QR Code Generator</h2>

            <QRCodeManager
              item={sampleItem}
              onGenerate={handleGenerateQR}
              onPreview={handlePreviewQR}
              isGenerating={isGenerating}
            />

            {/* QR Preview Modal */}
            {qrPreview && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                <div className={`p-6 rounded-lg shadow-lg transition-colors duration-200 ${isDarkMode ? 'bg-gray-800' : 'bg-white'
                  }`}>
                  <h3 className="text-xl font-semibold mb-4">QR Code Preview</h3>
                  <QRCodeManager
                    item={qrPreview.item}
                    onPreview={handlePreviewQR}
                    isGenerating={isGenerating}
                    showActions={false}
                  />
                  <Button
                    onClick={() => setQrPreview(null)}
                    className={`mt-4 px-4 py-2 rounded transition-colors duration-200 ${isDarkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-500 hover:bg-gray-600'
                      } text-white`}
                    aria-label="Close QR preview"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {navigationItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`p-4 rounded-lg shadow transition-colors duration-200 ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
                  }`}
                aria-label={item.label}
              >
                <i className={`${item.icon} mr-2`} aria-hidden="true"></i>
                {item.label}
              </Link>
            ))}
          </div>

          {/* Error Display */}
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