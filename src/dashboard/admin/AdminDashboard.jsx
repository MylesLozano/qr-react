import { useState, useEffect, useMemo } from 'react';
import QRCodeManager from '../../components/QRCodeManager';
import { toast } from 'react-toastify';
import BaseDashboard from '../BaseDashboard';
import usePageTitle from '../../hooks/usePageTitle';
import { collection, query, where, getCountFromServer, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorBoundary from '../../components/ErrorBoundary';
import Button from '../../components/Button';
import Inventory from '../Inventory';
import InventoryCategories from './InventoryCategories';
import Requests from './Requests';
import ReportTemplates from './ReportTemplates';
import ReportGenerator from './ReportGenerator';
import UnifiedReporting from '../UnifiedReporting';
import UserManagement from '../../components/users/UserManagement';
import ProtectedRoute from '../../ProtectedRoute';
import { useAuth } from '../../hooks/useAuth';
import QRScanner from '../../components/QRScanner'; // Import QRScanner

/**
 * AdminDashboard component - Main dashboard for admin users
 * @component
 * @returns {JSX.Element} The rendered AdminDashboard component
 */
const AdminDashboard = () => {
  usePageTitle('QCheckCITE - Admin');
  const { isDarkMode } = useTheme();
  const { role } = useAuth();
  const location = useLocation();

  const [userCount, setUserCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [showSampleQrPreview, setShowSampleQrPreview] = useState(false);

  // Check if we're on the dashboard home page
  const isHomePage = useMemo(() => {
    return location.pathname === '/admin-dashboard';
  }, [location.pathname]);
  // Add a small delay to ensure components are properly loaded
  useEffect(() => {
    console.info('AdminDashboard mounted, role:', role);
    
    const timer = setTimeout(() => {
      setIsReady(true);
      console.info('AdminDashboard ready to render');
    }, 800);
    
    return () => clearTimeout(timer);
  }, [role]);

  // Only fetch dashboard stats if we're on the homepage
  useEffect(() => {
    if (!isHomePage || !isReady) return;
    
    let unsubscribeUsers = null;
    let unsubscribeRequests = null;
    setLoadingCounts(true);
    setError(null);

    const fetchCounts = async () => {
      try {
        const usersCol = collection(db, 'users');
        const requestsCol = collection(db, 'requests');

        const userSnapshot = await getCountFromServer(usersCol);
        setUserCount(userSnapshot.data().count);

        const pendingQuery = query(requestsCol, where('status', '==', 'pending'));
        const pendingSnapshot = await getCountFromServer(pendingQuery);
        setPendingRequestsCount(pendingSnapshot.data().count);

        unsubscribeUsers = onSnapshot(
          usersCol,
          (snapshot) => {
            setUserCount(snapshot.size);
          },
          (err) => {
            console.error('Error in users snapshot:', err);
            setError(err.message || 'Failed to subscribe to users updates');
          }
        );

        unsubscribeRequests = onSnapshot(
          pendingQuery,
          (snapshot) => {
            setPendingRequestsCount(snapshot.size);
          },
          (err) => {
            console.error('Error in requests snapshot:', err);
            setError(err.message || 'Failed to subscribe to requests updates');
          }
        );
      } catch (fetchError) {
        console.error('Error fetching dashboard counts:', fetchError);
        toast.error('Failed to load dashboard statistics');
        setError(fetchError.message || 'Failed to fetch dashboard data');
      } finally {
        setLoadingCounts(false);
      }
    };

    fetchCounts();

    return () => {
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeRequests) unsubscribeRequests();
    };
  }, [isHomePage, isReady]);

  const sampleItemForDisplay = useMemo(
    () => ({
      id: 'sample-display-only',
      name: 'Sample QR Code',
      serialNumber: 'N/A',
      unitNumber: 'N/A',
      category: 'Sample',
      lab: 'N/A',
      itemCondition: 'N/A',
    }),
    []
  );
  const sampleQrDataToEncode = useMemo(
    () => ({
      id: sampleItemForDisplay.id,
      name: sampleItemForDisplay.name,
      info: 'This is a sample QR code from the Admin Dashboard.',
      timestamp: new Date().toISOString(),
    }),
    [sampleItemForDisplay]
  );

  const renderAdminDashboardHome = () => (
    <div className={`${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
      <h1 className="text-3xl font-bold mb-6" role="heading" aria-level="1">
        Admin Dashboard
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div
          className={`p-6 rounded-lg shadow transition-colors duration-200 ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'}`}
        >
          <h2 className="text-xl font-semibold mb-2">Total Users</h2>
          <div
            className={`text-3xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}
          >
            {loadingCounts ? <LoadingSpinner size="small" /> : userCount}
          </div>
        </div>
        <div
          className={`p-6 rounded-lg shadow transition-colors duration-200 ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'}`}
        >
          <h2 className="text-xl font-semibold mb-2">Pending Requests</h2>
          <div
            className={`text-3xl font-bold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}
          >
            {loadingCounts ? <LoadingSpinner size="small" /> : pendingRequestsCount}
          </div>
        </div>
      </div>

      <div className={`p-6 rounded-lg shadow ${isDarkMode ? 'bg-gray-800' : 'bg-white'} mb-8`}>
        <h2 className="text-xl font-semibold mb-4">Sample QR Code Display</h2>
        <div className="flex flex-col items-center">
          <QRCodeManager
            item={sampleItemForDisplay}
            qrData={sampleQrDataToEncode}
            showActions={false}
          />
          <Button onClick={() => setShowSampleQrPreview(true)} className="mt-4" size="sm">
            Show Sample Preview Modal
          </Button>
        </div>
      </div>

      {showSampleQrPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div
            className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
          >
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

      {error && (
        <div className="mt-4 p-4 rounded-lg bg-red-100 text-red-700" role="alert">
          <p>Error: {error}</p>
        </div>
      )}
    </div>
  );

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner text="Loading Admin Dashboard..." />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <BaseDashboard role="admin">
        <div className="w-full h-full flex flex-col">
          <Routes>
            <Route path="/" element={renderAdminDashboardHome()} />
            <Route
              path="inventory"
              element={
                <ProtectedRoute requiredAction="manage_inventory">
                  <Inventory />
                </ProtectedRoute>
              }
            />
            <Route
              path="categories"
              element={
                <ProtectedRoute requiredAction="manage_categories">
                  <InventoryCategories />
                </ProtectedRoute>
              }
            />
            <Route
              path="requests"
              element={
                <ProtectedRoute requiredAction="manage_requests">
                  <Requests />
                </ProtectedRoute>
              }
            />
            <Route
              path="templates"
              element={
                <ProtectedRoute requiredAction="manage_templates">
                  <ReportTemplates />
                </ProtectedRoute>
              }
            />
            <Route
              path="reporting"
              element={
                <ProtectedRoute requiredAction="generate_reports">
                  <UnifiedReporting />
                </ProtectedRoute>
              }
            />
            <Route
              path="generate-report"
              element={
                <ProtectedRoute requiredAction="generate_reports">
                  <ReportGenerator />
                </ProtectedRoute>
              }
            />
            <Route
              path="user-management"
              element={
                <ProtectedRoute requiredAction="manage_users">
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="scan"
              element={
                <ProtectedRoute requiredAction="view_inventory">
                  <QRScanner isInDashboard={true} role={role} />
                </ProtectedRoute>
              }
            />
            {/* Fallback route for any unmatched paths within admin-dashboard */}
            <Route path="*" element={<Navigate to="/admin-dashboard" replace />} />
          </Routes>
        </div>
      </BaseDashboard>
    </ErrorBoundary>
  );
};

export default AdminDashboard;
