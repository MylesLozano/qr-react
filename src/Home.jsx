import React from "react";
import { auth, logAudit } from "./firebase";
import { useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();

  const handleLogout = () => {
    logAudit(auth.currentUser.email, "Logout");
    auth.signOut();
    navigate("/login");
  };

  return (
    <div className="container">
      <h1 className="text-center text-2xl">Welcome to Home Page</h1>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default Home;