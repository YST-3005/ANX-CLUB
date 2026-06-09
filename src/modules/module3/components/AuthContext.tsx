"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/modules/module3/lib/firebase/client";
import { doc, getDoc, onSnapshot } from "firebase/firestore";

interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  role: string;
  membershipType: string;
  membershipExpiry?: string;
  // other fields
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: () => void;
    try {
      const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        setUser(user);
        if (user) {
          // Listen to profile from Firestore in real-time
          const docRef = doc(db, "users", user.uid);
          unsubscribeProfile = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
              setProfile(docSnap.data() as UserProfile);
            } else {
              setProfile(null);
            }
            setLoading(false);
          }, (err) => {
            console.error("Error fetching user profile", err);
            setLoading(false);
          });
        } else {
          setProfile(null);
          if (unsubscribeProfile) unsubscribeProfile();
          setLoading(false);
        }
      });
      return () => {
        unsubscribeAuth();
        if (unsubscribeProfile) unsubscribeProfile();
      };
    } catch (error) {
      console.warn("Firebase Auth not configured properly", error);
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
