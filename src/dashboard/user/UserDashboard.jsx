import { useState, useEffect, useMemo, useCallback } from 'react';
import usePageTitle from '../../hooks/usePageTitle';
import { collection, query, where, onSnapshot, getCountFromServer } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { toast } from 'react-toastify';
import { useTheme } from '../../hooks/useTheme';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorBoundary from '../../components/ErrorBoundary';
import { useNavigate, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Button from '../../components/Button';
import QRScanner from '../../components/QRScanner';
import Inventory from '../Inventory';
import MyRequests from './MyRequests';
import BaseDashboard from '../BaseDashboard';
import { useAuth } from '../../hooks/useAuth';

/**
 * UserDashboard component - Main dashboard for regular users
 * @component
 * @returns {JSX.Element} The rendered UserDashboard component
 */
function UserDashboard() {
  usePageTitle('QCheckCITE - User Dashboard');
  const { isDarkMode } = useTheme();
  const { role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [inventoryCount, setInventoryCount] = useState(0);
  const [myRequestsCount, setMyRequestsCount] = useState(0);
  const [approvedRequestsCount, setApprovedRequestsCount] = useState(0);
  const [loadingCounts, setLoadingCounts] = useState(true);
  const currentUser = useMemo(() => auth.currentUser, []);
  // Navigation is now handled by BaseDashboard component
  const getActiveComponentFromUrl = useCallback(() => {
    const pathSegments = location.pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];

    // Map URL paths to component keys
    if (lastSegment === 'inventory') return 'inventory';
    if (lastSegment === 'my-requests') return 'requests';
    if (lastSegment === 'scan') return 'scan';

    // Default to null (showing dashboard) if on the dashboard root path
    if (lastSegment === 'user-dashboard') return null;

    // Fall back to dashboard if no match
    return null;
  }, [location.pathname]);
  // Active component state
  const [activeComponent, setActiveComponent] = useState(getActiveComponentFromUrl);

  useEffect(() => {
    const active = getActiveComponentFromUrl();
    setActiveComponent(active);
  }, [getActiveComponentFromUrl]);

  useEffect(() => {
    const handleHistoryChange = () => {
      const active = getActiveComponentFromUrl();
      setActiveComponent(active);
    };
    window.addEventListener('popstate', handleHistoryChange);
    return () => window.removeEventListener('popstate', handleHistoryChange);
  }, [getActiveComponentFromUrl]); // We've replaced this with handleComponentSwitch for more reliable navigation
  // This effect is now redundant and can cause navigation loops

  // Listen to URL changes from sidebar navigation with improved state handling
  useEffect(() => {
    const path = location.pathname;

    // Clear any stale state when navigating directly through URLs
    if (path.endsWith('/user-dashboard')) {
      setActiveComponent(null);
      return;
    }

    if (path.includes('/user-dashboard/inventory')) {
      setActiveComponent('inventory');
    } else if (path.includes('/user-dashboard/my-requests')) {
      setActiveComponent('requests');
    } else if (path.includes('/user-dashboard/scan')) {
      setActiveComponent('scan');
    }
  }, [location.pathname]);

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
        const inventoryCol = collection(db, 'inventory');
        const snapshot = await getCountFromServer(inventoryCol);
        setInventoryCount(snapshot.data().count);

        // Set up the onSnapshot listener and store its unsubscribe function
        const myRequestsQuery = query(
          collection(db, 'requests'),
          where('userId', '==', currentUser.uid)
        );

        unsubscribeListener = onSnapshot(
          myRequestsQuery,
          (snapshot) => {
            let total = 0;
            let approved = 0;
            snapshot.forEach((doc) => {
              total++;
              if (doc.data().status === 'approved') approved++;
            });
            setMyRequestsCount(total);
            setApprovedRequestsCount(approved);
            setLoadingCounts(false);
          },
          (err) => {
            console.error('Error fetching request counts:', err);
            toast.error('Failed to fetch request counts');
            setLoadingCounts(false);
          }
        );
      } catch (err) {
        console.error('Error in fetchData:', err);
        toast.error('Failed to fetch dashboard data');
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

  const summaryCards = useMemo(
    () => [
      {
        title: 'Available Inventory',
        count: inventoryCount,
        icon: '📦',
        description: 'Total items available for request',
        component: 'inventory',
      },
      {
        title: 'My Requests',
        count: myRequestsCount,
        icon: '📝',
        description: 'Total requests submitted',
        component: 'requests',
      },
      {
        title: 'Approved Requests',
        count: approvedRequestsCount,
        icon: '✅',
        description: 'Total approved requests',
        component: 'requests',
      },
    ],
    [inventoryCount, myRequestsCount, approvedRequestsCount]
  );

  // Handle component switching with better error handling
  const handleComponentSwitch = useCallback(
    (component) => {
      try {
        setActiveComponent(component);
        if (component) {
          const path = component === 'requests' ? 'my-requests' : component;
          navigate(`/user-dashboard/${path}`, { replace: true });
        } else {
          navigate('/user-dashboard', { replace: true });
        }
      } catch (err) {
        console.error('Navigation error:', err);
        // Fallback to direct navigation
        navigate('/user-dashboard');
      }
    },
    [navigate]
  );

  // Render dashboard home
  const renderDashboard = () => (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {summaryCards.map((card, index) => (
          <div
            onClick={() => handleComponentSwitch(card.component)}
            key={index}
            className={`p-6 rounded-lg shadow-md transition-transform hover:scale-105 cursor-pointer ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
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
      </div>{' '}
      {/* Additional info section - replacing the Quick Access section which is now in the sidebar */}
      <div className={`p-6 rounded-lg shadow-md mb-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <h2 className="text-xl font-semibold mb-4" role="heading" aria-level="2">
          Dashboard Info
        </h2>
        <div className="p-4 rounded-lg bg-blue-900 bg-opacity-30 border border-blue-800">
          <p>
            You can use the sidebar menu to navigate between different sections of the application:
          </p>
          <ul className="mt-2 list-disc list-inside space-y-1 opacity-90">
            <li>Browse inventory items and make requests</li>
            <li>View and track your submitted requests</li>
            <li>Scan QR codes to quickly access item information</li>
          </ul>
        </div>
      </div>
    </>
  );
  return (
    <BaseDashboard>
      <ErrorBoundary>
        {' '}
        {/* Dashboard header - always shown with dynamic title */}
        <div
          className={`mb-6 ${activeComponent ? 'flex flex-col sm:flex-row justify-between items-start sm:items-center' : ''}`}
        >
          <div>
            <h1 className="text-2xl font-bold" role="heading" aria-level="1">
              {activeComponent === 'inventory'
                ? 'Browse Inventory'
                : activeComponent === 'requests'
                  ? 'My Requests'
                  : activeComponent === 'scan'
                    ? 'Scan QR Code'
                    : 'User Dashboard'}
            </h1>
            {!activeComponent && (
              <p className="text-sm opacity-75">Welcome back! View your dashboard summary below.</p>
            )}
          </div>
          {activeComponent && (
            <Button
              color="gray"
              onClick={() => handleComponentSwitch(null)}
              className="mt-2 sm:mt-0"
            >
              Back to Dashboard
            </Button>
          )}
        </div>{' '}
        {/* Main Content */}
        <Routes>
          <Route path="/" element={renderDashboard()} />
          <Route path="inventory" element={<Inventory isInDashboard={true} />} />          <Route path="my-requests" element={<MyRequests isInDashboard={true} />} />
          <Route path="scan" element={<QRScanner isInDashboard={true} role={role} />} />
          <Route path="*" element={<Navigate to="/user-dashboard" replace />} />
        </Routes>
      </ErrorBoundary>
    </BaseDashboard>
  );
}

export default UserDashboard;
