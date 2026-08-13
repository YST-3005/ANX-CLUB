import * as admin from 'firebase-admin';

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

let cachedApp: admin.app.App | null = null;
let cachedDb: admin.firestore.Firestore | null = null;
let cachedAuth: admin.auth.Auth | null = null;
let cachedStorage: admin.storage.Storage | null = null;

export function getAdminApp(): admin.app.App {
  if (cachedApp) return cachedApp;
  
  if (admin.apps.length > 0) {
    cachedApp = admin.apps[0]!;
    return cachedApp;
  }
  
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin SDK missing required credentials.");
  }

  try {
    cachedApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
    return cachedApp;
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    throw error;
  }
}

export function getAdminDb(): admin.firestore.Firestore {
  if (!cachedDb) {
    getAdminApp();
    cachedDb = admin.firestore();
  }
  return cachedDb;
}

export function getAdminAuth(): admin.auth.Auth {
  if (!cachedAuth) {
    getAdminApp();
    cachedAuth = admin.auth();
  }
  return cachedAuth;
}

export function getAdminStorage(): admin.storage.Storage {
  if (!cachedStorage) {
    getAdminApp();
    cachedStorage = admin.storage();
  }
  return cachedStorage;
}
