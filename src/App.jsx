import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import Home from "./Home";
import ProtectedRoute from "./ProtectedRoute";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <Routes>
      <Route path="/login" element={<Login onLogin={() => setIsAuthenticated(true)} />} />
      <Route 
        path="/home" 
        element={<ProtectedRoute isAuthenticated={isAuthenticated}><Home /></ProtectedRoute>} 
      />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

export default App;