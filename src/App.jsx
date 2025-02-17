import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import Home from "./Home";
import ProtectedRoute from "./ProtectedRoute";
import { auth } from "./firebase";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    auth.onAuthStateChanged((user) => {
      if (user && user.email.endsWith("@jmc.edu.ph")) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    });
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route 
        path="/home" 
        element={<ProtectedRoute isAuthenticated={isAuthenticated}><Home /></ProtectedRoute>} 
      />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

export default App;