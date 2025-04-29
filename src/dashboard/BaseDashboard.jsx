import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { toast } from 'react-toastify';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { canPerformAction } from '../utils/roleUtils';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBoundary from '../components/ErrorBoundary';

// Constants
const MOBILE_BREAKPOINT = 640;
const NAVIGATION_ITEMS = {
  common: [
    {
      path: '/inventory',
      label: 'Inventory',
      icon: '📦',
      action: 'view_inventory',
      description: 'View and manage inventory items'
    },
  ],
  admin: [
    {
      path: '/admin-dashboard/requests',
      label: 'Requests',
      icon: '📥',
      action: 'manage_requests',
      description: 'Manage user requests'
    },
    {
      path: '/admin-dashboard/reports',
      label: 'Reports',
      icon: '📊',
      action: 'generate_reports',
      description: 'Generate and view reports'
    },
  ],
  superadmin: [
    {
      path: '/superadmin-dashboard/inventory',
      label: 'Inventory',
      icon: '📦',
      action: 'view_inventory',
      description: 'View and manage inventory items'
    },
    {
      path: '/superadmin-dashboard/requests',
      label: 'Requests',
      icon: '📥',
      action: 'manage_requests',
      description: 'Manage user requests'
    },
    {
      path: '/superadmin-dashboard/reports',
      label: 'Reports',
      icon: '📊',
      action: 'generate_reports',
      description: 'Generate and view reports'
    },
    {
      path: '/superadmin-dashboard/audit-logs',
      label: 'Audit Logs',
      icon: '📝',
      action: 'view_audit_logs',
      description: 'View system audit logs'
    },
    {
      path: '/superadmin-dashboard/user-management',
      label: 'User Management',
      icon: '👥',
      action: 'manage_users',
      description: 'Manage user accounts and permissions'
    },
  ],
  user: [
    {
      path: '/user-dashboard/my-requests',
      label: 'My Requests',
      icon: '📄',
      action: 'view_requests',
      description: 'View and manage your requests'
    },
  ]
};

function BaseDashboard({ children }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const location = useLocation();
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const { user, role } = useAuth();
  const menuButtonRef = useRef(null);
  const firstNavItemRef = useRef(null);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth > MOBILE_BREAKPOINT) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Memoize navigation items based on role and permissions
  const navItems = useMemo(() => {
    if (role === 'superadmin') {
      return NAVIGATION_ITEMS.superadmin;
    }
    if (role === 'admin') {
      return [...NAVIGATION_ITEMS.common, ...NAVIGATION_ITEMS.admin];
    }
    if (role === 'user') {
      return [...NAVIGATION_ITEMS.common, ...NAVIGATION_ITEMS.user];
    }
    return [];
  }, [role]);

  // Handle logout with loading state
  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await auth.signOut();
      toast.success("Logged out successfully");
      navigate('/login');
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to log out");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && isMenuOpen) {
      setIsMenuOpen(false);
      menuButtonRef.current?.focus();
    }
  }, [isMenuOpen]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Focus management for mobile menu
  useEffect(() => {
    if (isMenuOpen) {
      firstNavItemRef.current?.focus();
    }
  }, [isMenuOpen]);

  if (!user) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <ErrorBoundary>
      <div
        className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}
        role="application"
        aria-label="Dashboard"
      >
        {/* Navigation */}
        <nav
          className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}
          role="navigation"
          aria-label="Main navigation"
        >
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <span
                    className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                    role="heading"
                    aria-level="1"
                  >
                    QCheckCITE
                  </span>
                </div>
                {/* Desktop Navigation */}
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  {navItems.map((item, index) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`${(location.pathname === item.path || location.pathname.includes(item.path))
                        ? `${isDarkMode
                          ? 'border-blue-500 text-blue-500 bg-gray-800'
                          : 'border-blue-600 text-blue-600 bg-white'
                        }`
                        : `${isDarkMode
                          ? 'border-transparent text-gray-300 hover:text-gray-100 hover:border-gray-300'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`
                        } inline-flex items-center px-4 pt-1 border-b-2 text-sm font-medium transition-all duration-200`}
                      aria-current={location.pathname === item.path ? 'page' : undefined}
                      title={item.description}
                    >
                      <span className="mr-2" aria-hidden="true">{item.icon}</span>
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="flex items-center">
                {/* Mobile menu button */}
                <button
                  ref={menuButtonRef}
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  aria-expanded={isMenuOpen}
                  aria-controls="mobile-menu"
                  aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                >
                  <span className="sr-only">{isMenuOpen ? 'Close menu' : 'Open menu'}</span>
                  {isMenuOpen ? '✕' : '☰'}
                </button>
                <button
                  onClick={toggleTheme}
                  className={`ml-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md transition-colors duration-200 ${isDarkMode
                    ? 'bg-gray-700 text-white hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                  aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
                >
                  {isDarkMode ? '🌞 Light' : '🌙 Dark'}
                </button>
                <button
                  onClick={handleLogout}
                  disabled={isLoading}
                  className={`ml-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white transition-colors duration-200 ${isDarkMode
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-red-500 hover:bg-red-600'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  aria-label="Logout"
                >
                  {isLoading ? <LoadingSpinner size="small" /> : 'Logout'}
                </button>
              </div>
            </div>
          </div>
          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div
              id="mobile-menu"
              className="sm:hidden"
              role="menu"
              aria-orientation="vertical"
              aria-labelledby="mobile-menu-button"
            >
              <div className="pt-2 pb-3 space-y-1">
                {navItems.map((item, index) => (
                  <Link
                    key={item.path}
                    ref={index === 0 ? firstNavItemRef : null}
                    to={item.path}
                    className={`${location.pathname === item.path
                      ? `${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`
                      : `${isDarkMode ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`
                      } block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors duration-200`}
                    onClick={() => setIsMenuOpen(false)}
                    role="menuitem"
                    aria-current={location.pathname === item.path ? 'page' : undefined}
                    title={item.description}
                  >
                    <span className="mr-2" aria-hidden="true">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Main Content */}
        <main
          className={`max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}
          role="main"
        >
          {children}
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default BaseDashboard;