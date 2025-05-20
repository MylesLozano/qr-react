import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import NotificationContext from './NotificationContextDef';
import { getNotifications } from '../firebase';

/**
 * NotificationProvider component
 * Manages notifications state and provides notification functions
 */
export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    // Only show request status notifications
    getNotifications(user.uid).then((allNotifications) => {
      const notificationList = allNotifications
        .filter(n => n.type === 'request_approved' || n.type === 'request_denied');
      setNotifications(notificationList);
      setUnreadCount(notificationList.filter(n => !n.read).length);
      setLoading(false);
    }).catch((error) => {
      console.error('Error fetching notifications:', error);
      setLoading(false);
    });
  }, [user]);

  // Context value
  const value = {
    notifications,
    unreadCount,
    loading,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
