import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
} from "firebase/auth";
import {
  getFirestore,
} from "firebase/firestore";

// =========================================================
// FIREBASE CONFIG
// =========================================================

const firebaseConfig = {
  apiKey: "AIzaSyBuV9BoNnoePUWN2yeR7zbeawY3jCR3bY8",
  authDomain: "interviq-9cb86.firebaseapp.com",
  projectId: "interviq-9cb86",
  storageBucket: "interviq-9cb86.firebasestorage.app",
  messagingSenderId: "744584865119",
  appId: "1:744584865119:web:fc010af45f67be2ac002ea",
  measurementId: "G-PSZSWSK6NF",
};

// =========================================================
// INITIALIZE FIREBASE
// =========================================================

const app = initializeApp(firebaseConfig);

// =========================================================
// AUTHENTICATION
// =========================================================

const auth = getAuth(app);

// Google provider
const googleProvider = new GoogleAuthProvider();

// =========================================================
// FIRESTORE
// =========================================================

const db = getFirestore(app);

// =========================================================
// EXPORTS
// =========================================================

export {
  app,
  auth,
  db,
  googleProvider,
};