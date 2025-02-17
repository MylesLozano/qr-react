import React from "react";
import { auth, logAudit } from "./firebase";
import { useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (auth.currentUser) {
      await logAudit(auth.currentUser.email, "Signed out");
      await auth.signOut();
      navigate("/login");
    }
  };

  return (
    <div className="container">
      <h1 className="text-center text-2xl">Welcome to Home Page</h1>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default Home;
