/**
 * Utility functions for inventory management
 *
 * @module inventoryUtils
 * @description A collection of utility functions for handling inventory data,
 * including sanitization, validation, formatting, and statistical calculations.
 */

/**
 * Sanitizes text input to prevent XSS attacks
 * @function sanitizeInput
 * @param {string} input - User input to be sanitized
 * @return {string} Sanitized string with HTML entities escaped
 * @example
 * const safeName = sanitizeInput("<script>alert('XSS')</script>");
 * // Returns: "&lt;script&gt;alert('XSS')&lt;/script&gt;"
 */
export const sanitizeInput = (input) => {
  if (!input) return '';
  return String(input)
    .trim()
    .replace(/[<>]/g, (match) => (match === '<' ? '&lt;' : '&gt;'));
};

/**
 * Sanitizes numeric input
 * @function sanitizeNumber
 * @param {string|number} input - Numeric input
 * @return {number} Sanitized number or 0 if invalid
 * @example
 * const safeQuantity = sanitizeNumber("10a");
 * // Returns: 0
 */
export const sanitizeNumber = (input) => {
  const num = Number(input);
  return isNaN(num) ? 0 : Math.max(0, num);
};

/**
 * Parses date strings with formats like "Jan. 2022" or "Jan. 12 2022"
 * @param {string} dateStr - Date string to parse
 * @return {string} ISO date string or null if parsing fails
 */
export const parseAbbreviatedDate = (dateStr) => {
  if (!dateStr) return null;

  // Trim and standardize the input
  const cleanStr = String(dateStr).trim();
  if (!cleanStr) return null;

  // Month abbreviations
  const monthAbbr = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  };

  try {
    // Pattern 1: MonthAbbr. Year (e.g., "Jan. 2022")
    const pattern1 = /^([a-z]{3})\.?\s+(\d{4})$/i;

    // Pattern 2: MonthAbbr. Day Year (e.g., "Jan. 12 2022")
    const pattern2 = /^([a-z]{3})\.?\s+(\d{1,2})\s+(\d{4})$/i;

    let match = cleanStr.match(pattern1);
    if (match) {
      const [, monthStr, yearStr] = match;
      const month = monthAbbr[monthStr.toLowerCase()];

      if (month === undefined) return null;

      const year = parseInt(yearStr, 10);
      // Create date - day defaults to 1st of month
      const date = new Date(year, month, 1);
      return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    }

    match = cleanStr.match(pattern2);
    if (match) {
      const [, monthStr, dayStr, yearStr] = match;
      const month = monthAbbr[monthStr.toLowerCase()];

      if (month === undefined) return null;

      const day = parseInt(dayStr, 10);
      const year = parseInt(yearStr, 10);

      // Validate day
      if (day < 1 || day > 31) return null;

      const date = new Date(year, month, day);
      return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    }

    // If no pattern matches, try standard date parsing as fallback
    const fallbackDate = new Date(cleanStr);
    if (!isNaN(fallbackDate.getTime())) {
      return fallbackDate.toISOString().split('T')[0];
    }

    return null;
  } catch (error) {
    console.warn('Date parsing error:', error);
    return null;
  }
};

/**
 * Implements debounce pattern for search inputs
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @return {Function} Debounced function
 */
export const debounce = (func, delay = 300) => {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
};

/**
 * Saves search term to local storage
 * @param {string} searchTerm - Term to save to history
 */
export const saveSearchHistory = (searchTerm) => {
  if (!searchTerm.trim()) return;

  try {
    const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    // Add the new term and remove duplicates
    const updatedHistory = [searchTerm, ...history.filter((term) => term !== searchTerm)].slice(
      0,
      10
    ); // Keep only the 10 most recent searches
    localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Error saving search history:', error);
  }
};

/**
 * Saves a search configuration to local storage
 * @param {string} name - Name of the saved search
 * @param {Object} searchConfig - Search configuration to save
 */
export const saveSearch = (name, searchConfig) => {
  if (!name.trim()) return;

  try {
    const savedSearches = JSON.parse(localStorage.getItem('savedSearches') || '[]');
    const newSearch = { name, config: searchConfig, timestamp: Date.now() };

    // Remove existing search with the same name if it exists
    const updatedSearches = savedSearches.filter((search) => search.name !== name);
    updatedSearches.unshift(newSearch); // Add new search at the beginning

    localStorage.setItem('savedSearches', JSON.stringify(updatedSearches));
    return true;
  } catch (error) {
    console.error('Error saving search:', error);
    return false;
  }
};

/**
 * Gets saved searches from local storage
 * @return {Array} Array of saved searches or empty array if none exist
 */
export const getSavedSearches = () => {
  try {
    const searches = JSON.parse(localStorage.getItem('savedSearches') || '[]');
    return Array.isArray(searches) ? searches : [];
  } catch {
    return [];
  }
};

/**
 * Validates an inventory item
 * @param {Object} item - Item to validate
 * @return {Object} Object containing validation errors if any
 */
export const validateItem = (item) => {
  const errors = {};

  if (!item.name || item.name.trim() === '') {
    errors.name = 'Item name is required';
  }

  if (!item.category || item.category.trim() === '') {
    errors.category = 'Category is required';
  }

  if (item.quantity === undefined || item.quantity < 0) {
    errors.quantity = 'Quantity must be 0 or greater';
  }

  return errors;
};

/**
 * Calculates QR code statistics for inventory items
 * @param {Array} items - Array of inventory items
 * @return {Object} Object containing QR code statistics
 */
export const calculateQrStats = (items) => {
  if (!items || !Array.isArray(items)) {
    return {
      totalWithQr: 0,
      totalWithoutQr: 0,
      lastGenerated: null,
    };
  }

  const stats = items.reduce(
    (acc, item) => {
      if (item.hasQR) {
        acc.totalWithQr++;

        const generatedDate = item.lastQRGenerated?.toDate();
        if (generatedDate && (!acc.lastGenerated || generatedDate > acc.lastGenerated)) {
          acc.lastGenerated = generatedDate;
        }
      } else {
        acc.totalWithoutQr++;
      }
      return acc;
    },
    {
      totalWithQr: 0,
      totalWithoutQr: 0,
      lastGenerated: null,
    }
  );

  return stats;
};

/**
 * Groups inventory items by category
 * @param {Array} items - Array of inventory items
 * @return {Object} Object with categories as keys and items/stats as values
 */
export const groupByCategory = (items) => {
  if (!items || !Array.isArray(items)) return {};

  return items.reduce((groups, item) => {
    const category = item.category || 'Uncategorized';

    if (!groups[category]) {
      groups[category] = {
        items: [],
        totalQuantity: 0,
        totalValue: 0,
        conditions: {},
      };
    }

    groups[category].items.push(item);
    groups[category].totalQuantity += sanitizeNumber(item.quantity);

    // Track item conditions for statistics
    const condition = item.itemCondition || 'Unknown';
    groups[category].conditions[condition] = (groups[category].conditions[condition] || 0) + 1;

    return groups;
  }, {});
};

/**
 * Formats inventory items for export (CSV, PDF, etc.)
 * @param {Array} items - Array of inventory items
 * @return {Array} Formatted items array for export
 */
export const formatItemsForExport = (items) => {
  if (!items || !Array.isArray(items)) return [];

  return items.map((item) => ({
    unitNumber: item.unitNumber || '',
    name: item.name || '',
    brand: item.brand || '',
    serialNumber: item.serialNumber || '',
    dateAcquired: item.dateAcquired || '',
    quantity: item.quantity || 0,
    category: item.category || '',
    lab: item.lab || '',
    itemCondition: item.itemCondition || '',
    description: item.description || '',
    remarks: item.remarks || '',
    hasQR: item.hasQR ? 'Yes' : 'No',
    lastQRGenerated: item.lastQRGenerated
      ? new Date(item.lastQRGenerated.toDate()).toLocaleString()
      : '',
    lastUpdated: item.updatedAt ? new Date(item.updatedAt.toDate()).toLocaleString() : '',
  }));
};

/**
 * Prepares CSV data for bulk upload
 * @param {Array} csvData - Array of parsed CSV data
 * @return {Array} Sanitized and validated data
 */
export const prepareBulkUploadData = (csvData) => {
  if (!csvData || !Array.isArray(csvData)) return [];
  return csvData
    .map((row) => {
      // Map CSV columns to our schema
      return {
        unitNumber: sanitizeInput(row.unitNumber || row.unitNum || row.unit_number || row['unit number'] || ''),
        name: sanitizeInput(row.name || ''),
        brand: sanitizeInput(row.brand || ''),
        serialNumber: sanitizeInput(row.serialNum || row.serialNumber) || 'N/A',
        dateAcquired:
          row.dateAcquired || row.dateAcqui
            ? parseAbbreviatedDate(row.dateAcquired || row.dateAcqui)
            : null,
        quantity: sanitizeNumber(row.quantity || 0),
        category: sanitizeInput(row.category || ''),
        lab: sanitizeInput(row.lab || ''),
        itemCondition: sanitizeInput(row.condition || row.itemCondition || 'New'),
        description: sanitizeInput(row.description || ''),
        remarks: sanitizeInput(row.remarks || ''),
        uniqueQR: false,
      };
    })
    .filter((item) => {
      // Filter out items missing required fields
      return item.name && item.category;
    });
};

/**
 * Gets CSV template headers for inventory data
 * @return {Array} Array of column headers
 */
export const getCSVTemplateHeaders = () => {
  return [
    'unitNumber',
    'name',
    'brand',
    'serialNumber',
    'dateAcquired',
    'quantity',
    'category',
    'lab',
    'itemCondition',
    'description',
    'remarks',
  ];
};

/**
 * Determines color code for inventory stock status
 * @param {number} quantity - Item quantity
 * @return {string} CSS class name for appropriate color
 */
export const stockStatusColor = (qty) => {
  if (qty <= 0) return 'text-red-500';
  if (qty <= 5) return 'text-yellow-500';
  return 'text-green-500';
};
