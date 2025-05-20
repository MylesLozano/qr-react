import React, { useState, useRef } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { useClickOutside } from '../../hooks/useClickOutside';
import { Link } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';

/**
 * NotificationBell component - Shows notification count and dropdown
 * @returns {JSX.Element} NotificationBell component
 */
const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const notificationRef = useRef(null);
  const { isDarkMode } = useTheme();

  // Close dropdown when clicking outside
  useClickOutside(notificationRef, () => setIsOpen(false));

  /**
   * Toggle notification dropdown
   */
  const toggleNotifications = () => {
    setIsOpen(!isOpen);
  };

  /**
   * Handle notification click
   * @param {Object} notification - Notification object
   */
  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    setIsOpen(false);
  };

  /**
   * Get appropriate icon based on notification type
   * @param {string} type - Notification type
   * @returns {JSX.Element} Icon element
   */
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'request_approved':
        return <span className="text-green-500 text-lg">✓</span>;
      case 'request_denied':
        return <span className="text-red-500 text-lg">✕</span>;
      default:
        return <span className="text-gray-500 text-lg">•</span>;
    }
  };

  /**
   * Get appropriate link based on notification type
   * @param {Object} notification - Notification object
   * @returns {string} URL to navigate to
   */
  const getNotificationLink = (notification) => {
    switch (notification.type) {
      case 'request_approved':
      case 'request_denied':
        return `/dashboard/requests/${notification.relatedItemId}`;
      default:
        return '/dashboard';
    }
  };

  /**
   * Format relative time for notification
   * @param {Date} date - Date to format
   * @returns {string} Formatted time string
   */
  const formatRelativeTime = (date) => {
    if (!date) return 'Unknown time';
    
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Only show request status notifications in the UI
  const filteredNotifications = notifications.filter(
    n => n.type === 'request_approved' || n.type === 'request_denied'
  );

  return (
    <div className="relative" ref={notificationRef}>
      <button
        className={`p-1 relative ${
          isDarkMode ? 'text-gray-300 hover:text-blue-400' : 'text-gray-700 hover:text-blue-600'
        } focus:outline-none transition-colors duration-200`}
        onClick={toggleNotifications}
        aria-label="Notifications"
      >
        {/* Bell Icon */}
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-6 w-6" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
          />
        </svg>
        {/* Notification Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {/* Dropdown Panel */}
      {isOpen && (
        <div className={`absolute right-0 mt-2 w-80 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto ${
          isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'
        }`}>
          {/* Header */}
          <div className={`p-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
            <h3 className="text-lg font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className={`text-sm ${
                  isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'
                }`}
              >
                Mark all as read
              </button>
            )}
          </div>
          {/* Notification List */}
          {filteredNotifications.length === 0 ? (
            <div className={`p-4 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              No notifications
            </div>
          ) : (
            <div>
              {filteredNotifications.map((notification) => (
                <Link
                  key={notification.id}
                  to={getNotificationLink(notification)}
                  className={`block p-4 border-b ${
                    isDarkMode ? 'border-gray-700' : 'border-gray-100'
                  } ${
                    !notification.read 
                      ? isDarkMode 
                        ? 'bg-blue-900/20' 
                        : 'bg-blue-50'
                      : ''
                  } ${
                    isDarkMode 
                      ? 'hover:bg-gray-700' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{notification.title}</p>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {notification.message}
                      </p>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
