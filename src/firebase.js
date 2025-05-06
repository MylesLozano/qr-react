// File: src/firebase.js

import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  addDoc,
  serverTimestamp,
  initializeFirestore,
  persistentLocalCache,
} from "firebase/firestore";

const EMAIL_DOMAIN = "@jmc.edu.ph";
const DEFAULT_ROLE = "user";
const AUDIT_COLLECTION = "auditLogs";
const USERS_COLLECTION = "users";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const validateFirebaseConfig = (config) => {
  const requiredFields = [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "messagingSenderId",
    "appId",
  ];
  const missingFields = requiredFields.filter((field) => !config[field]);
  if (missingFields.length > 0) {
    throw new Error(
      `Missing required Firebase config fields: ${missingFields.join(", ")}`
    );
  }
};

let auth, db, logAudit, getUserRole, checkAndAssignUserRole, firebaseApp;

try {
  validateFirebaseConfig(firebaseConfig);
  const app =
    getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  firebaseApp = app;

  db = initializeFirestore(app, {
    localCache: persistentLocalCache(),
  });

  checkAndAssignUserRole = async (user) => {
    if (!user || !user.email.endsWith(EMAIL_DOMAIN)) {
      console.warn(`Invalid user or email domain: ${user?.email}`);
      return;
    }
    const userRef = doc(db, USERS_COLLECTION, user.uid);
    const userSnap = await getDoc(userRef);
    try {
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          createdAt: serverTimestamp(),
          email: user.email,
          role: DEFAULT_ROLE,
          lastLogin: serverTimestamp(),
        });
        console.log(
          `✅ Assigned default role '${DEFAULT_ROLE}' to ${user.email}`
        );
        // Updated logAudit call to match the new standard action and entity type
        await logAudit("user_role_assigned", user.email, "user", {
          role: DEFAULT_ROLE,
          userId: user.uid,
        });
      } else {
        const userData = userSnap.data();
        console.log(`ℹ️ User ${user.email} exists with role: ${userData.role}`);
        // Updated logAudit call to match the new standard action and entity type
        await logAudit("user_role_verified", user.email, "user", {
          role: userData.role,
          userId: user.uid,
        });
        await setDoc(
          userRef,
          { lastLogin: serverTimestamp() },
          { merge: true }
        );
      }
    } catch (error) {
      console.error("🚨 Error assigning user role:", error);
      throw error;
    }
  };

  getUserRole = async (uid) => {
    if (!uid) return DEFAULT_ROLE;
    try {
      const userRef = doc(db, USERS_COLLECTION, uid);
      const userSnap = await getDoc(userRef);
      return userSnap.exists() ? userSnap.data().role : DEFAULT_ROLE;
    } catch (error) {
      console.error("🚨 Error fetching user role:", error);
      return DEFAULT_ROLE;
    }
  };

  /**
   * Logs an audit event to Firestore
   * @param {string} action - Description of the action performed (e.g., 'User logged in', 'Item added')
   * @param {string} userEmail - The email of the user performing the action
   * @param {string} entityType - The type of entity the action is related to (e.g., 'user', 'inventory', 'request')
   * @param {object} details - Optional object with additional details about the action (e.g., { itemId: 'abc', userName: '...' })
   */
  logAudit = async (action, userEmail, entityType = "system", details = {}) => {
    // <-- Updated function signature
    if (!action || !userEmail) {
      console.warn("Attempted to log audit without action or user email.");
      return;
    }
    try {
      const auditRef = await addDoc(collection(db, AUDIT_COLLECTION), {
        action,
        userEmail,
        entityType,
        details,
        timestamp: serverTimestamp(),
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
        platform:
          typeof navigator !== "undefined" ? navigator.platform : "unknown",
      });
      console.log(
        `✅ Audit log added: ${userEmail} - ${action} (ID: ${auditRef.id})`
      );
    } catch (error) {
      console.error("🚨 Error logging audit event:", error);
      throw error;
    }
  };
} catch (error) {
  console.error("🚨 Firebase initialization failed:", error);
  throw error;
}

export { auth, db, logAudit, getUserRole, checkAndAssignUserRole, firebaseApp };
