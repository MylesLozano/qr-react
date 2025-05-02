import React from 'react';
import LoadingSpinner from './LoadingSpinner';

/**
 * SplashScreen component - Shows while the app is initializing
 * @component
 * @returns {JSX.Element} The rendered SplashScreen component
 */
function SplashScreen() {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-50 text-gray-900">
            <div className="text-center">
                <div className="mb-8">
                    <img
                        src="../assets/QCheckCITE_Logo.png"
                        alt="QCheckCITE Logo"
                        className="w-48 h-auto mx-auto animate-pulse"
                    />
                </div>
                <div className="flex items-center justify-center space-x-2">
                    <LoadingSpinner size="large" />
                    <span className="text-lg font-medium">Loading QCheckCITE...</span>
                </div>
                <div className="mt-4 text-sm text-gray-500">
                    Please wait while we initialize the application
                </div>
            </div>
        </div>
    );
}

export default SplashScreen; 