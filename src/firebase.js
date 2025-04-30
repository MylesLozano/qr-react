// Import Firebase SDKs
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
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

// Constants
const EMAIL_DOMAIN = "@jmc.edu.ph";
const DEFAULT_ROLE = "user";
const AUDIT_COLLECTION = "auditLogs";
const USERS_COLLECTION = "users";

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

// Validate Firebase configuration
const validateFirebaseConfig = (config) => {
  const requiredFields = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId'
  ];

  const missingFields = requiredFields.filter(field => !config[field]);
  if (missingFields.length > 0) {
    throw new Error(`Missing required Firebase configuration fields: ${missingFields.join(', ')}`);
  }
};

// Initialize Firebase
let auth, db, logAudit, getUserRole;

try {
  validateFirebaseConfig(firebaseConfig);
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  
  // Initialize Firestore with persistent cache
  db = initializeFirestore(app, {
    localCache: persistentLocalCache(),
  });

  /**
   * Check and assign user role
   * @param {Object} user - Firebase user object
   * @returns {Promise<void>}
   */
  const checkAndAssignUserRole = async (user) => {
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
        console.log(`✅ Assigned default role '${DEFAULT_ROLE}' to ${user.email}`);
        await logAudit(user.email, `Assigned role: ${DEFAULT_ROLE} (new user)`);
      } else {
        const userData = userSnap.data();
        console.log(`ℹ️ User ${user.email} exists with role: ${userData.role}`);
        await logAudit(user.email, `Role verified: ${userData.role}`);
        
        // Update last login timestamp
        await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
      }
    } catch (error) {
      console.error("🚨 Error assigning user role:", error);
      throw error;
    }
  };

  /**
   * Get user role
   * @param {string} uid - User ID
   * @returns {Promise<string>} User role
   */
  const getUserRole = async (uid) => {
    if (!uid) {
      console.warn("No UID provided to getUserRole");
      return DEFAULT_ROLE;
    }

    try {
      const userRef = doc(db, USERS_COLLECTION, uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const role = userSnap.data().role;
        console.log(`✅ Role fetched for UID ${uid}: ${role}`);
        return role;
      } else {
        console.warn(`⚠️ No role found for UID ${uid}, defaulting to "${DEFAULT_ROLE}"`);
        return DEFAULT_ROLE;
      }
    } catch (error) {
      console.error("🚨 Error fetching user role:", error);
      return DEFAULT_ROLE;
    }
  };

  /**
   * Log audit events
   * @param {string} email - User email
   * @param {string} action - Action performed
   * @returns {Promise<void>}
   */
  const logAudit = async (email, action) => {
    if (!email || !action) {
      console.warn("Missing required parameters for audit log");
      return;
    }

    try {
      const auditRef = await addDoc(collection(db, AUDIT_COLLECTION), {
        email,
        action,
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
      });
      console.log(`✅ Audit log added: ${email} - ${action} (ID: ${auditRef.id})`);
    } catch (error) {
      console.error("🚨 Error logging audit event:", error);
      throw error;
    }
  };

  // Listen for auth state changes and assign role if needed
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        await checkAndAssignUserRole(user);
      } catch (error) {
        console.error("🚨 Error in auth state change handler:", error);
      }
    }
  });
} catch (error) {
  console.error("🚨 Failed to initialize Firebase:", error);
  throw error;
}

export { auth, db, logAudit, getUserRole };
