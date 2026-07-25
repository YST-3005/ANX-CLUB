"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, db, googleProvider } from "@/lib/firebase/client";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FcGoogle } from "react-icons/fc";

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const createProfile = async (uid: string, emailStr: string, name: string) => {
    await setDoc(doc(db, "users", uid), {
      uid,
      email: emailStr,
      fullName: name,
      role: "Member",
      membershipType: "Free",
      joinedDate: new Date().toISOString(),
      phoneNumber: "",
      collegeName: "",
      yearBranch: "",
      skills: "",
      interests: "",
      linkedinUrl: "",
      githubUrl: "",
      portfolioUrl: ""
    });
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await createProfile(userCredential.user.uid, email.trim(), fullName.trim());
      const token = await userCredential.user.getIdToken();
      document.cookie = `session=${token}; path=/; max-age=3600; SameSite=Lax`;
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to sign up");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await createProfile(result.user.uid, result.user.email || "", result.user.displayName || "Google User");
      const token = await result.user.getIdToken();
      document.cookie = `session=${token}; path=/; max-age=3600; SameSite=Lax`;
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to sign up with Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-box animate-fade-in">
        <h2 style={{ marginBottom: "1.5rem", textAlign: "center" }}>Create Account</h2>
        
        {error && (
          <div style={{ color: "var(--danger-color)", marginBottom: "1rem", textAlign: "center", fontSize: "0.875rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleEmailSignup}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input 
              type="text" 
              className="form-input" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
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
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <div style={{ margin: "1.5rem 0", textAlign: "center", color: "var(--text-secondary)" }}>
          OR
        </div>

        <button onClick={handleGoogleSignup} disabled={loading} className="btn btn-outline btn-full">
          <FcGoogle size={20} style={{ marginRight: "8px" }} /> Sign up with Google
        </button>

        <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.875rem" }}>
          Already have an account? <Link href="/login">Log In</Link>
        </div>
      </div>
    </div>
  );
}
