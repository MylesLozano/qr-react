import React from 'react';
import LoadingSpinner from './LoadingSpinner';
import { useTheme } from './ThemeContext';

/**
 * SplashScreen component - Shows while the app is initializing
 * @component
 * @returns {JSX.Element} The rendered SplashScreen component
 */
function SplashScreen() {
    const { isDarkMode } = useTheme();

    return (
        <div className={`fixed inset-0 flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} p-4`}>
            <div className="w-full max-w-md mx-auto">
                <div className="relative">
                    {/* Logo Container with pulsing effect */}
                    <div className="mb-8 px-4 relative">
                        <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-xl animate-pulse"></div>
                        <img
                            src="../assets/QCheckCITE_Logo.png"
                            alt="QCheckCITE Logo"
                            className="relative max-w-[200px] w-full h-auto mx-auto drop-shadow-xl transform transition-transform duration-1000 hover:scale-105"
                        />
                    </div>

                    {/* Loading Indicator */}
                    <div className={`text-center ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                        <div className="flex items-center justify-center space-x-3 mb-4">
                            <LoadingSpinner size="md" />
                            <span className="text-lg font-medium animate-pulse">Loading QCheckCITE</span>
                        </div>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Initializing application...
                        </p>
                    </div>

                    {/* Loading Progress Bar */}
                    <div className="mt-8 px-4">
                        <div className={`h-1 w-full rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                            <div className="h-1 rounded-full bg-blue-500 animate-progressBar" 
                                style={{width: '0%'}}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SplashScreen;