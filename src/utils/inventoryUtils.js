export const sanitizeInput = (input) => {
  return input.trim().replace(/[<>]/g, '');
};

export const sanitizeNumber = (number) => {
  return Math.max(0, Math.floor(Number(number)));
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const saveSearchHistory = (search) => {
  let history;
  try {
    history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    if (!Array.isArray(history)) history = [];
  } catch {
    history = [];
  }
  if (!history.includes(search)) {
    history.unshift(search);
    localStorage.setItem('searchHistory', JSON.stringify(history.slice(0, 10)));
  }
};

export const validateItem = (item) => {
  const errors = {};
  if (!item.name || item.name.length < 2) {
    errors.name = 'Name must be at least 2 characters long';
  }
  if (!item.description || item.description.length < 5) {
    errors.description = 'Description must be at least 5 characters long';
  }
  if (item.quantity < 0) {
    errors.quantity = 'Quantity cannot be negative';
  }
  if (item.price < 0) {
    errors.price = 'Price cannot be negative';
  }
  return errors;
};

export const calculateQrStats = (items) => {
  return items.reduce((acc, item) => {
    if (item.uniqueQR) {
      acc.totalWithQr++;
    } else {
      acc.totalWithoutQr++;
    }
    return acc;
  }, { totalWithQr: 0, totalWithoutQr: 0 });
};

export const groupByCategory = (items) => {
  const groups = {};
  items.forEach(item => {
    const category = item.category || "Uncategorized";
    if (!groups[category]) {
      groups[category] = {
        items: [],
        totalQuantity: 0
      };
    }
    groups[category].items.push(item);
    groups[category].totalQuantity += (parseInt(item.quantity) || 0);
  });
  return groups;
}; 