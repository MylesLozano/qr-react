export const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
export const INACTIVITY_CHECK_INTERVAL = 1000; // 1 second
export const TIMEOUT_WARNING_THRESHOLD = 5 * 60 * 1000; // 5 minutes

export const getLastActivity = () => {
  const lastActivity = localStorage.getItem("lastActivity");
  return lastActivity ? parseInt(lastActivity, 10) : Date.now();
};

export const updateLastActivity = () => {
  localStorage.setItem("lastActivity", Date.now().toString());
};
