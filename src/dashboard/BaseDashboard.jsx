import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { auth, logAudit } from '../firebase';
import { toast } from 'react-toastify';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { canPerformAction } from '../utils/roleUtils';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBoundary from '../components/ErrorBoundary';
import Button from '../components/Button';

// Constants
const MOBILE_BREAKPOINT = 640;

// Navigation items configuration - organized by role-specific paths
const NAV_CONFIG = [
  // User navigation
  {
    path: '/user-dashboard/inventory',
    label: 'Browse Inventory',
    icon: '📦',
    action: 'view_inventory',
    description: 'View and request available items',
    roles: ['user']
  },
  {
    path: '/user-dashboard/my-requests',
    label: 'My Requests',
    icon: '📄',
    action: 'view_requests',
    description: 'Track and manage your requests',
    roles: ['user']
  },
  {
    path: '/user-dashboard/scan',
    label: 'Scan QR Code',
    icon: '📱',
    action: 'view_inventory',
    description: 'Quickly scan item QR codes',
    roles: ['user']
  },

  // Admin navigation
  {
    path: '/admin-dashboard/inventory',
    label: 'Inventory',
    icon: '📦',
    action: 'view_inventory',
    description: 'Manage inventory items',
    roles: ['admin']
  },
  {
    path: '/admin-dashboard/categories',
    label: 'Categories',
    icon: '📋',
    action: 'manage_categories',
    description: 'Manage inventory categories',
    roles: ['admin']
  },
  {
    path: '/admin-dashboard/requests',
    label: 'Requests',
    icon: '📥',
    action: 'manage_requests',
    description: 'Manage user requests',
    roles: ['admin']
  },
  {
    path: '/admin-dashboard/templates',
    label: 'Templates',
    icon: '📋',
    action: 'manage_templates',
    description: 'Manage report templates',
    roles: ['admin']
  },
  {
    path: '/admin-dashboard/reporting',
    label: 'Report/Audits',
    icon: '📊',
    action: 'generate_reports',
    description: 'Access consolidated reports and audit logs',
    roles: ['admin']
  },
  {
    path: '/admin-dashboard/generate-report',
    label: 'Generate Report',
    icon: '📄',
    action: 'generate_reports',
    description: 'Generate new reports',
    roles: ['admin']
  },

  // Superadmin navigation
  {
    path: '/superadmin-dashboard/inventory',
    label: 'Inventory',
    icon: '📦',
    action: 'view_inventory',
    description: 'Manage inventory items',
    roles: ['superadmin']
  },
  {
    path: '/superadmin-dashboard/requests',
    label: 'Requests',
    icon: '📥',
    action: 'manage_requests',
    description: 'Manage user requests',
    roles: ['superadmin']
  },
  {
    path: '/superadmin-dashboard/templates',
    label: 'Templates',
    icon: '📋',
    action: 'manage_templates',
    description: 'Manage report templates',
    roles: ['superadmin']
  },
  {
    path: '/superadmin-dashboard/reporting',
    label: 'Report/Audits',
    icon: '📊',
    action: 'generate_reports',
    description: 'Access consolidated reports and audit logs',
    roles: ['superadmin']
  },
  {
    path: '/superadmin-dashboard/generate-report',
    label: 'Generate Report',
    icon: '📄',
    action: 'generate_reports',
    description: 'Generate new reports',
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
    themeButton: isDarkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    logoutButton: isDarkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'
  };

  // Calculate content width based on role
  const shouldExpandContent = useMemo(() => 
    ['admin', 'superadmin'].includes(role) || window.innerWidth <= MOBILE_BREAKPOINT
  , [role]);

  // Handle window resize with optimized debounce
  const handleResize = useCallback(() => {
    const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
    setIsMobile(mobile);
    if (!mobile && isMenuOpen) {
      setIsMenuOpen(false);
    }
  }, [isMenuOpen, setIsMobile, setIsMenuOpen]);

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
      // Capture user info before logout
      const userEmail = user?.email || 'unknown';
      const userId = user?.uid || 'unknown';

      // Log the logout action to audit logs before signing out
      try {
        await logAudit('user_signed_out', userEmail, 'user', {
          timestamp: new Date().toISOString(),
          userId: userId
        });
      } catch (auditError) {
        // Log audit error but continue with logout
        console.error("Error logging sign-out audit:", auditError);
      }

      // Proceed with logout
      await auth.signOut();
      toast.success("Logged out successfully");
      navigate('/login');
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error(`Failed to log out: ${error.message || 'Unknown error'}`);
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
      <div className={`min-h-screen flex ${themeStyles.container}`}>
        {/* Skip link for accessibility */}
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-500 text-white p-2 rounded z-50">
          Skip to main content
        </a>

        {/* Sidebar Navigation for all roles */}        <nav className={`${themeStyles.nav} w-[280px] flex-shrink-0 
          ${isMobile ? 'fixed inset-y-0 left-0 transform -translate-x-full z-40' : 'sticky top-0 h-screen'} 
          ${isMenuOpen ? 'translate-x-0' : ''} 
          transition-transform duration-300 ease-in-out border-r 
          ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}
        >
          <div className="h-full flex flex-col">
            {/* Logo Container */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img 
                  src="/src/assets/QCheckCITE_Logo.png" 
                  alt="QCheckCITE Logo" 
                  className="h-8 w-8 object-contain"
                />
                <span className={`text-xl font-semibold ${themeStyles.heading}`}>
                  QCheckCITE
                </span>
              </div>
              {isMobile && (
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className={`${themeStyles.themeButton} p-2 rounded-md`}
                  aria-label="Close menu"
                >
                  <span className="sr-only">Close menu</span>
                  ✕
                </button>
              )}
            </div>

            {/* Navigation Links */}
            <div className="flex-1 overflow-y-auto py-4 px-2">
              {navItems.map((item, index) => (                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path, { replace: true });
                    if (isMobile) setIsMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg mb-1 flex items-center transition-colors duration-200 ${
                    location.pathname.includes(item.path)
                      ? `${isDarkMode ? 'bg-gray-700 text-white' : 'bg-blue-100 text-blue-700'}`
                      : `${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`
                  }`}
                  ref={index === 0 ? firstNavItemRef : null}
                  aria-current={location.pathname.includes(item.path) ? 'page' : undefined}
                  title={item.description}
                >
                  <span className="mr-3" aria-hidden="true">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>

            {/* Bottom Actions Section */}
            <div className="p-4 border-t border-gray-200">
              <Button
                onClick={toggleTheme}
                className={`w-full mb-2 ${themeStyles.themeButton}`}
              >
                {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
              </Button>
              <Button
                onClick={handleLogout}
                className={`w-full ${themeStyles.logoutButton} text-white`}
                disabled={isLoading}
              >
                {isLoading ? <LoadingSpinner size="sm" /> : 'Sign Out'}
              </Button>
            </div>
          </div>
        </nav>        {/* Hamburger menu button - shown only on mobile for all roles */}
        {isMobile && (
          <button
            ref={menuButtonRef}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`fixed top-4 left-4 z-50 inline-flex items-center justify-center p-2 rounded-md 
              transition-colors duration-200
              ${isDarkMode
                ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
            aria-expanded={isMenuOpen}
            aria-controls="navigation-menu"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          >
            <span className="sr-only">{isMenuOpen ? 'Close menu' : 'Open menu'}</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}        {/* Main Content */}
        <main
          id="main-content"
          className={`flex-1 min-h-screen relative
            max-w-7xl mx-auto
            ${isMobile ? 'pt-16' : ''}`}
        >
          <div className={`
            ${shouldExpandContent ? 'w-full' : 'max-w-5xl mx-auto'}
            ${isMobile ? 'px-4' : 'px-6'}
            py-6
          `}>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default BaseDashboard;