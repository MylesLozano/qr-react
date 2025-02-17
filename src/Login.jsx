import React from "react";
import { useNavigate } from "react-router-dom";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "./firebase";

function Login() {
  const navigate = useNavigate();
  
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user.email.endsWith("@jmc.edu.ph")) {
        navigate("/home");
      } else {
        alert("Only @jmc.edu.ph accounts are allowed.");
        auth.signOut();
      }
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  return (
    <div className="container">
      <h2>Welcome to QCheckCITE!</h2>
      <h3>Please Sign in to get started</h3>
      <button onClick={handleGoogleSignIn}>Sign in with your JMC Account</button>
    </div>
  );
}

export default Login;