import { useContext } from 'react';
import NotificationContext from '../context/NotificationContextDef';

/**
 * Hook to access notification context
 * @returns {Object} Notification context value
 */
export const useNotifications = () => useContext(NotificationContext);
