import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Replace this with your actual Firebase config later
const firebaseConfig = {
  apiKey: "AIzaSyMockKeyForDevelopment",
  authDomain: "mock-project.firebaseapp.com",
  projectId: "mock-project",
  storageBucket: "mock-project.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// For local testing without a real Firebase project, you could uncomment these
// if you have the Firebase Local Emulator Suite running:
// connectAuthEmulator(auth, "http://localhost:9099");
// connectFirestoreEmulator(db, 'localhost', 8080);
