import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import LoadingSpinner from './LoadingSpinner';
import { useTheme } from '../hooks/useTheme';
import { getThemeStyles } from '../utils/themeUtils';

function SplashScreen({ minDuration = 2000 }) {
    const { isDarkMode } = useTheme();
    const [progress, setProgress] = useState(0);
    const [showSpinner, setShowSpinner] = useState(true);

    // Theme-based styles
    const styles = {
        background: getThemeStyles(isDarkMode, {
            dark: 'bg-gray-900',
            light: 'bg-gray-50'
        }),
        text: getThemeStyles(isDarkMode, {
            dark: 'text-gray-200',
            light: 'text-gray-900'
        }),
        subtext: getThemeStyles(isDarkMode, {
            dark: 'text-gray-400',
            light: 'text-gray-500'
        }),
        progressBg: getThemeStyles(isDarkMode, {
            dark: 'bg-gray-700',
            light: 'bg-gray-200'
        }),
        progressBar: getThemeStyles(isDarkMode, {
            dark: 'bg-blue-500/80',
            light: 'bg-blue-500'
        })
    };

    // Handle progress animation
    useEffect(() => {
        const startTime = Date.now();
        let animationFrame;
        let progressInterval;

        const updateProgress = () => {
            const elapsed = Date.now() - startTime;
            const newProgress = Math.min((elapsed / minDuration) * 100, 100);
            setProgress(newProgress);

            if (newProgress < 100) {
                animationFrame = requestAnimationFrame(updateProgress);
            } else {
                setShowSpinner(false);
            }
        };

        // Start progress animation
        animationFrame = requestAnimationFrame(updateProgress);

        // Cleanup
        return () => {
            cancelAnimationFrame(animationFrame);
            if (progressInterval) clearInterval(progressInterval);
        };
    }, [minDuration]);

    return (
        <div 
            className={`fixed inset-0 flex items-center justify-center ${styles.background} p-4 transition-colors duration-300`}
            role="status"
            aria-label="Loading application"
        >
            <div className="w-full max-w-md mx-auto">
                <div className="relative">
                    {/* Logo Container with enhanced animation */}
                    <div className="mb-8 px-4 relative">
                        <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-xl animate-pulse" />
                        <img
                            src="/assets/QCheckCITE_Logo.png"
                            alt="QCheckCITE Logo"
                            className="relative max-w-[200px] w-full h-auto mx-auto drop-shadow-xl transform transition-all duration-1000 hover:scale-105"
                        />
                    </div>

                    {/* Loading Indicator with Progress */}
                    <div className={`text-center ${styles.text}`}>
                        <div className="flex items-center justify-center space-x-3 mb-4">
                            {showSpinner && <LoadingSpinner size="md" />}
                            <span className="text-lg font-medium animate-pulse">
                                Loading QCheckCITE
                            </span>
                        </div>
                        <p className={styles.subtext}>
                            {progress < 100 ? 'Initializing application...' : 'Ready!'}
                        </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-8 px-4">
                        <div className={`h-1 w-full rounded-full ${styles.progressBg}`}>
                            <div 
                                className={`h-1 rounded-full transition-all duration-300 ease-out ${styles.progressBar}`}
                                style={{ width: `${progress}%` }}
                                role="progressbar"
                                aria-valuemin="0"
                                aria-valuemax="100"
                                aria-valuenow={Math.round(progress)}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

SplashScreen.propTypes = {
    minDuration: PropTypes.number
};

export default SplashScreen;