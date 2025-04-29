import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'react-toastify';

/**
 * SessionTimeout component - Handles session expiration and provides user feedback
 * @component
 * @param {number} timeoutMinutes - Number of minutes before session timeout
 * @param {number} warningMinutes - Number of minutes before showing warning
 * @returns {JSX.Element} The rendered SessionTimeout component
 */
function SessionTimeout({ timeoutMinutes = 30, warningMinutes = 5 }) {
    const navigate = useNavigate();
    const { isDarkMode } = useTheme();
    const [showWarning, setShowWarning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(warningMinutes * 60);

    useEffect(() => {
        let warningTimer;
        let timeoutTimer;

        const resetTimers = () => {
            // Clear existing timers
            if (warningTimer) clearTimeout(warningTimer);
            if (timeoutTimer) clearTimeout(timeoutTimer);

            // Set new timers
            warningTimer = setTimeout(() => {
                setShowWarning(true);
                setTimeLeft(warningMinutes * 60);
            }, (timeoutMinutes - warningMinutes) * 60 * 1000);

            timeoutTimer = setTimeout(() => {
                handleTimeout();
            }, timeoutMinutes * 60 * 1000);
        };

        const handleTimeout = () => {
            auth.signOut();
            toast.info('Your session has expired. Please log in again.');
            navigate('/login');
        };

        // Reset timers on user activity
        const handleUserActivity = () => {
            if (showWarning) {
                setShowWarning(false);
                toast.success('Session extended');
            }
            resetTimers();
        };

        // Add event listeners for user activity
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach(event => {
            window.addEventListener(event, handleUserActivity);
        });

        // Initial timer setup
        resetTimers();

        // Cleanup
        return () => {
            if (warningTimer) clearTimeout(warningTimer);
            if (timeoutTimer) clearTimeout(timeoutTimer);
            events.forEach(event => {
                window.removeEventListener(event, handleUserActivity);
            });
        };
    }, [navigate, timeoutMinutes, warningMinutes, showWarning]);

    useEffect(() => {
        let countdownTimer;
        if (showWarning) {
            countdownTimer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(countdownTimer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (countdownTimer) clearInterval(countdownTimer);
        };
    }, [showWarning]);

    if (!showWarning) return null;

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
        <div className={`fixed inset-0 flex items-center justify-center p-4 transition-colors duration-200 ${isDarkMode ? 'bg-gray-900/80' : 'bg-white/80'
            }`}>
            <div className={`p-6 rounded-xl shadow-lg max-w-md w-full transition-colors duration-200 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                }`}>
                <h2 className="text-xl font-bold mb-4">Session Timeout Warning</h2>
                <p className="mb-4">
                    Your session will expire in {minutes}:{seconds.toString().padStart(2, '0')}.
                    Would you like to extend your session?
                </p>
                <div className="flex justify-end space-x-4">
                    <button
                        onClick={() => {
                            setShowWarning(false);
                            toast.success('Session extended');
                        }}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${isDarkMode
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                            }`}
                    >
                        Extend Session
                    </button>
                    <button
                        onClick={() => {
                            auth.signOut();
                            navigate('/login');
                        }}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${isDarkMode
                                ? 'bg-gray-600 hover:bg-gray-700 text-white'
                                : 'bg-gray-500 hover:bg-gray-600 text-white'
                            }`}
                    >
                        Log Out
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SessionTimeout; 