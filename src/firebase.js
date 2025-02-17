// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAclFw_OeuKnImiaCBOv6tJdkwcmsKkyNs",
  authDomain: "qcheckcite.firebaseapp.com",
  projectId: "qcheckcite",
  storageBucket: "qcheckcite.firebasestorage.app",
  messagingSenderId: "387878800027",
  appId: "1:387878800027:web:0306cee2d4aea0f3b7d43e",
  measurementId: "G-WPTD0L0FZ8",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const logAudit = async (email, action) => {
  try {
    await addDoc(collection(db, "audit_logs"), {
      email,
      action,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error logging audit event:", error);
  }
};

export { auth, db, logAudit };
