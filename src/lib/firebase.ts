import * as admin from 'firebase-admin';

let db: admin.firestore.Firestore | null = null;

try {
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    const hasDefaultApp = admin.apps.some(app => app && app.name === '[DEFAULT]');
    if (!hasDefaultApp) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    }
    db = admin.firestore();
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error);
}

export { db };
