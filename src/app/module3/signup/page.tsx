"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, db, googleProvider } from "@/modules/module3/lib/firebase/client";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const createProfile = async (uid: string, email: string, name: string) => {
    await setDoc(doc(db, "users", uid), {
      uid,
      email,
      fullName: name,
      role: "Member",
      membershipType: "Free",
      joinedDate: new Date().toISOString(),
    });
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await createProfile(userCredential.user.uid, email, fullName);
      router.push("/module3/dashboard");
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to sign up");
    }
  };

  const handleGoogleSignup = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // Ensure profile exists or create one
      await createProfile(result.user.uid, result.user.email || "", result.user.displayName || "Google User");
      router.push("/module3/dashboard");
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to sign up with Google");
    }
  };

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Join the Community</h2>
        
        {error && <div style={{ color: 'var(--accent-color)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

        <form onSubmit={handleEmailSignup}>
          <div className="input-group">
            <label className="input-label">Full Name</label>
            <input 
              type="text" 
              className="input-field" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label className="input-label">Email</label>
            <input 
              type="email" 
              className="input-field" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label className="input-label">Password</label>
            <input 
              type="password" 
              className="input-field" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            Sign Up
          </button>
        </form>

        <div style={{ margin: '2rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          OR
        </div>

        <button onClick={handleGoogleSignup} className="btn btn-secondary" style={{ width: '100%' }}>
          Sign Up with Google
        </button>

        <p style={{ marginTop: '2rem', textAlign: 'center' }}>
          Already have an account? <Link href="/module3/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
