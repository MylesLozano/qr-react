export const sanitizeInput = (input) => {
  return input.trim().replace(/[<>]/g, '');
};

export const sanitizeNumber = (number) => {
  return Math.max(0, Math.floor(Number(number)));
};

class DebouncedFunction {
  constructor(func, wait) {
    this.func = func;
    this.wait = wait;
    this.timeoutId = null;
    this.lastArgs = null;
    this.lastThis = null;
    this.lastCallTime = 0;
    this.lastInvokeTime = 0;
    this.leading = false;
    this.maxWait = false;
    this.trailing = true;
  }

  invokeFunc(time) {
    const args = this.lastArgs;
    const thisArg = this.lastThis;

    this.lastArgs = this.lastThis = null;
    this.lastInvokeTime = time;
    return this.func.apply(thisArg, args);
  }

  startTimer(pendingFunc, wait) {
    clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(pendingFunc, wait);
  }

  shouldInvoke(time) {
    const timeSinceLastCall = time - this.lastCallTime;
    const timeSinceLastInvoke = time - this.lastInvokeTime;

    return (
      this.lastCallTime === 0 ||
      timeSinceLastCall >= this.wait ||
      timeSinceLastCall < 0 ||
      (this.maxWait && timeSinceLastInvoke >= this.maxWait)
    );
  }

  trailingEdge(time) {
    this.timeoutId = null;
    if (this.trailing && this.lastArgs) {
      return this.invokeFunc(time);
    }
    this.lastArgs = this.lastThis = null;
    return undefined;
  }

  timerExpired() {
    const time = Date.now();
    if (this.shouldInvoke(time)) {
      return this.trailingEdge(time);
    }
    this.startTimer(() => this.timerExpired(), this.wait - (time - this.lastCallTime));
  }

  cancel() {
    clearTimeout(this.timeoutId);
    this.lastInvokeTime = 0;
    this.lastArgs = this.lastCallTime = this.lastThis = this.timeoutId = null;
  }

  flush() {
    return this.timeoutId === null ? undefined : this.trailingEdge(Date.now());
  }

  call(...args) {
    const time = Date.now();
    const isInvoking = this.shouldInvoke(time);

    this.lastArgs = args;
    this.lastThis = this;
    this.lastCallTime = time;

    if (isInvoking) {
      if (this.timeoutId === null) {
        this.lastInvokeTime = time;
        this.startTimer(() => this.timerExpired(), this.wait);
        return this.leading ? this.invokeFunc(time) : undefined;
      }
      if (this.maxWait) {
        this.startTimer(() => this.timerExpired(), this.wait);
        return this.invokeFunc(time);
      }
    }
    if (this.timeoutId === null) {
      this.startTimer(() => this.timerExpired(), this.wait);
    }
    return undefined;
  }
}

export const debounce = (func, wait) => {
  const debounced = new DebouncedFunction(func, wait);
  return (...args) => debounced.call(...args);
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