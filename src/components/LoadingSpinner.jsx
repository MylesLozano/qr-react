import React from 'react';

function LoadingSpinner({ size = 'md', fullScreen = false }) {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16'
    };

    const spinner = (
        <div className={`${sizeClasses[size]} border-4 border-blue-200 rounded-full animate-spin`}>
            <div className="w-full h-full border-4 border-blue-500 rounded-full border-t-transparent"></div>
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                {spinner}
            </div>
        );
    }

    return spinner;
}

export default LoadingSpinner; 