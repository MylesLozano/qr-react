import React from "react";
import { auth, logAudit } from "./firebase";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import usePageTitle from "./usePageTitle";

function Home() {

  usePageTitle("QCheckCITE - Dashboard");

  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logAudit(auth.currentUser.email, "Signed out");
      await auth.signOut();
      toast.info("You have been logged out.");
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Logout failed. Please try again.");
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