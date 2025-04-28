import React from 'react';
import { toast } from 'react-toastify';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
        toast.error('An unexpected error occurred. Please try again.');
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100">
                    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
                        <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
                        <p className="text-gray-600 mb-4">
                            We're sorry, but something went wrong. Please try refreshing the page or contact support if the problem persists.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                        >
                            Refresh Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary; 