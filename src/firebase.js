/**
 * ENGVIVA
 * Firebase Configuration
 *
 * Used by:
 * - Firebase Authentication
 * - Google Authentication
 * - Firestore
 */

import { initializeApp, getApps, getApp } from "firebase/app";

import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";

import {
  getFirestore,
} from "firebase/firestore";

/* =========================================================
   FIREBASE CONFIG
========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyBu2wV9BoNnoePUWN2yeR7zawY3jCR3bY8",
  authDomain: "interviq-9cb86.firebaseapp.com",
  projectId: "interviq-9cb86",
  storageBucket: "interviq-9cb86.firebasestorage.app",
  messagingSenderId: "744584865119",
  appId: "1:744584865119:web:fc010af45f67be2ac002ea",
  measurementId: "G-PSZSWSK6NF",
};

/* =========================================================
   FIREBASE APP
========================================================= */

/*
 * Prevent duplicate Firebase initialization
 * during Vite/HMR development.
 */

const app =
  getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig);

/* =========================================================
   AUTH
========================================================= */

const auth =
  getAuth(app);

/*
 * Keep the user signed in across browser refreshes.
 *
 * This is important because your application has
 * dashboard/profile/technical/resume screens that depend
 * on Firebase's current authenticated user.
 */

setPersistence(
  auth,
  browserLocalPersistence
).catch((error) => {
  console.error(
    "[FIREBASE] Auth persistence setup failed:",
    error
  );
});

/* =========================================================
   GOOGLE AUTH
========================================================= */

const googleProvider =
  new GoogleAuthProvider();

/*
 * Always allow the user to select
 * the Google account.
 */

googleProvider.setCustomParameters({
  prompt: "select_account",
});

/*
 * Request standard Google profile information.
 */

googleProvider.addScope(
  "profile"
);

googleProvider.addScope(
  "email"
);

/* =========================================================
   FIRESTORE
========================================================= */

const db =
  getFirestore(app);

/* =========================================================
   EXPORT
========================================================= */

export {
  app,
  auth,
  db,
  googleProvider,
};