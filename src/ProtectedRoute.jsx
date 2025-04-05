import React from "react";
import { Navigate } from "react-router-dom";

function ProtectedRoute({ isAuthenticated, isLoading, children }) {
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen text-lg font-medium text-gray-700">
              Loading...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
}

export default ProtectedRoute;
