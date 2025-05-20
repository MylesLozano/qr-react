/**
 * Notification utility functions
 * Helper functions for creating and managing notifications
 */

import { createNotification } from '../firebase';

/**
 * Creates a notification when a request is approved
 * @param {string} userId - User ID of the requester
 * @param {Object} request - Request data
 * @returns {Promise<string>} Notification ID
 */
export const createRequestApprovedNotification = async (userId, request) => {
  return await createNotification(userId, {
    title: 'Request Approved',
    message: `Your request for "${request.itemName || request.itemId}" has been approved.`,
    type: 'request_approved',
    relatedItemId: request.id || request.itemId,
  });
};

/**
 * Creates a notification when a request is denied
 * @param {string} userId - User ID of the requester
 * @param {Object} request - Request data
 * @param {string} reason - Optional reason for denial
 * @returns {Promise<string>} Notification ID
 */
export const createRequestDeniedNotification = async (userId, request, reason = '') => {
  let message = `Your request for "${request.itemName || request.itemId}" has been denied.`;
  if (reason) {
    message += ` Reason: ${reason}`;
  }

  return await createNotification(userId, {
    title: 'Request Denied',
    message,
    type: 'request_denied',
    relatedItemId: request.id || request.itemId,
  });
};

/**
 * Creates a notification when an inventory item is updated
 * @param {string} userId - User ID to notify
 * @param {Object} item - Inventory item data
 * @param {string} changeType - Type of change (e.g., 'status', 'location')
 * @returns {Promise<string>} Notification ID
 */
export const createInventoryUpdateNotification = async (userId, item, changeType) => {
  return await createNotification(userId, {
    title: 'Inventory Updated',
    message: `Item "${item.name || item.id}" has been updated (${changeType}).`,
    type: 'inventory_updated',
    relatedItemId: item.id,
  });
};

/**
 * Creates a notification when a QR code is generated for an item
 * @param {string} userId - User ID to notify
 * @param {Object} item - Inventory item data
 * @returns {Promise<string>} Notification ID
 */
export const createQrGeneratedNotification = async (userId, item) => {
  return await createNotification(userId, {
    title: 'QR Code Generated',
    message: `A QR code has been generated for "${item.name || item.id}".`,
    type: 'qr_generated',
    relatedItemId: item.id,
  });
};

/**
 * Creates a custom notification for a user
 * @param {string} userId - User ID to notify
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type
 * @param {string} relatedItemId - Optional related item ID
 * @returns {Promise<string>} Notification ID
 */
export const createCustomNotification = async (
  userId,
  title,
  message,
  type = 'info',
  relatedItemId = null
) => {
  return await createNotification(userId, {
    title,
    message,
    type,
    ...(relatedItemId ? { relatedItemId } : {}),
  });
};
