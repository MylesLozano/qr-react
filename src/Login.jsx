import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db, getUserRole, logAudit } from "./firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import usePageTitle from "./usePageTitle";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function Login() {
  usePageTitle("QCheckCITE - Login");
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email.endsWith("@jmc.edu.ph")) {
        const role = await getUserRole(user.uid);
        navigate(role === "admin" ? "/admin-dashboard" : "/user-dashboard");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (!user.email.endsWith("@jmc.edu.ph")) {
        toast.error("Only @jmc.edu.ph accounts are allowed.");
        await signOut(auth);
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      let role = "user";

      if (!userSnap.exists()) {
        await setDoc(userRef, { 
          email: user.email, 
          role: "user", 
          createdAt: serverTimestamp()});
      } else {
        role = userSnap.data().role;
      }

      await logAudit(user.email, "Signed in");
      toast.success(`Login successful! Welcome, ${role}! 🎉`);
      navigate(role === "admin" ? "/admin-dashboard" : "/user-dashboard");
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