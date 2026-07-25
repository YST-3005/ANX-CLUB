"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { 
  User as FirebaseUser, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  signInWithPopup,
  GoogleAuthProvider
} from "firebase/auth";
import { auth, db, googleProvider } from "@/lib/firebase/client";
import { doc, getDoc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  role: 'Visitor' | 'Member' | 'Premium Member' | 'Mentor' | 'Admin';
  membershipType: string;
  membershipExpiry?: string;
  joinedDate?: string;
  phoneNumber?: string;
  collegeName?: string;
  yearBranch?: string;
  skills?: string;
  interests?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  bio?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  college?: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<any>;
  signup: (email: string, pass: string) => Promise<any>;
  loginWithGoogle: () => Promise<any>;
  logout: () => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  loading: true,
  login: (async () => { throw new Error("AuthProvider not initialized") }) as any,
  signup: (async () => { throw new Error("AuthProvider not initialized") }) as any,
  loginWithGoogle: async () => { throw new Error("AuthProvider not initialized") },
  logout: async () => { throw new Error("AuthProvider not initialized") },
  updateProfileData: async () => { throw new Error("AuthProvider not initialized") }
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: () => void;
    try {
      const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          // Listen to profile from Firestore in real-time
          const docRef = doc(db, "users", currentUser.uid);
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

  const login = (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth, email, pass);
  };

  const signup = (email: string, pass: string) => {
    return createUserWithEmailAndPassword(auth, email, pass);
  };

  const loginWithGoogle = () => {
    return signInWithPopup(auth, googleProvider);
  };

  const logout = async () => {
    // Clear cookies
    document.cookie = "session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
    await signOut(auth);
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error("User not authenticated");
    const docRef = doc(db, "users", user.uid);
    await updateDoc(docRef, data);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      login, 
      signup, 
      loginWithGoogle, 
      logout, 
      updateProfileData 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
