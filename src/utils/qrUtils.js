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
export const createQrCanvas = async (
  _svgElement, // This parameter is not directly used for QR content here
  size,
  isDarkMode,
  textDetails = {}
) => {
  const canvas = document.createElement('canvas');
  // Initial height, will be adjusted if more text lines are added
  canvas.width = size;
  canvas.height = size + 100; // Increased initial estimate for more text lines

  const ctx = canvas.getContext('2d');

  // Background for the entire canvas
  ctx.fillStyle = isDarkMode ? '#2D3748' : '#FFFFFF'; // e.g., gray-800 or white
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const qrStringForCanvas =
    textDetails.qrString ||
    generateQrString(textDetails.itemId || textDetails.id || 'default_id_for_qr');

  const qrOptions = {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    width: size,
    margin: 1,
    color: {
      dark: isDarkMode ? '#FFFFFF' : '#000000',
      light: isDarkMode ? '#2D3748' : '#FFFFFF',
    },
  };

  let img; // Declare img here to be accessible in the finalization steps
  try {
    const dataUrl = await QRCode.toDataURL(qrStringForCanvas, qrOptions);
    img = new Image(); // Assign to the outer scope variable
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = (err) => {
        console.error('Image load error for QR Data URL:', err);
        reject(err);
      };
      img.src = dataUrl;
    });
    ctx.drawImage(img, 0, 0, size, size);
  } catch (err) {
    console.error('Failed to generate QR code image:', err);
    ctx.fillStyle = isDarkMode ? '#FFFFFF' : '#000000';
    ctx.textAlign = 'center';
    ctx.font = '16px Arial';
    ctx.fillText('Error QR', size / 2, size / 2);
  }

  // Add text below QR code
  ctx.fillStyle = isDarkMode ? '#FFFFFF' : '#000000';
  ctx.font = '14px Arial'; // Slightly smaller font for more text
  ctx.textAlign = 'center';
  let textY = size + 25; // Starting Y for text below QR
  const lineHeight = 18; // Line height for text

  if (textDetails.itemName) {
    ctx.fillText(textDetails.itemName, canvas.width / 2, textY);
    textY += lineHeight;
  }
  if (textDetails.unit) {
    ctx.fillText(`Unit: ${textDetails.unit || 'N/A'}`, canvas.width / 2, textY);
    textY += lineHeight;
  }
  if (textDetails.category) {
    ctx.fillText(`Category: ${textDetails.category || 'N/A'}`, canvas.width / 2, textY);
    textY += lineHeight;
  }
  if (textDetails.lab) {
    ctx.fillText(`Lab: ${textDetails.lab || 'N/A'}`, canvas.width / 2, textY);
    textY += lineHeight;
  }

  // Adjust canvas height to fit all text
  const requiredHeight = textY + 5; // Add a little padding at the bottom

  // Create a new canvas with the correct height and redraw everything
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = canvas.width;
  finalCanvas.height = Math.max(size + 10, requiredHeight); // Ensure minimum height for QR + a bit of padding
  const finalCtx = finalCanvas.getContext('2d');

  // Redraw background
  finalCtx.fillStyle = isDarkMode ? '#2D3748' : '#FFFFFF';
  finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

  // Redraw QR code (assuming img is the loaded QR image)
  if (img && img.complete && img.naturalHeight !== 0) {
    finalCtx.drawImage(img, 0, 0, size, size);
  } else {
    // Fallback if img somehow failed or wasn't drawn
    try {
      const dataUrlRetry = await QRCode.toDataURL(qrStringForCanvas, qrOptions);
      const imgRetry = new Image();
      await new Promise((resolve, reject) => {
        imgRetry.onload = resolve;
        imgRetry.onerror = reject;
        imgRetry.src = dataUrlRetry;
      });
      finalCtx.drawImage(imgRetry, 0, 0, size, size);
    } catch (e) {
      finalCtx.fillStyle = isDarkMode ? '#FFFFFF' : '#000000';
      finalCtx.textAlign = 'center';
      finalCtx.font = '16px Arial';
      finalCtx.fillText('Error QR', size / 2, size / 2);
    }
  }

  // Redraw text
  finalCtx.fillStyle = isDarkMode ? '#FFFFFF' : '#000000';
  finalCtx.font = '14px Arial';
  finalCtx.textAlign = 'center';
  textY = size + 25; // Reset Y for new canvas

  if (textDetails.itemName) {
    finalCtx.fillText(textDetails.itemName, finalCanvas.width / 2, textY);
    textY += lineHeight;
  }
  if (textDetails.unit) {
    finalCtx.fillText(`Unit: ${textDetails.unit || 'N/A'}`, finalCanvas.width / 2, textY);
    textY += lineHeight;
  }
  if (textDetails.category) {
    finalCtx.fillText(`Category: ${textDetails.category || 'N/A'}`, finalCanvas.width / 2, textY);
    textY += lineHeight;
  }
  if (textDetails.lab) {
    finalCtx.fillText(`Lab: ${textDetails.lab || 'N/A'}`, finalCanvas.width / 2, textY);
    // textY += lineHeight; // Not needed for the last line
  }
  return finalCanvas;
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
