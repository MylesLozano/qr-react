import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import NotificationBell from '../notifications/NotificationBell';

/**
 * DashboardHeader component
 * Displays the user info, notifications, and other top-level actions
 * @returns {JSX.Element} DashboardHeader component
 */
const DashboardHeader = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();

  return (
    <div className={`flex justify-between items-center pb-4 mb-6 border-b ${
      isDarkMode ? 'border-gray-700' : 'border-gray-200'
    }`}>
      <div>
        <h1 className="text-2xl font-bold">
          Welcome, {user?.displayName || user?.email?.split('@')[0] || 'User'}
        </h1>
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>
      <div className="flex items-center space-x-4">
        <NotificationBell />
      </div>
    </div>
  );
};

export default DashboardHeader;
