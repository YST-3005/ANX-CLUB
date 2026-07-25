import * as admin from 'firebase-admin';

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!admin.apps.length) {
  if (projectId && clientEmail && privateKey) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
      console.log('🔥 Firebase Admin SDK initialized successfully.');
    } catch (error) {
      console.error('Failed to initialize Firebase Admin SDK:', error);
    }
  } else {
    console.warn(
      '⚠️ Firebase Admin SDK environment variables are missing. Firebase operations on the server side will fail at runtime if invoked.'
    );
  }
}

export const adminDb = new Proxy({} as admin.firestore.Firestore, {
  get(target, prop) {
    if (!admin.apps.length) {
      throw new Error(
        "Firebase Admin SDK not initialized: Missing required environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)."
      );
    }
    const db = admin.firestore();
    const value = (db as any)[prop];
    return typeof value === 'function' ? value.bind(db) : value;
  }
});

export const adminAuth = new Proxy({} as admin.auth.Auth, {
  get(target, prop) {
    if (!admin.apps.length) {
      throw new Error(
        "Firebase Admin SDK not initialized: Missing required environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)."
      );
    }
    const auth = admin.auth();
    const value = (auth as any)[prop];
    return typeof value === 'function' ? value.bind(auth) : value;
  }
});

export const adminStorage = new Proxy({} as admin.storage.Storage, {
  get(target, prop) {
    if (!admin.apps.length) {
      throw new Error(
        "Firebase Admin SDK not initialized: Missing required environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)."
      );
    }
    const storage = admin.storage();
    const value = (storage as any)[prop];
    return typeof value === 'function' ? value.bind(storage) : value;
  }
});
