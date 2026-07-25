"use client";

import { useAuth } from "@/modules/module3/components/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProfilePage() {
  const { user, profile, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user || !profile) {
    return (
      <div className="auth-container">
        <div className="glass-panel" style={{ textAlign: "center", padding: "2rem" }}>
          Loading profile...
        </div>
      </div>
    );
  }

  const getBadgeClass = (role: string) => {
    switch (role) {
      case "Admin": return "badge-admin";
      case "Premium Member": return "badge-premium";
      case "Mentor": return "badge-mentor";
      case "Member": return "badge-member";
      default: return "badge-visitor";
    }
  };

  return (
    <div className="main-content animate-fade-in">
      <div className="glass-panel" style={{ maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h2>User Profile</h2>
          <div style={{ display: "flex", gap: "1rem" }}>
            <Link href="/profile/edit" className="btn btn-primary">Edit Profile</Link>
            <button onClick={logout} className="btn btn-outline">Log Out</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
          <div>
            <div style={{ marginBottom: "1.5rem" }}>
              <div className="form-label">Full Name</div>
              <div style={{ fontSize: "1.125rem" }}>{profile.fullName || "Not provided"}</div>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <div className="form-label">Email</div>
              <div>{user.email}</div>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <div className="form-label">Phone Number</div>
              <div>{profile.phoneNumber || "Not provided"}</div>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <div className="form-label">Membership Status</div>
              <div style={{ marginTop: "0.5rem" }}>
                <span className={`badge ${getBadgeClass(profile.role)}`}>
                  {profile.role}
                </span>
              </div>
            </div>
            
            {profile.joinedDate && (
              <div style={{ marginBottom: "1.5rem" }}>
                <div className="form-label">Joined Date</div>
                <div>{new Date(profile.joinedDate).toLocaleDateString()}</div>
              </div>
            )}
          </div>

          <div>
            <div style={{ marginBottom: "1.5rem" }}>
              <div className="form-label">College / University</div>
              <div>{profile.collegeName || "Not provided"}</div>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <div className="form-label">Year & Branch</div>
              <div>{profile.yearBranch || "Not provided"}</div>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <div className="form-label">Skills</div>
              <div>{profile.skills || "Not provided"}</div>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <div className="form-label">Interests</div>
              <div>{profile.interests || "Not provided"}</div>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <div className="form-label">Links</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
                {profile.linkedinUrl ? (
                  <a href={profile.linkedinUrl} target="_blank" rel="noreferrer">LinkedIn</a>
                ) : (
                  <span style={{ color: "var(--text-secondary)" }}>No LinkedIn provided</span>
                )}
                {profile.githubUrl ? (
                  <a href={profile.githubUrl} target="_blank" rel="noreferrer">GitHub</a>
                ) : (
                  <span style={{ color: "var(--text-secondary)" }}>No GitHub provided</span>
                )}
                {profile.portfolioUrl ? (
                  <a href={profile.portfolioUrl} target="_blank" rel="noreferrer">Portfolio</a>
                ) : (
                  <span style={{ color: "var(--text-secondary)" }}>No Portfolio provided</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
