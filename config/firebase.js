// config/firebase.js
import { initializeApp } from '@firebase/app'; // Correct, can also be "firebase/app"
// Import the new Auth initialization functions
import { initializeAuth, getReactNativePersistence } from 'firebase/auth'; // Changed from getAuth
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from '@firebase/firestore'; // Correct, can also be "firebase/firestore"
// If you plan to use Firebase Storage for file uploads (like custom avatars later)
// import { getStorage } from 'firebase/storage';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD0Qg3b6O_6dN6qTua635AHu4ZREqoVx2o",
  authDomain: "nutriscan-adaad.firebaseapp.com",
  projectId: "nutriscan-adaad",
  storageBucket: "nutriscan-adaad.firebasestorage.app",
  messagingSenderId: "1086096631944",
  appId: "1:1086096631944:web:592635928e2fd3c29c173d",
  measurementId: "G-DGD7895HYF"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence for React Native
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Initialize Firestore
const db = getFirestore(app);

// Initialize Firebase Storage (optional, if you need it)
// const storage = getStorage(app);

// Export the initialized services
export { auth, db, app /*, storage */ };