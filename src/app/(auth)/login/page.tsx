"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FcGoogle } from "react-icons/fc";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      const token = await auth.currentUser?.getIdToken();
      if (token) {
        document.cookie = `session=${token}; path=/; max-age=3600; SameSite=Lax`;
      }
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      const token = await auth.currentUser?.getIdToken();
      if (token) {
        document.cookie = `session=${token}; path=/; max-age=3600; SameSite=Lax`;
      }
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to log in with Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-box animate-fade-in">
        <h2 style={{ marginBottom: "1.5rem", textAlign: "center" }}>Welcome Back</h2>
        
        {error && (
          <div style={{ color: "var(--danger-color)", marginBottom: "1rem", textAlign: "center", fontSize: "0.875rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleEmailLogin}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input 
              type="email" 
              className="form-input" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-input" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary btn-full" style={{ marginTop: "1rem" }}>
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <div style={{ margin: "1.5rem 0", textAlign: "center", color: "var(--text-secondary)" }}>
          OR
        </div>

        <button onClick={handleGoogleLogin} disabled={loading} className="btn btn-outline btn-full">
          <FcGoogle size={20} style={{ marginRight: "8px" }} /> Continue with Google
        </button>

        <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.875rem" }}>
          Don't have an account? <Link href="/signup">Sign Up</Link>
        </div>
      </div>
    </div>
  );
}
