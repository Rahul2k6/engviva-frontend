import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBu2wV9BoNnoePUWN2yeR7zawY3jCR3bY8",
  authDomain: "interviq-9cb86.firebaseapp.com",
  projectId: "interviq-9cb86",
  storageBucket: "interviq-9cb86.firebasestorage.app",
  messagingSenderId: "744584865119",
  appId: "1:744584865119:web:fc010af45f67be2ac002ea",
  measurementId: "G-PSZSWSK6NF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);

// Initialize the Google Auth Provider
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider };