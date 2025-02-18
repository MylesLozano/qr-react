import React, { useState, useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import ProtectedRoute from "./ProtectedRoute";
import { auth, getUserRole } from "./firebase";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Lazy load heavy components
const AdminDashboard = lazy(() => import("./dashboard/AdminDashboard"));
const UserDashboard = lazy(() => import("./dashboard/UserDashboard"));

function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser && currentUser.email.endsWith("@jmc.edu.ph")) {
        setUser(currentUser);
        const userRole = await getUserRole(currentUser.uid);
        console.log("Retrieved role:", userRole); // 🛠 Debugging line
        setRole(userRole);
      } else {
        setUser(null);
        setRole(null);
      }
    });
  
    return () => unsubscribe();
  }, []);

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute isAuthenticated={user && role === "admin"}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-dashboard"
            element={
              <ProtectedRoute isAuthenticated={user && role === "user"}>
                <UserDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
