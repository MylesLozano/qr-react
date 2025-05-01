import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { toast } from 'react-toastify';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { debounce } from '../utils/inventoryUtils';
import { canPerformAction } from '../utils/roleUtils';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBoundary from '../components/ErrorBoundary';
import Button from '../components/Button';

// Constants
const MOBILE_BREAKPOINT = 640;
const DEBOUNCE_WAIT = 100;

// Navigation items configuration - organized by permissions rather than roles
const NAV_CONFIG = [
  {
    path: '/inventory',
    label: 'Inventory',
    icon: '📦',
    action: 'view_inventory',
    description: 'View and manage inventory items',
    roles: ['user', 'admin', 'superadmin']
  },
  {
    path: '/user-dashboard/my-requests',
    label: 'My Requests',
    icon: '📄',
    action: 'view_requests',
    description: 'View and manage your requests',
    roles: ['user', 'admin', 'superadmin']
  },
  {
    path: '/admin-dashboard/requests',
    label: 'Requests',
    icon: '📥',
    action: 'manage_requests',
    description: 'Manage user requests',
    roles: ['admin', 'superadmin']
  },
  {
    path: '/admin-dashboard/reports',
    label: 'Reports',
    icon: '📊',
    action: 'generate_reports',
    description: 'Generate and view reports',
    roles: ['admin', 'superadmin']
  },
  {
    path: '/superadmin-dashboard/audit-logs',
    label: 'Audit Logs',
    icon: '📝',
    action: 'view_audit_logs',
    description: 'View system audit logs',
    roles: ['superadmin']
  },
  {
    path: '/superadmin-dashboard/user-management',
    label: 'User Management',
    icon: '👥',
    action: 'manage_users',
    description: 'Manage user accounts and permissions',
    roles: ['superadmin']
  }
];

function BaseDashboard({ children }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT);
  const location = useLocation();
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const { user, role } = useAuth();
  const menuButtonRef = useRef(null);
  const firstNavItemRef = useRef(null);

  // Theme-based styling utility functions
  const themeStyles = {
    container: isDarkMode ? 'bg-gray-900' : 'bg-gray-100',
    nav: isDarkMode ? 'bg-gray-800' : 'bg-white',
    heading: isDarkMode ? 'text-white' : 'text-gray-900',
    activeLink: isDarkMode ? 'border-blue-500 text-blue-500' : 'border-blue-600 text-blue-600',
    activeLinkBg: isDarkMode ? 'bg-gray-800' : 'bg-white',
    inactiveLink: isDarkMode ? 'border-transparent text-gray-300 hover:text-gray-100 hover:border-gray-300' :
      'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
    mobileActiveLink: isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900',
    mobileInactiveLink: isDarkMode ? 'text-gray-300 hover:bg-gray-700 hover:text-white' :
      'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
    themeButton: isDarkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    logoutButton: isDarkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'
  };

  // Handle window resize with optimized debounce
  const handleResize = useCallback(
    debounce(() => {
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (!mobile && isMenuOpen) {
        setIsMenuOpen(false);
      }
    }, DEBOUNCE_WAIT),
    [isMenuOpen]
  );

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Memoize navigation items based on role
  const navItems = useMemo(() =>
    NAV_CONFIG.filter(item =>
      item.roles.includes(role) && canPerformAction(role, item.action)
    ), [role]);

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

  // Link component to avoid duplication
  const NavLink = ({ item, index, isMobile }) => {
    const isActive = location.pathname === item.path || location.pathname.includes(item.path);
    const className = isMobile
      ? `${isActive ? themeStyles.mobileActiveLink : themeStyles.mobileInactiveLink} block px-3 py-2 rounded-md text-base font-medium`
      : `${isActive ? `${themeStyles.activeLink} ${themeStyles.activeLinkBg}` : themeStyles.inactiveLink} inline-flex items-center px-4 pt-1 border-b-2 text-sm font-medium transition-all duration-200`;

    return (
      <Link
        to={item.path}
        className={className}
        ref={isMobile && index === 0 ? firstNavItemRef : null}
        aria-current={isActive ? 'page' : undefined}
        title={item.description}
      >
        <span className="mr-2" aria-hidden="true">
          {isMobile && window.innerWidth < 500 ? '📋' : item.icon}
        </span>
        {item.label}
      </Link>
    );
  };

  if (!user) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <ErrorBoundary>
      <div
        className={`min-h-screen ${themeStyles.container}`}
        role="application"
        aria-label="Dashboard"
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-500 text-white p-2 rounded"
        >
          Skip to main content
        </a>

        {/* Navigation */}
        <nav
          className={`${themeStyles.nav} shadow-lg`}
          role="navigation"
          aria-label="Main navigation"
        >
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <span
                    className={`text-xl font-bold ${themeStyles.heading}`}
                    role="heading"
                    aria-level="1"
                  >
                    QCheckCITE
                  </span>
                </div>
                {/* Desktop Navigation */}
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  {navItems.map((item, index) => (
                    <NavLink key={item.path} item={item} index={index} isMobile={false} />
                  ))}
                </div>
              </div>
              <div className="flex items-center">
                {/* Mobile menu button */}
                {isMobile && (
                  <button
                    ref={menuButtonRef}
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                    aria-expanded={isMenuOpen}
                    aria-controls="mobile-menu"
                    aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                  >
                    <span className="sr-only">{isMenuOpen ? 'Close menu' : 'Open menu'}</span>
                    {isMenuOpen ? '✕' : '☰'}
                  </button>
                )}
                <button
                  onClick={toggleTheme}
                  className={`ml-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md transition-colors duration-200 ${themeStyles.themeButton}`}
                  aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
                >
                  {isDarkMode ? 'Switch to Light Mode 🌞' : 'Switch to Dark Mode 🌙'}
                </button>
                <Button
                  onClick={handleLogout}
                  disabled={isLoading}
                  className={`ml-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white transition-colors duration-200 ${themeStyles.logoutButton} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  aria-label="Logout"
                >
                  {isLoading ? <LoadingSpinner size="small" /> : 'Logout'}
                </Button>
              </div>
            </div>
          </div>
        </nav>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="sm:hidden" id="mobile-menu">
            <div className={`pt-2 pb-3 space-y-1 ${themeStyles.nav}`}>
              {navItems.map((item, index) => (
                <NavLink key={item.path} item={item} index={index} isMobile={true} />
              ))}
            </div>
          </div>
        )}

        {/* Main content */}
        <main id="main-content" className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default BaseDashboard;