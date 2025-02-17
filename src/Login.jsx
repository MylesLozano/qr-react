import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, logAudit } from "./firebase";
import usePageTitle from "./usePageTitle";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function Login() {

  usePageTitle("QCheckCITE - Login");

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email.endsWith("@jmc.edu.ph")) {
        navigate("/home");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user.email.endsWith("@jmc.edu.ph")) {
        await logAudit(result.user.email, "Signed in");
        toast.success("Login successful! Welcome to QCheckCITE 🎉");
        navigate("/home");
      } else {
        alert("Only @jmc.edu.ph accounts are allowed.");
        await signOut(auth);
      }
    } catch (error) {
      console.error("Error signing in with Google:", error);
      toast.error("Login failed. Please try again.");
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
