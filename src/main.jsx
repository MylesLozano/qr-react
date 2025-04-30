import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import App from "./App";
import "./index.css";

// Constants
const ROOT_ELEMENT_ID = "root";

/**
 * Error boundary for the root application
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} The error boundary component
 */
function RootErrorBoundary({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      {children}
    </div>
  );
}

// Initialize the application
const initializeApp = () => {
  const rootElement = document.getElementById(ROOT_ELEMENT_ID);

  if (!rootElement) {
    console.error(`Root element with id "${ROOT_ELEMENT_ID}" not found`);
    return;
  }

  try {
    const root = ReactDOM.createRoot(rootElement);

    root.render(
      <React.StrictMode>
        <RootErrorBoundary>
          <Router>
            <AuthProvider>
              <App />
            </AuthProvider>
          </Router>
        </RootErrorBoundary>
      </React.StrictMode>
    );

    // Log successful initialization
    console.log("Application initialized successfully");
  } catch (error) {
    console.error("Failed to initialize application:", error);
    // Fallback UI for initialization errors
    rootElement.innerHTML = `
      <div class="min-h-screen flex items-center justify-center bg-gray-100">
        <div class="text-center p-8 bg-white rounded-lg shadow-lg">
          <h1 class="text-2xl font-bold text-red-600 mb-4">Application Error</h1>
          <p class="text-gray-600">Failed to initialize the application. Please try refreshing the page.</p>
          <button 
            onclick="window.location.reload()" 
            class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Refresh Page
          </button>
        </div>
      </div>
    `;
  }
};

// Initialize the application
initializeApp();
