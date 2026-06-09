"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/modules/module3/lib/firebase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/module3/dashboard");
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to login");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      router.push("/module3/dashboard");
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to login with Google");
    }
  };

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Welcome Back</h2>
        
        {error && <div style={{ color: 'var(--accent-color)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

        <form onSubmit={handleEmailLogin}>
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
            Sign In
          </button>
        </form>

        <div style={{ margin: '2rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          OR
        </div>

        <button onClick={handleGoogleLogin} className="btn btn-secondary" style={{ width: '100%' }}>
          Sign In with Google
        </button>

        <p style={{ marginTop: '2rem', textAlign: 'center' }}>
          Don&apos;t have an account? <Link href="/module3/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
