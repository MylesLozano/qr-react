import React from "react";
import { auth, logAudit } from "../firebase";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

function UserDashboard() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logAudit(auth.currentUser.email, "Signed out");
    await auth.signOut();
    toast.info("You have been logged out.");
    navigate("/login");
  };

  return (
    <div className="container">
      <h1>User Dashboard</h1>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default UserDashboard;
