"use client";

import { useAuth } from "@/modules/module3/components/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ProfileEditPage() {
  const { user, profile, loading, updateProfileData } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    collegeName: "",
    yearBranch: "",
    skills: "",
    interests: "",
    linkedinUrl: "",
    githubUrl: "",
    portfolioUrl: ""
  });

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (profile) {
        setFormData({
          fullName: profile.fullName || "",
          phoneNumber: profile.phoneNumber || "",
          collegeName: profile.collegeName || "",
          yearBranch: profile.yearBranch || "",
          skills: profile.skills || "",
          interests: profile.interests || "",
          linkedinUrl: profile.linkedinUrl || "",
          githubUrl: profile.githubUrl || "",
          portfolioUrl: profile.portfolioUrl || ""
        });
      }
    }
  }, [user, profile, loading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setSaving(true);
      await updateProfileData(formData);
      router.push("/profile");
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user || !profile) {
    return (
      <div className="auth-container">
        <div className="glass-panel" style={{ textAlign: "center", padding: "2rem" }}>
          Loading profile settings...
        </div>
      </div>
    );
  }

  return (
    <div className="main-content animate-fade-in">
      <div className="glass-panel" style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h2 style={{ marginBottom: "2rem" }}>Edit Profile</h2>
        
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            
            {/* Left Column */}
            <div>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  name="fullName" 
                  className="form-input" 
                  value={formData.fullName} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input 
                  type="text" 
                  name="phoneNumber" 
                  className="form-input" 
                  value={formData.phoneNumber} 
                  onChange={handleChange} 
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">College Name</label>
                <input 
                  type="text" 
                  name="collegeName" 
                  className="form-input" 
                  value={formData.collegeName} 
                  onChange={handleChange} 
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Year/Branch</label>
                <input 
                  type="text" 
                  name="yearBranch" 
                  className="form-input" 
                  value={formData.yearBranch} 
                  onChange={handleChange} 
                  placeholder="e.g. 3rd Year / Computer Science" 
                />
              </div>
            </div>
            
            {/* Right Column */}
            <div>
              <div className="form-group">
                <label className="form-label">Skills (comma separated)</label>
                <input 
                  type="text" 
                  name="skills" 
                  className="form-input" 
                  value={formData.skills} 
                  onChange={handleChange} 
                  placeholder="React, Node.js, Python" 
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Interests</label>
                <input 
                  type="text" 
                  name="interests" 
                  className="form-input" 
                  value={formData.interests} 
                  onChange={handleChange} 
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">LinkedIn URL</label>
                <input 
                  type="url" 
                  name="linkedinUrl" 
                  className="form-input" 
                  value={formData.linkedinUrl} 
                  onChange={handleChange} 
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">GitHub URL</label>
                <input 
                  type="url" 
                  name="githubUrl" 
                  className="form-input" 
                  value={formData.githubUrl} 
                  onChange={handleChange} 
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Portfolio URL</label>
                <input 
                  type="url" 
                  name="portfolioUrl" 
                  className="form-input" 
                  value={formData.portfolioUrl} 
                  onChange={handleChange} 
                />
              </div>
            </div>
            
          </div>
          
          <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
            <button type="button" onClick={() => router.push("/profile")} className="btn btn-outline">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
