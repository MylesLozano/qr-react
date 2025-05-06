import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '../context/ThemeContext';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRefresh = () => {
    window.location.reload();
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    const { hasError, error } = this.state;
    const { children, errorMessage } = this.props;

    if (!hasError) return children;

    return (
      <ErrorUI 
        error={error}
        customMessage={errorMessage}
        onRefresh={this.handleRefresh}
        onRetry={this.handleRetry}
      />
    );
  }
}

const ErrorUI = ({ error, customMessage, onRefresh, onRetry }) => {
  const { isDarkMode } = useTheme();
  
  return (
    <div className={`fixed inset-0 overflow-y-auto flex min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'} p-4`}>
      <div className={`relative m-auto flex w-full max-w-lg flex-col items-center rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 text-center shadow-xl`}>
        <div className={`mb-4 rounded-full ${isDarkMode ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-500'} p-3`}>
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        </div>
        
        <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
          Something went wrong
        </h2>
        
        {customMessage ? (
          <p className={`mb-6 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {customMessage}
          </p>
        ) : (
          <>
            <p className={`mb-6 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              We're sorry, but something went wrong. Please try refreshing the page or contact support if the problem persists.
            </p>
            {error && (
              <p className={`mb-6 text-sm ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                {error.message}
              </p>
            )}
          </>
        )}
        
        <div className="space-y-3">
          <button
            type="button"
            onClick={onRefresh}
            className={`
              rounded font-medium transition-colors
              ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'}
              px-4 py-2
              w-full justify-center
            `}
          >
            Refresh Page
          </button>
          <button
            type="button"
            onClick={onRetry}
            className={`
              rounded font-medium transition-colors
              bg-gray-300 hover:bg-gray-400 text-gray-800
              px-4 py-2
              w-full justify-center
            `}
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
};

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  errorMessage: PropTypes.string
};

ErrorUI.propTypes = {
  error: PropTypes.object,
  customMessage: PropTypes.string,
  onRefresh: PropTypes.func.isRequired,
  onRetry: PropTypes.func.isRequired
};

export default ErrorBoundary;