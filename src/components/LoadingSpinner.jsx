import React from 'react';

function LoadingSpinner({ size = 'md', fullScreen = false }) {
    const sizeClasses = {
        sm: 'w-4 h-4 border-2',
        md: 'w-8 h-8 border-3',
        lg: 'w-12 h-12 border-4',
        xl: 'w-16 h-16 border-4'
    };

    const spinner = (
        <div 
            className={`${sizeClasses[size]} inline-block rounded-full animate-spin relative`}
            role="status"
            aria-label="Loading"
        >
            <div className="absolute inset-0 rounded-full border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent" style={{ borderWidth: 'inherit' }}></div>
            <span className="sr-only">Loading...</span>
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" role="dialog" aria-modal="true">
                {spinner}
            </div>
        );
    }

    return spinner;
}

export default LoadingSpinner;