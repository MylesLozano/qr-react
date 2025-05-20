// File: src/firebase.js

/**
 * Firebase configuration and service initialization
 * This module initializes Firebase services and exports authentication and
 * database utility functions for use throughout the application.
 */

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  addDoc,
  serverTimestamp,
  initializeFirestore,
  persistentLocalCache,
  updateDoc,
  query,
  where,
  orderBy,
  getDocs,
} from 'firebase/firestore';

/**
 * Constants for Firebase collections and configuration
 */
const EMAIL_DOMAIN = '@jmc.edu.ph';
const DEFAULT_ROLE = 'user';
const AUDIT_COLLECTION = 'auditLogs';
const USERS_COLLECTION = 'users';
const QR_COLLECTION = 'qrCodes';
const NOTIFICATIONS_COLLECTION = 'notifications';

/**
 * Firebase configuration object
 * Values are loaded from environment variables
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

/**
 * Validates that all required Firebase config fields are present
 * @param {Object} config - Firebase configuration object
 * @throws {Error} If any required fields are missing
 */
const validateFirebaseConfig = (config) => {
  const requiredFields = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ];
  const missingFields = requiredFields.filter((field) => !config[field]);
  if (missingFields.length > 0) {
    throw new Error(`Missing required Firebase config fields: ${missingFields.join(', ')}`);
  }
};

let auth,
  db,
  logAudit,
  getUserRole,
  checkAndAssignUserRole,
  firebaseApp,
  saveQRCodeToFirestore,
  getQRCodeFromFirestore,
  updateQRCodeLockStatus,
  hasQRCode,
  sendNotification,
  getNotifications;

try {
  validateFirebaseConfig(firebaseConfig);
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  firebaseApp = app;

  db = initializeFirestore(app, {
    localCache: persistentLocalCache(),
  });

  checkAndAssignUserRole = async (user) => {
    if (!user || !user.email.endsWith(EMAIL_DOMAIN)) {
      console.warn(`Invalid user or email domain: ${user?.email}`);
      return;
    }
    const userRef = doc(db, USERS_COLLECTION, user.uid);
    const userSnap = await getDoc(userRef);
    try {
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          createdAt: serverTimestamp(),
          email: user.email,
          role: DEFAULT_ROLE,
          lastLogin: serverTimestamp(),
        });
        console.info(`✅ Assigned default role '${DEFAULT_ROLE}' to ${user.email}`);
        await logAudit('user_role_assigned', user.email, 'user', {
          role: DEFAULT_ROLE,
          userId: user.uid,
        });
      } else {
        const userData = userSnap.data();
        console.info(`ℹ️ User ${user.email} exists with role: ${userData.role}`);
        await logAudit('user_role_verified', user.email, 'user', {
          role: userData.role,
          userId: user.uid,
        });
        await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
      }
    } catch (error) {
      console.error('🚨 Error assigning user role:', error);
      throw error;
    }
  };

  getUserRole = async (uid) => {
    if (!uid) return DEFAULT_ROLE;
    try {
      const userRef = doc(db, USERS_COLLECTION, uid);
      const userSnap = await getDoc(userRef);
      return userSnap.exists() ? userSnap.data().role : DEFAULT_ROLE;
    } catch (error) {
      console.error('🚨 Error fetching user role:', error);
      return DEFAULT_ROLE;
    }
  };

  /**
   * Logs an audit event to Firestore
   * @param {string} action - Description of the action performed (e.g., 'User logged in', 'Item added')
   * @param {string} userEmail - The email of the user performing the action
   * @param {string} entityType - The type of entity the action is related to (e.g., 'user', 'inventory', 'request')
   * @param {object} details - Optional object with additional details about the action (e.g., { itemId: 'abc', userName: '...' })
   */
  logAudit = async (action, userEmail, entityType = 'system', details = {}) => {
    if (!action || !userEmail) {
      console.warn('Attempted to log audit without action or user email.');
      return;
    }

    // Special handling for sign-out events to ensure they're properly captured
    const isSignOut = action === 'user_signed_out';
    if (isSignOut) {
      console.info(`📝 Logging sign-out event for: ${userEmail}`);
    }

    try {
      const auditData = {
        action,
        userEmail,
        entityType,
        details,
        timestamp: serverTimestamp(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
      };

      // For sign-out events, use clientTimestamp instead of serverTimestamp to ensure capture
      if (isSignOut) {
        auditData.clientTimestamp = new Date().toISOString();
      }

      const auditRef = await addDoc(collection(db, AUDIT_COLLECTION), auditData);

      console.info(`✅ Audit log added: ${userEmail} - ${action} (ID: ${auditRef.id})`);

      // Additional logging for sign-out events
      if (isSignOut) {
        console.info(`✅ Sign-out successfully logged for: ${userEmail}`);
      }

      return auditRef.id; // Return the ID for confirmation
    } catch (error) {
      console.error(`🚨 Error logging audit event (${action}):`, error);
      if (isSignOut) {
        console.error('🚨 Failed to log sign-out event. Details:', {
          userEmail,
          entityType,
          details,
        });
      }
      // Don't throw the error for sign-out events to prevent disrupting the logout flow
      if (!isSignOut) {
        throw error;
      }
    }
  }; // Add new function to handle QR code storage in Firestore
  saveQRCodeToFirestore = async (itemId, qrDataUrl, metadata = {}) => {
    try {
      const qrRef = doc(db, QR_COLLECTION, itemId);

      // Use the utilities to generate a QR string if none exists
      const { generateQrString } = await import('./utils/qrUtils');

      // Always generate a qrString for the item if none exists
      const qrString = metadata.qrString || generateQrString(itemId);

      // Check if this item already has a QR code
      const existingQR = await getDoc(qrRef);

      // Data to save
      const qrData = {
        qrString: qrString, // The unique string that identifies this QR code
        updatedAt: serverTimestamp(),
        ...metadata,
      };

      // Only add the image data if it's provided
      if (qrDataUrl) {
        qrData.qrCode = qrDataUrl; // This will be the PNG data URL when downloaded
      }

      // If this is a new QR code, set createdAt
      if (!existingQR.exists()) {
        qrData.createdAt = serverTimestamp();
        qrData.isLocked = false;
      }

      await setDoc(qrRef, qrData, { merge: true });

      console.info(`✅ QR code saved for item ${itemId}`);
      return true;
    } catch (error) {
      console.error('Error saving QR code:', error);
      throw error;
    }
  };
  // Add function to retrieve QR code from Firestore
  getQRCodeFromFirestore = async (itemId) => {
    try {
      const qrRef = doc(db, QR_COLLECTION, itemId);
      const qrDoc = await getDoc(qrRef);
      if (qrDoc.exists()) {
        return qrDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Error retrieving QR code:', error);
      throw error;
    }
  }; // Check if an item has a QR code
  hasQRCode = async (itemId) => {
    try {
      const qrData = await getQRCodeFromFirestore(itemId);
      return Boolean(qrData && (qrData.qrString || qrData.qrCode));
    } catch (error) {
      console.error('Error checking if item has QR code:', error);
      return false;
    }
  };

  // Add function to update QR code lock status
  updateQRCodeLockStatus = async (itemId, isLocked) => {
    try {
      const qrRef = doc(db, QR_COLLECTION, itemId);
      await updateDoc(qrRef, {
        isLocked: isLocked,
      });
      console.info(`✅ QR code lock status updated for item ${itemId}: ${isLocked}`);
      return true;
    } catch (error) {
      console.error('Error updating QR code lock status:', error);
      throw error;
    }
  };
  /**
   * Sends a notification to a user
   * @deprecated Use createNotification instead
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} userId - ID of the recipient user
   * @returns {Promise<void>}
   */
  sendNotification = async (title, message, userId) => {
    console.warn('sendNotification is deprecated, use createNotification instead');
    try {
      const notificationData = {
        title,
        message,
        userId,
        timestamp: serverTimestamp(),
        isRead: false,
      };

      await addDoc(collection(db, NOTIFICATIONS_COLLECTION), notificationData);
      console.info(`✅ Notification sent to user ${userId}: ${title}`);
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  };

  /**
   * Retrieves notifications for a user
   * @deprecated Use getUserNotificationsQuery instead
   * @param {string} userId - ID of the user
   * @returns {Promise<Array>} List of notifications
   */
  getNotifications = async (userId) => {
    console.warn('getNotifications is deprecated, use getUserNotificationsQuery instead');
    try {
      const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
      const q = query(
        notificationsRef,
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const notifications = [];
      querySnapshot.forEach((doc) => {
        notifications.push({ id: doc.id, ...doc.data() });
      });
      return notifications;
    } catch (error) {
      console.error('Error retrieving notifications:', error);
      throw error;
    }
  };

  // Function to mark a notification as read
  /**
   * Legacy function - use markNotificationAsRead instead
   * @deprecated
   */
  // Commented out to prevent eslint warning about unused function

  /**
   * Creates a notification for a user
   * @param {string} userId - ID of the recipient user
   * @param {Object} notificationData - Notification data object
   * @returns {Promise<string>} Notification document ID
   */
  const createNotification = async (userId, notificationData) => {
    try {
      if (!userId) {
        console.error('Invalid userId provided for notification');
        throw new Error('Invalid userId');
      }

      const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
      const newNotification = {
        userId,
        ...notificationData,
        createdAt: serverTimestamp(),
        read: false,
      };

      const docRef = await addDoc(notificationsRef, newNotification);
      console.info(`✅ Notification created for user ${userId}`);
      return docRef.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  };

  /**
   * Marks a notification as read
   * @param {string} notificationId - ID of the notification
   * @returns {Promise<void>}
   */
  const markNotificationAsRead = async (notificationId) => {
    try {
      const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
      await updateDoc(notificationRef, {
        read: true,
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  };
  /**
   * Gets a query for user's notifications
   * @param {string} userId - User ID
   * @returns {Query} - Firestore query for user's notifications
   */
  const getUserNotificationsQuery = (userId) => {
    return query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
  }; // Export these functions from the try block
  window.firebaseExports = {
    sendNotification,
    getNotifications,
    createNotification,
    markNotificationAsRead,
    getUserNotificationsQuery,
  };
} catch (error) {
  console.error('🚨 Firebase initialization failed:', error);
  throw error;
}

// Get the exported functions from window if they were defined in the try block
const firebaseExports = window.firebaseExports || {};
const createNotification = firebaseExports.createNotification;
const markNotificationAsRead = firebaseExports.markNotificationAsRead;
const getUserNotificationsQuery = firebaseExports.getUserNotificationsQuery;
// Get legacy notification functions if they were defined

export {
  auth,
  db,
  logAudit,
  getUserRole,
  checkAndAssignUserRole,
  firebaseApp,
  saveQRCodeToFirestore,
  getQRCodeFromFirestore,
  updateQRCodeLockStatus,
  hasQRCode,
  // Include both new and legacy notification functions
  sendNotification,
  getNotifications,
  createNotification,
  markNotificationAsRead,
  getUserNotificationsQuery,
};
