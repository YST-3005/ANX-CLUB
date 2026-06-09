// lib/firebaseAdmin.js
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;

const adminConfig = (projectId && clientEmail && privateKey) ? {
  credential: cert({
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, "\n"),
  }),
} : {
  projectId: "dummy-project-id"
};

// Prevent re-initialization across hot reloads
const adminApp =
  getApps().find((a) => a.name === "admin") ||
  initializeApp(adminConfig, "admin");

export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
