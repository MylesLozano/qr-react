import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '../hooks/useTheme';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import Button from './Button';

function SessionTimeout({ 
  timeoutMinutes = 30,
  warningMinutes = 5,
  onTimeout = () => {},
  onWarning = () => {} 
}) {
  const { isDarkMode } = useTheme();
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Function to format remaining time
  const formatTimeLeft = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Reset timer on user activity
  const resetTimer = useCallback(() => {
    setLastActivity(Date.now());
    setShowWarning(false);
  }, []);

  // Handle session timeout
  const handleTimeout = useCallback(async () => {
    try {
      await signOut(auth);
      onTimeout();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, [onTimeout]);

  // Monitor user activity
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));

    return () => {
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [resetTimer]);

  // Timer logic
  useEffect(() => {
    const interval = setInterval(() => {
      const timeSinceLastActivity = (Date.now() - lastActivity) / 1000;
      const timeLeftInSeconds = Math.max(0, timeoutMinutes * 60 - timeSinceLastActivity);
      
      setTimeLeft(Math.round(timeLeftInSeconds));

      if (timeLeftInSeconds <= warningMinutes * 60 && !showWarning && timeLeftInSeconds > 0) {
        setShowWarning(true);
        onWarning(Math.round(timeLeftInSeconds));
      }

      if (timeLeftInSeconds <= 0) {
        handleTimeout();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timeoutMinutes, warningMinutes, lastActivity, showWarning, handleTimeout, onWarning]);

  if (!showWarning) return null;

  return (
    <div 
      role="alertdialog"
      aria-labelledby="timeout-title"
      aria-describedby="timeout-description"
      className={`
        fixed bottom-4 right-4 p-4 rounded-lg shadow-lg
        transition-all duration-300 transform
        ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}
        ${timeLeft <= 60 ? 'animate-pulse' : ''}
      `}
    >
      <h3 
        id="timeout-title"
        className="text-lg font-semibold mb-2"
      >
        Session Timeout Warning
      </h3>
      <p 
        id="timeout-description"
        className={`mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
      >
        Your session will expire in {formatTimeLeft(timeLeft)}
      </p>
      <div className="flex gap-2">
        <Button
          onClick={resetTimer}
          color="blue"
          size="sm"
          aria-label="Stay logged in"
        >
          Stay Logged In
        </Button>
        <Button
          onClick={handleTimeout}
          color="gray"
          size="sm"
          aria-label="Log out now"
        >
          Log Out
        </Button>
      </div>
    </div>
  );
}

SessionTimeout.propTypes = {
  timeoutMinutes: PropTypes.number,
  warningMinutes: PropTypes.number,
  onTimeout: PropTypes.func,
  onWarning: PropTypes.func
};

export default SessionTimeout;