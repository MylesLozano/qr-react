import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { toast } from 'react-toastify';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { canPerformAction } from '../utils/roleUtils';

function BaseDashboard({ children }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const { user, role } = useAuth();

  // Memoize navigation items based on role and permissions
  const navItems = useMemo(() => {
    const commonItems = [
      {
        path: '/inventory',
        label: 'Inventory',
        icon: '📦',
        action: 'view_inventory'
      },
    ];

    const adminItems = [
      {
        path: '/admin-dashboard/requests',
        label: 'Requests',
        icon: '📥',
        action: 'manage_requests'
      },
      {
        path: '/admin-dashboard/reports',
        label: 'Reports',
        icon: '📊',
        action: 'generate_reports'
      },
    ];

    const superAdminItems = [
      {
        path: '/superadmin-dashboard/audit-logs',
        label: 'Audit Logs',
        icon: '📝',
        action: 'view_audit_logs'
      },
      {
        path: '/superadmin-dashboard/manage-users',
        label: 'User Management',
        icon: '👥',
        action: 'manage_users'
      },
    ];

    const userItems = [
      {
        path: '/user-dashboard/my-requests',
        label: 'My Requests',
        icon: '📄',
        action: 'view_requests'
      },
    ];

    let items = [...commonItems];

    if (role === 'user') {
      items = [...items, ...userItems];
    }
    if (role === 'admin' || role === 'superadmin') {
      items = [...items, ...adminItems];
    }
    if (role === 'superadmin') {
      items = [...items, ...superAdminItems];
    }

    // Filter items based on permissions
    return items.filter(item => !item.action || canPerformAction(role, item.action));
  }, [role]);

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

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && isMenuOpen) {
      setIsMenuOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  if (!user) {
    return null; // AuthProvider will handle redirection
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
              {/* Desktop Navigation */}
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
              {/* Mobile menu button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
              >
                <span className="sr-only">Open main menu</span>
                {isMenuOpen ? '✕' : '☰'}
              </button>
              <button
                onClick={toggleTheme}
                className={`ml-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md ${isDarkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
              >
                {isDarkMode ? '🌞 Light' : '🌙 Dark'}
              </button>
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
        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="sm:hidden">
            <div className="pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`${location.pathname === item.path
                    ? `${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`
                    : `${isDarkMode ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`
                    } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className={`max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
        {children}
      </main>
    </div>
  );
}

export default BaseDashboard;