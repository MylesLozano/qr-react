import React, { useEffect, useState } from "react";
import logo from './assets/QCheckCITE_Logo.png';
import { useNavigate } from "react-router-dom";
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db, getUserRole, logAudit } from "./firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import usePageTitle from "./hooks/usePageTitle";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTheme } from "./context/ThemeContext";
import LoadingSpinner from "./components/LoadingSpinner";
import ErrorBoundary from "./components/ErrorBoundary";

/**
 * Login component - Handles user authentication
 * @component
 * @returns {JSX.Element} The rendered Login component
 */
function Login() {
  usePageTitle("QCheckCITE - Login");
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email.endsWith("@jmc.edu.ph")) {
        try {
          setIsLoading(true);
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
          setError("Failed to fetch user role");
          toast.error("Failed to fetch user role");
        } finally {
          setIsLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (!user.email.endsWith("@jmc.edu.ph")) {
        setError("Only @jmc.edu.ph accounts are allowed");
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
      setError("Login failed. Please try again.");
      toast.error("Login failed. Please try again.");
      await signOut(auth);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-200 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
        }`}>
        <div className={`w-full max-w-md p-8 rounded-xl shadow-lg transition-colors duration-200 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          } border`}>
          {/* Logo Container */}
          <div className="flex justify-center mb-8">
            <img
              src={logo}
              alt="QCheckCITE Logo"
              className="w-48 h-auto transition-transform duration-200 hover:scale-105"
            />
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2" role="heading" aria-level="1">
              Welcome to QCheckCITE!
            </h1>
            <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Please sign in to get started
            </p>
          </div>

          {error && (
            <div className={`mb-4 p-4 rounded-lg ${isDarkMode ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-700'
              }`} role="alert">
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors duration-200 ${isDarkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label="Sign in with your JMC Account"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <LoadingSpinner size="small" />
                <span className="ml-2">Signing in...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
                  />
                </svg>
                Sign in with your JMC Account
              </div>
            )}
          </button>

          <div className={`mt-6 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
            <p>Only @jmc.edu.ph email addresses are allowed</p>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default Login;
