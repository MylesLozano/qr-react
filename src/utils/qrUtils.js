/**
 * QR Code Utility Functions
 *
 * This module provides utility functions specifically for QR code operations
 * including validation, parsing, and error handling.
 */

/**
 * Validates if a string is a valid QCheckCITE QR code format
 * @param {string} qrString - The QR string to validate
 * @returns {boolean} - Whether the string is a valid QCheckCITE QR code
 */
export const isValidQrString = (qrString) => {
  if (!qrString || typeof qrString !== 'string') return false;

  // Check for the expected format: QCCITE-{itemId}-{timestamp}
  return /^QCCITE-[a-zA-Z0-9]+-\d+$/.test(qrString);
};

/**
 * Extracts the item ID from a QR code string
 * @param {string} qrString - The QR string to parse
 * @returns {string|null} - The extracted item ID or null if invalid
 */
export const extractItemIdFromQrString = (qrString) => {
  if (!isValidQrString(qrString)) return null;

  // Extract the middle part (item ID) from the QR string
  const parts = qrString.split('-');
  if (parts.length >= 3) {
    return parts[1];
  }

  return null;
};

/**
 * Generates a unique QR string for an item
 * @param {string} itemId - The unique identifier for the item
 * @returns {string} - A QR string in the format QCCITE-{itemId}-{timestamp}
 */
export const generateQrString = (itemId) => {
  if (!itemId) throw new Error('Item ID is required to generate QR string');
  return `QCCITE-${itemId}-${Date.now()}`;
};

/**
 * Attempts to parse data from a QR code scan result
 * @param {string} scanResult - The raw scan result from QR scanner
 * @returns {object} - Parsed information with format type and extracted data
 */
export const parseQrScanResult = (scanResult) => {
  if (!scanResult) {
    return {
      valid: false,
      type: 'invalid',
      error: 'Empty scan result',
    };
  }

  // Try parsing as a QCheckCITE QR string first
  if (isValidQrString(scanResult)) {
    const itemId = extractItemIdFromQrString(scanResult);
    return {
      valid: true,
      type: 'qrstring',
      itemId,
      raw: scanResult,
    };
  }

  // Try parsing as JSON for backwards compatibility
  try {
    const data = JSON.parse(scanResult);
    if (data && data.id) {
      return {
        valid: true,
        type: 'legacy-json',
        itemId: data.id,
        data,
        raw: scanResult,
      };
    } else {
      return {
        valid: false,
        type: 'invalid-json',
        error: 'JSON found but missing required item ID',
        raw: scanResult,
      };
    }
  } catch {
    // Not JSON format - catch block without parameters
    return {
      valid: false,
      type: 'unknown',
      error: 'Not a valid QCheckCITE QR code format',
      raw: scanResult,
    };
  }
};

/**
 * Creates canvas from QR code SVG for downloading or exporting
 * @param {SVGElement} svgElement - The QR SVG element reference
 * @param {number} size - The size of the QR code
 * @param {boolean} isDarkMode - Whether dark mode is active
 * @param {object} metadata - Additional metadata to include in the QR image
 * @returns {Promise<HTMLCanvasElement>} - The canvas with rendered QR code
 */
export const createQrCanvas = async (svgElement, size, isDarkMode, metadata = {}) => {
  if (!svgElement) {
    throw new Error('QR code SVG element is missing');
  }

  const padding = 20;
  const itemInfo = metadata.itemName
    ? `${metadata.itemName.substring(0, 30)}${metadata.itemName.length > 30 ? '...' : ''}`
    : '';

  // Create a serialized SVG string
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);

  // Create canvas with padding and space for text
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Calculate total height including text area if we have item info
  const textAreaHeight = itemInfo ? 40 : 0;
  const labAreaHeight = metadata.lab ? 20 : 0;
  const idAreaHeight = metadata.itemId ? 20 : 0;

  // Set canvas dimensions
  canvas.width = size + padding * 2;
  canvas.height = size + padding * 2 + textAreaHeight + labAreaHeight + idAreaHeight;

  // Fill background
  ctx.fillStyle = isDarkMode ? '#1F2937' : '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Create a blob from the SVG string
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const URL = window.URL || window.webkitURL || window;
  const svgUrl = URL.createObjectURL(svgBlob);

  // Load the SVG into an image
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = svgUrl;
  });

  // Draw the QR code with padding
  ctx.drawImage(img, padding, padding, size, size);
  URL.revokeObjectURL(svgUrl);

  // Add item info text if available
  if (itemInfo) {
    ctx.fillStyle = isDarkMode ? '#FFFFFF' : '#000000';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(itemInfo, canvas.width / 2, size + padding * 1.5);

    // Add lab info if available
    if (metadata.lab) {
      ctx.font = '12px Arial';
      ctx.fillText(`Lab: ${metadata.lab}`, canvas.width / 2, size + padding * 2);
    }

    // Add item ID if available
    if (metadata.itemId) {
      ctx.font = '10px Arial';
      ctx.fillText(`ID: ${metadata.itemId}`, canvas.width / 2, size + padding * 2.5);
    }
  }

  return canvas;
};

/**
 * Generates error messages for QR code operations
 * @param {string} operation - The operation that caused the error
 * @param {Error} error - The error object
 * @returns {string} - Formatted user-friendly error message
 */
export const getQrErrorMessage = (operation, error) => {
  const defaultMessages = {
    generate: 'Failed to generate QR code',
    save: 'Failed to save QR code',
    download: 'Failed to download QR code',
    scan: 'Failed to scan QR code',
    export: 'Failed to export QR codes',
    permission: "You don't have permission to perform this operation",
  };

  // Get the operation message or default to generic error
  const baseMessage = defaultMessages[operation] || 'Error with QR code operation';

  // Add specific error message if available
  if (error && error.message) {
    return `${baseMessage}: ${error.message}`;
  }

  return baseMessage;
};
