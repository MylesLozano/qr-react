import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { auth, getUserRole } from '../firebase';
import { toast } from 'react-toastify';
import { useTheme } from '../context/ThemeContext';

function BaseDashboard({ children, role }) {
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const location = useLocation();
  const { isDarkMode } = useTheme();

  // Memoize navigation items
  const navItems = useMemo(() => {
    const commonItems = [
      { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
      { path: '/inventory', label: 'Inventory', icon: '📦' },
    ];

    const adminItems = [
      { path: '/user-management', label: 'User Management', icon: '👥' },
    ];

    const superAdminItems = [
      { path: '/audit-logs', label: 'Audit Logs', icon: '📝' },
    ];

    let items = [...commonItems];
    if (userRole === 'admin' || userRole === 'superadmin') {
      items = [...items, ...adminItems];
    }
    if (userRole === 'superadmin') {
      items = [...items, ...superAdminItems];
    }

    return items;
  }, [userRole]);

  const fetchUserRole = useCallback(async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const role = await getUserRole(currentUser.uid);
        setUserRole(role);
        setError(null);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      setError(error);
      if (retryCount < 3) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchUserRole();
        }, 2000);
      } else {
        toast.error("Failed to load user permissions after multiple attempts");
      }
    } finally {
      setIsLoading(false);
    }
  }, [retryCount]);

  useEffect(() => {
    fetchUserRole();
  }, [fetchUserRole]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to log out");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && isMenuOpen) {
      setIsMenuOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-lg text-gray-800 dark:text-gray-200">Loading dashboard...</div>
      </div>
    );
  }

  if (error && retryCount >= 3) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-red-500 text-xl mb-4">
          ⚠️ Failed to load dashboard
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Navigation */}
      <nav className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  QCheckCITE
                </span>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`${location.pathname === item.path
                      ? `${isDarkMode ? 'border-blue-400 text-white' : 'border-blue-500 text-gray-900'}`
                      : `${isDarkMode ? 'border-transparent text-gray-300 hover:border-gray-300 hover:text-white' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`
                      } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className={`ml-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${isDarkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'
                  }`}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className={`max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
        {children}
      </main>
    </div>
  );
}

export default BaseDashboard;