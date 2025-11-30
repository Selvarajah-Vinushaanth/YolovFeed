import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAU5DpqowWy-v7EzV-vOb_HsBxuJ90cVWk",
  authDomain: "detect-da43f.firebaseapp.com",
  projectId: "detect-da43f",
  storageBucket: "detect-da43f.firebasestorage.app",
  messagingSenderId: "1002234498368",
  appId: "1:1002234498368:web:b890bb6524115af379bea5",
  measurementId: "G-RMXRQWXG6Y"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Connect to emulators in development (optional)
if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_FIREBASE_EMULATOR === 'true') {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFirestoreEmulator(db, 'localhost', 8080);
  } catch (error) {
    console.log('Firebase emulators already connected');
  }
}

export default app;