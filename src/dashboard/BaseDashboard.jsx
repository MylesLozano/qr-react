import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { auth, getUserRole } from '../../firebase';
import { toast } from 'react-toastify';

function BaseDashboard({ children, role }) {
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        if (auth.currentUser) {
          const role = await getUserRole(auth.currentUser.uid);
          setUserRole(role);
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        toast.error("Failed to load user permissions");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to log out");
    }
  };

  const getNavItems = () => {
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
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  if (!userRole || (role && userRole !== role)) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-red-500 text-xl">
          ⚠️ Access Denied: You do not have permission to view this page.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-4 right-4 z-50">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 rounded-md bg-white shadow-md"
        >
          {isMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-200 ease-in-out z-40`}>
        <div className="h-full w-64 bg-white shadow-lg">
          <div className="p-4 border-b">
            <div className="text-xl font-bold text-blue-600">QCheckCITE</div>
            <div className="text-sm text-gray-600">
              {auth.currentUser?.email}
            </div>
            <div className="text-xs text-gray-500">
              Role: {userRole}
            </div>
          </div>

          <nav className="p-4">
            <ul className="space-y-2">
              {getNavItems().map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center p-2 rounded-md ${location.pathname === item.path
                        ? 'bg-blue-100 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="absolute bottom-0 w-full p-4 border-t">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center p-2 text-red-600 hover:bg-red-50 rounded-md"
            >
              <span className="mr-2">🚪</span>
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="md:ml-64">
        {/* Overlay for mobile menu */}
        {isMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
            onClick={() => setIsMenuOpen(false)}
          />
        )}

        {/* Content */}
        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default BaseDashboard;