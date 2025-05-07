import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { auth, logAudit } from '../firebase';
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

// Navigation items configuration - organized by role-specific paths
const NAV_CONFIG = [
  // User navigation
  {
    path: '/user-dashboard/inventory',
    label: 'Inventory',
    icon: '📦',
    action: 'view_inventory',
    description: 'View available inventory items',
    roles: ['user']
  },
  {
    path: '/user-dashboard/my-requests',
    label: 'My Requests',
    icon: '📄',
    action: 'view_requests',
    description: 'View and manage your requests',
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
      // Capture user info before logout
      const userEmail = user?.email;
      const userId = user?.uid;

      // Log the logout action to audit logs before signing out
      try {
        console.log("Logging user sign-out event before auth.signOut()");
        const auditLogId = await logAudit('user_signed_out', userEmail, 'user', {
          timestamp: new Date().toISOString(),
          userId: userId
        });
        console.log(`Sign-out audit logged with ID: ${auditLogId}`);
      } catch (auditError) {
        console.error("Error logging sign-out audit:", auditError);
        // Continue with logout even if audit logging fails
      }

      // Proceed with logout
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

  // Navigation Tab Component
  const NavTab = ({ item, index }) => {
    const isActive = location.pathname === item.path || location.pathname.startsWith(item.path);
    
    // Desktop tab styling
    const tabClasses = isActive
      ? `text-blue-600 border-b-2 border-blue-600 font-medium ${isDarkMode ? 'hover:text-blue-400' : 'hover:text-blue-800'}`
      : `text-gray-500 border-b-2 border-transparent ${isDarkMode ? 'hover:text-gray-300 hover:border-gray-600' : 'hover:text-gray-700 hover:border-gray-300'}`;
    
    return (
      <button
        onClick={() => {
          navigate(item.path);
          if (isMenuOpen) setIsMenuOpen(false);
        }}
        className={`flex items-center px-4 py-3 text-sm font-medium transition-colors duration-200 ${tabClasses}`}
        ref={isMobile && index === 0 ? firstNavItemRef : null}
        aria-current={isActive ? 'page' : undefined}
        title={item.description}
      >
        <span className="mr-2" aria-hidden="true">{item.icon}</span>
        {item.label}
      </button>
    );
  };

  // Mobile Navigation Link Component
  const MobileNavLink = ({ item, index }) => {
    const isActive = location.pathname === item.path || location.pathname.startsWith(item.path);
    
    const linkClasses = isActive
      ? `bg-blue-50 text-blue-700 ${isDarkMode ? 'bg-blue-900 text-blue-200' : ''}`
      : `text-gray-600 ${isDarkMode ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'hover:bg-gray-50 hover:text-gray-900'}`;
    
    return (
      <button
        onClick={() => {
          navigate(item.path);
          setIsMenuOpen(false);
        }}
        className={`flex items-center px-3 py-2 rounded-md text-base font-medium w-full text-left ${linkClasses}`}
        ref={index === 0 ? firstNavItemRef : null}
        aria-current={isActive ? 'page' : undefined}
      >
        <span className="mr-3" aria-hidden="true">{item.icon}</span>
        {item.label}
      </button>
    );
  };

  if (!user) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <ErrorBoundary>
      <div className={`min-h-screen ${themeStyles.container}`}>
        {/* Skip link for accessibility */}
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-500 text-white p-2 rounded z-50">
          Skip to main content
        </a>

        {/* Navigation */}
        <nav className={`${themeStyles.nav} shadow-md sticky top-0 z-40 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center">
                  <span className={`text-xl font-bold ${themeStyles.heading}`}>
                    QCheckCITE
                  </span>
                </div>
                
                {/* Desktop Navigation Tabs */}
                <div className="hidden sm:ml-6 sm:flex sm:space-x-2 overflow-x-auto">
                  {navItems.map((item, index) => (
                    <NavTab key={item.path} item={item} index={index} />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Mobile menu button */}
                {isMobile && (
                  <button
                    ref={menuButtonRef}
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className={`inline-flex items-center justify-center p-2 rounded-md transition-colors duration-200
                      ${isDarkMode
                        ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                    aria-expanded={isMenuOpen}
                    aria-controls="mobile-menu"
                    aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                  >
                    <span className="sr-only">{isMenuOpen ? 'Close menu' : 'Open menu'}</span>
                    {isMenuOpen ? (
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    )}
                  </button>
                )}

                {/* Theme toggle button */}
                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-full transition-colors duration-200 ${themeStyles.themeButton}`}
                  aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
                >
                  {isDarkMode ? '🌞' : '🌙'}
                </button>

                {/* Logout button */}
                <Button
                  onClick={handleLogout}
                  disabled={isLoading}
                  color="red"
                  size="sm"
                  className={isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                  aria-label="Logout"
                >
                  {isLoading ? <LoadingSpinner size="sm" /> : 'Logout'}
                </Button>
              </div>
            </div>
          </div>
        </nav>

        {/* Mobile menu - Slide in from top */}
        {isMenuOpen && (
          <div
            className={`sm:hidden fixed inset-x-0 top-16 z-30 transform transition-transform duration-200 ease-in-out
              ${isMenuOpen ? 'translate-y-0' : '-translate-y-full'} 
              ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} 
              shadow-lg border-b`}
            id="mobile-menu"
          >
            <div className="max-h-[calc(100vh-4rem)] overflow-y-auto px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item, index) => (
                <MobileNavLink key={item.path} item={item} index={index} />
              ))}
            </div>
          </div>
        )}

        {/* Main content */}
        <main
          id="main-content"
          className={`max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-4rem)]`}
        >
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default BaseDashboard;