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
  apiKey: "AIzaSyAclFw_OeuKnImiaCBOv6tJdkwcmsKkyNs",
  authDomain: "qcheckcite.firebaseapp.com",
  projectId: "qcheckcite",
  storageBucket: "qcheckcite.firebasestorage.app",
  messagingSenderId: "387878800027",
  appId: "1:387878800027:web:0306cee2d4aea0f3b7d43e",
  measurementId: "G-WPTD0L0FZ8",
};

//Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

//Function to check and assign user role
const checkAndAssignUserRole = async (user) => {
  if (!user || !user.email.endsWith("@jmc.edu.ph")) return;

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    // Assign default role and store creation timestamp
    await setDoc(userRef, {
      createdAt: serverTimestamp(),
      email: user.email,
      role: "user",
    });

    console.log(`Assigned default role 'user' to ${user.email}`);

    // 🔍 Log the role assignment in audit_logs
    await logAudit(user.email, "Assigned role: user (new user)");
  } else {
    const existingRole = userSnap.data().role;
    console.log(`User ${user.email} already exists with role: ${existingRole}`);

    // 🔍 Log the role verification in audit_logs
    await logAudit(user.email, `Role verified: ${existingRole}`);
  }
};

//Function to get user role
const getUserRole = async (uid) => {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  return userSnap.exists() ? userSnap.data().role : "user";
};

//Function to log audit events
const logAudit = async (email, action) => {
  try {
    await addDoc(collection(db, "audit_logs"), {
      email,
      action,
      timestamp: serverTimestamp(),
    });
    console.log(`Audit log added: ${email} - ${action}`);
  } catch (error) {
    console.error("Error logging audit event:", error);
  }
};

//Listen for auth state changes and assign role if needed
onAuthStateChanged(auth, async (user) => {
  if (user) {
    await checkAndAssignUserRole(user);
  }
});

export { auth, db, logAudit, getUserRole };
