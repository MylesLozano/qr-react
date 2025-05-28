/**
 * QR Code Utility Functions
 *
 * This module provides utility functions specifically for QR code operations
 * including validation, parsing, and error handling.
 */
import QRCode from 'qrcode';

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
  _svgElement, // Parameter remains for signature consistency, though not used for QR generation
  size,
  isDarkMode,
  textDetails = {}
) => {
  const lineHeight = 18; // Height for each line of text
  const fontSize = 14; // Font size in pixels

  // Determine number of text lines to calculate canvas height
  let numTextLines = 0;
  if (textDetails.itemName) numTextLines++;
  if (textDetails.lab) numTextLines++;
  if (textDetails.itemId) numTextLines++; // For displaying ID
  if (textDetails.unit || textDetails.unitNumber) numTextLines++; // Check for both unit and unitNumber
  if (textDetails.category) numTextLines++;

  const textBlockHeight = numTextLines * lineHeight;
  const PADDING_ABOVE_TEXT = 20; // Space between QR and first line of text
  const PADDING_BELOW_TEXT = 10; // Space after last line of text

  let canvasHeight = size; // Start with QR code's height
  if (numTextLines > 0) {
    canvasHeight += PADDING_ABOVE_TEXT + textBlockHeight + PADDING_BELOW_TEXT;
  } else {
    canvasHeight += 10; // Minimal padding if no text below QR
  }

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = size; // Canvas width is same as QR code width
  finalCanvas.height = canvasHeight;

  const finalCtx = finalCanvas.getContext('2d');

  // 1. Draw background for the entire canvas
  finalCtx.fillStyle = isDarkMode ? '#2D3748' : '#FFFFFF'; // Canvas background
  finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

  // Draw a slightly different colored rectangle for the QR code area to enhance visibility
  finalCtx.fillStyle = isDarkMode ? '#1F2937' : '#F3F4F6';
  finalCtx.fillRect(0, 0, size, size);

  // Add a white background for the actual QR code area (with padding)
  finalCtx.fillStyle = '#FFFFFF';
  const padding = 8;
  finalCtx.fillRect(padding, padding, size - padding * 2, size - padding * 2);

  // 2. Prepare and draw QR Code
  const qrStringForCanvas =
    textDetails.qrString ||
    generateQrString(textDetails.itemId || textDetails.id || 'default_id_for_qr');

  const qrOptions = {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    width: size - 16, // Reduce size to account for margin and make QR code visible
    margin: 2, // Smaller margin for better appearance while maintaining scanability
    color: {
      dark: '#000000', // Always use black for QR modules for maximum contrast
      light: '#FFFFFF', // Always use white for QR background for maximum contrast
    },
  };

  try {
    const dataUrl = await QRCode.toDataURL(qrStringForCanvas, qrOptions);
    const qrImg = new Image();
    await new Promise((resolve, reject) => {
      qrImg.onload = () => {
        // Center the QR code within the area
        const padding = 8;
        finalCtx.drawImage(qrImg, padding, padding, size - padding * 2, size - padding * 2);

        // Add a border around the QR code for better visibility
        finalCtx.strokeStyle = isDarkMode ? '#FFFFFF' : '#000000';
        finalCtx.lineWidth = 2;
        finalCtx.strokeRect(0, 0, size, size);

        resolve();
      };
      qrImg.onerror = (err) => {
        console.error('QR Image load error:', err);
        reject(new Error('Failed to load QR image data'));
      };
      qrImg.src = dataUrl;
    });
  } catch (error) {
    console.error('Failed to generate or draw QR code:', error);
    finalCtx.fillStyle = isDarkMode ? '#FFFFFF' : '#000000';
    finalCtx.textAlign = 'center';
    finalCtx.font = `${fontSize}px Arial`;
    finalCtx.fillText('Error QR', size / 2, size / 2); // In the QR area
  }

  // 3. Draw text details if any text lines exist
  if (numTextLines > 0) {
    finalCtx.fillStyle = isDarkMode ? '#FFFFFF' : '#000000';
    finalCtx.font = `${fontSize}px Arial`;
    finalCtx.textAlign = 'center';

    // Calculate starting baseline for the first line of text
    let currentTextBaselineY = size + PADDING_ABOVE_TEXT + fontSize;

    if (textDetails.itemName) {
      finalCtx.fillText(textDetails.itemName, finalCanvas.width / 2, currentTextBaselineY);
      currentTextBaselineY += lineHeight;
    }
    if (textDetails.lab) {
      finalCtx.fillText(
        `Lab: ${textDetails.lab || 'N/A'}`,
        finalCanvas.width / 2,
        currentTextBaselineY
      );
      currentTextBaselineY += lineHeight;
    }
    if (textDetails.itemId) {
      finalCtx.fillText(`ID: ${textDetails.itemId}`, finalCanvas.width / 2, currentTextBaselineY);
      currentTextBaselineY += lineHeight;
    }
    if (textDetails.unit || textDetails.unitNumber) {
      // Make unit text more prominent
      const unitText = `Unit: ${textDetails.unit || textDetails.unitNumber}`;
      // Use bold font for unit number to make it more visible
      finalCtx.font = `bold ${fontSize}px Arial`;
      finalCtx.fillText(unitText, finalCanvas.width / 2, currentTextBaselineY);
      // Reset font to normal for subsequent text
      finalCtx.font = `${fontSize}px Arial`;
      currentTextBaselineY += lineHeight;
    }
    if (textDetails.category) {
      finalCtx.fillText(
        `Category: ${textDetails.category || 'N/A'}`,
        finalCanvas.width / 2,
        currentTextBaselineY
      );
      // currentTextBaselineY += lineHeight; // No increment for the last line
    }
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
