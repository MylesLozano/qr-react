import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '../hooks/useTheme';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    this.setState({
      errorInfo: errorInfo
    });

    // Here you could send to an error reporting service
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService(error, errorInfo) {
    // Implementation would depend on your error reporting service
    console.error('Error logged:', {
      error: error,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString()
    });
  }

  handleRefresh = () => {
    window.location.reload();
  };

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false, 
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  render() {
    const { hasError, error, retryCount } = this.state;
    const { children, errorMessage, maxRetries = 3 } = this.props;

    if (!hasError) return children;

    return (
      <ErrorUI 
        error={error}
        customMessage={errorMessage}
        onRefresh={this.handleRefresh}
        onRetry={retryCount >= maxRetries ? undefined : this.handleRetry}
        retryCount={retryCount}
        maxRetries={maxRetries}
      />
    );
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  errorMessage: PropTypes.string,
  maxRetries: PropTypes.number
};

const ErrorUI = ({ 
  error, 
  customMessage, 
  onRefresh, 
  onRetry,
  retryCount,
  maxRetries
}) => {
  const { isDarkMode } = useTheme();
  
  return (
    <div className={`fixed inset-0 overflow-y-auto flex min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'} p-4`}>
      <div className={`relative m-auto flex w-full max-w-lg flex-col items-center rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 text-center shadow-xl`}>
        <div className={`mb-4 rounded-full ${isDarkMode ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-500'} p-3`} aria-hidden="true">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`} role="alert">
          Something went wrong
        </h2>
        
        {customMessage ? (
          <p className={`mb-6 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {customMessage}
          </p>
        ) : (
          <>
            <p className={`mb-6 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              We're sorry, but something went wrong. Our team has been notified.
            </p>
            {error && (
              <p className={`mb-6 text-sm ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                Error: {error.message}
              </p>
            )}
          </>
        )}
        
        <div className="space-y-3 w-full">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className={`
                w-full rounded font-medium px-4 py-2 transition-colors
                ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'}
                text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              `}
            >
              Try Again {retryCount > 0 ? `(${retryCount}/${maxRetries})` : ''}
            </button>
          )}
          <button
            type="button"
            onClick={onRefresh}
            className={`
              w-full rounded font-medium px-4 py-2 transition-colors
              ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}
              focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
            `}
          >
            Refresh Page
          </button>
        </div>
      </div>
    </div>
  );
};

ErrorUI.propTypes = {
  error: PropTypes.object,
  customMessage: PropTypes.string,
  onRefresh: PropTypes.func.isRequired,
  onRetry: PropTypes.func,
  retryCount: PropTypes.number,
  maxRetries: PropTypes.number
};

export default ErrorBoundary;