'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { setToken, clearToken } from '@/lib/api';

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
  role?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  setPhoneUser: (phoneNumber: string, token: string) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  logout: async () => {},
  setPhoneUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          setToken(idToken);
          setTokenState(idToken);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            phoneNumber: firebaseUser.phoneNumber,
            photoURL: firebaseUser.photoURL,
          });
        } catch (error) {
          console.error('[AuthProvider] Error getting token:', error);
          setUser(null);
          setTokenState(null);
        }
      } else {
        // Check for phone-based OTP session in localStorage
        const storedToken = typeof window !== 'undefined'
          ? localStorage.getItem('anx_token')
          : null;
        const storedUser = typeof window !== 'undefined'
          ? localStorage.getItem('anx_user')
          : null;

        if (storedToken && storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setTokenState(storedToken);
            setUser(parsedUser);
          } catch {
            clearToken();
            setUser(null);
            setTokenState(null);
          }
        } else {
          setUser(null);
          setTokenState(null);
        }
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (e) {
      // Might not have firebase session (phone OTP only)
    }
    clearToken();
    setUser(null);
    setTokenState(null);
    window.location.href = '/login';
  }, []);

  // Used after OTP verification to set a phone-based session
  const setPhoneUser = useCallback((phoneNumber: string, sessionToken: string) => {
    const phoneUser: AuthUser = {
      uid: phoneNumber,
      email: null,
      displayName: null,
      phoneNumber,
      photoURL: null,
    };
    setToken(sessionToken);
    localStorage.setItem('anx_user', JSON.stringify(phoneUser));
    setTokenState(sessionToken);
    setUser(phoneUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        logout,
        setPhoneUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
