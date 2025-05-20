/**
 * Notification utility functions
 * Helper functions for creating and managing notifications
 */

import { sendNotification } from '../firebase';

/**
 * Creates a notification when a request is approved
 * @param {string} userId - User ID of the requester
 * @param {Object} request - Request data
 * @returns {Promise<string>} Notification ID
 */
export const createRequestApprovedNotification = async (userId, request) => {
  return await sendNotification(
    'Request Approved',
    `Your request for "${request.itemName || request.itemId}" has been approved.`,
    userId
  );
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
  return await sendNotification('Request Denied', message, userId);
};
