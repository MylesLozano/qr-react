import React from 'react';
import PropTypes from 'prop-types';

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12'
};

function LoadingSpinner({ 
  size = 'md', 
  fullScreen = false, 
  className = '', 
  text = 'Loading...',
  showText = true
}) {
  // Validate size prop
  const validSize = sizeClasses[size] ? size : 'md';
  const containerClasses = `${fullScreen ? 'min-h-screen flex items-center justify-center' : ''} ${className}`;
  const spinnerClasses = `${sizeClasses[validSize]} border-3 inline-block rounded-full animate-spin relative`;
  
  const spinnerContent = (
    <div role="status" className={spinnerClasses}>
      <div 
        className="absolute inset-0 rounded-full border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent"
        aria-hidden="true"
      />
      <span className="sr-only">Loading</span>
    </div>
  );

  if (!showText) {
    return (
      <div data-testid="loading-container" className={containerClasses}>
        {spinnerContent}
      </div>
    );
  }

  return (
    <div data-testid="loading-container" className={containerClasses}>
      <div className="flex items-center gap-2">
        {spinnerContent}
        {text && (
          <span 
            className="ml-2 text-sm" 
            aria-live="polite"
          >
            {text}
          </span>
        )}
      </div>
    </div>
  );
}

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  fullScreen: PropTypes.bool,
  className: PropTypes.string,
  text: PropTypes.string,
  showText: PropTypes.bool
};

export default LoadingSpinner;