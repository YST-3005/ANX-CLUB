// server/config/firebase.js
// Firebase Admin SDK initialization

import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

let auth = null;
let db = null;
let firebaseReady = false;

try {
  // Prevent re-initializing if already done (e.g., in watch/hot-reload mode)
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Replace literal \n in the env var with actual newlines
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }

  auth = admin.auth();
  db = admin.firestore();
  firebaseReady = true;
  console.log('🔥 Firebase Admin SDK initialized successfully.');
} catch (err) {
  console.warn('⚠️  Firebase Admin SDK NOT initialized:', err.message);
  console.warn('   → Set real credentials in server/.env to enable Auth & Firestore.');
}

export { auth, db, firebaseReady };
export default admin;
