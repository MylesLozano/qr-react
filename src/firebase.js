// Import Firebase SDKs
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

// Firebase Configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Function to check and assign user role
const checkAndAssignUserRole = async (user) => {
  if (!user || !user.email.endsWith("@jmc.edu.ph")) return;

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  try {
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        createdAt: serverTimestamp(),
        email: user.email,
        role: "user",
      });

      console.log(`Assigned default role 'user' to ${user.email}`);
      await logAudit(user.email, "Assigned role: user (new user)");
    } else {
      const existingRole = userSnap.data().role;
      console.log(
        `ℹ️ User ${user.email} already exists with role: ${existingRole}`
      );
      await logAudit(user.email, `Role verified: ${existingRole}`);
    }
  } catch (error) {
    console.error("Error assigning user role:", error);
  }
};

// Function to get user role
const getUserRole = async (uid) => {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    console.log(`Role fetched for UID ${uid}: ${userSnap.data().role}`);
    return userSnap.data().role;
  } else {
    console.warn(`No role found for UID ${uid}, defaulting to "user"`);
    return "user";
  }
};

// Function to log audit events
const logAudit = async (email, action) => {
  try {
    const auditRef = await addDoc(collection(db, "audit_logs"), {
      email,
      action,
      timestamp: serverTimestamp(),
    });
    console.log(
      `Audit log added: ${email} - ${action} (ID: ${auditRef.id})`
    );
  } catch (error) {
    console.error("🚨 Error logging audit event:", error);
  }
};

// Listen for auth state changes and assign role if needed
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      await checkAndAssignUserRole(user);
    } catch (error) {
      console.error("🚨 Error assigning user role:", error);
    }
  }
});

export { auth, db, logAudit, getUserRole };
