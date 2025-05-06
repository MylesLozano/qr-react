import React from 'react';
import Button from './Button';
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
                <div className="fixed inset-0 overflow-y-auto flex min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
                    <div className="relative m-auto flex w-full max-w-lg flex-col items-center rounded-lg bg-white dark:bg-gray-800 p-6 text-center shadow-xl">
                        <div className="mb-4 rounded-full bg-red-100 p-3 text-red-500 dark:bg-red-900/50 dark:text-red-400">
                            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Something went wrong</h2>
                        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
                            We're sorry, but something went wrong. Please try refreshing the page or contact support if the problem persists.
                        </p>
                        <div className="space-y-3">
                            <Button
                                onClick={() => window.location.reload()}
                                className="w-full justify-center"
                                color="blue"
                            >
                                Refresh Page
                            </Button>
                            <Button
                                onClick={() => this.setState({ hasError: false, error: null })}
                                className="w-full justify-center"
                                color="gray"
                            >
                                Try Again
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;