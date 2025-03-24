import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db, getUserRole, logAudit } from "./firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import usePageTitle from "./hooks/usePageTitle";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function Login() {
  usePageTitle("QCheckCITE - Login");
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email.endsWith("@jmc.edu.ph")) {
        try {
          const role = await getUserRole(user.uid);
          console.log(`✅ User role fetched: ${role}`);

          if (role === "superadmin") {
            navigate("/superadmin-dashboard");
          } else if (role === "admin") {
            navigate("/admin-dashboard");
          } else {
            navigate("/user-dashboard");
          }
        } catch (error) {
          console.error("🚨 Error fetching user role:", error);
        }
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
          createdAt: serverTimestamp(),
        });

        console.log(`✅ Assigned default role 'user' to ${user.email}`);
        await logAudit(user.email, "Assigned role: user (new user)");
      } else {
        role = userSnap.data().role;
        console.log(`ℹ️ Existing user logged in with role: ${role}`);
      }

      await logAudit(user.email, "Signed in");
      toast.success(`Login successful! Welcome, ${role}! 🎉`);

      // Redirect after Firestore operations complete
      if (role === "superadmin") {
        navigate("/superadmin-dashboard");
      } else if (role === "admin") {
        navigate("/admin-dashboard");
      } else {
        navigate("/user-dashboard");
      }
    } catch (error) {
      console.error("🚨 Error signing in with Google:", error);
      toast.error("Login failed. Please try again.");
      await signOut(auth);
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
