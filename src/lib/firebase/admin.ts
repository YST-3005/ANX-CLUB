import * as admin from 'firebase-admin';

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

function initAdmin(): admin.app.App | null {
  if (admin.apps.length > 0) return admin.apps[0]!;
  if (!projectId || !clientEmail || !privateKey) return null;

  try {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    return null;
  }
}

let cachedDb: admin.firestore.Firestore | null = null;
let cachedAuth: admin.auth.Auth | null = null;
let cachedStorage: admin.storage.Storage | null = null;

export const adminDb = new Proxy({} as admin.firestore.Firestore, {
  get(_, prop) {
    if (!cachedDb) {
      const app = initAdmin();
      if (!app) throw new Error("Firebase Admin SDK missing required credentials.");
      cachedDb = admin.firestore();
    }
    const value = (cachedDb as any)[prop];
    return typeof value === 'function' ? value.bind(cachedDb) : value;
  }
});

export const adminAuth = new Proxy({} as admin.auth.Auth, {
  get(_, prop) {
    if (!cachedAuth) {
      const app = initAdmin();
      if (!app) throw new Error("Firebase Admin SDK missing required credentials.");
      cachedAuth = admin.auth();
    }
    const value = (cachedAuth as any)[prop];
    return typeof value === 'function' ? value.bind(cachedAuth) : value;
  }
});

export const adminStorage = new Proxy({} as admin.storage.Storage, {
  get(_, prop) {
    if (!cachedStorage) {
      const app = initAdmin();
      if (!app) throw new Error("Firebase Admin SDK missing required credentials.");
      cachedStorage = admin.storage();
    }
    const value = (cachedStorage as any)[prop];
    return typeof value === 'function' ? value.bind(cachedStorage) : value;
  }
});
