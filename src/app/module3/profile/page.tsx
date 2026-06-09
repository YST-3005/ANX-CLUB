"use client";

import { useAuth } from "@/modules/module3/components/AuthContext";
import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/modules/module3/lib/firebase/client";

export default function Profile() {
  const { user, profile, loading } = useAuth();
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    college: "",
    yearBranch: "",
    skills: "",
    interests: "",
    linkedin: "",
    github: "",
    portfolio: "",
    bio: "",
    isPublic: false
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (profile) {
      const prof = profile as unknown as Record<string, string>;
      setFormData({
        fullName: profile.fullName || "",
        phone: prof.phone || "",
        college: prof.college || "",
        yearBranch: prof.yearBranch || "",
        skills: prof.skills || "",
        interests: prof.interests || "",
        linkedin: prof.linkedin || "",
        github: prof.github || "",
        portfolio: prof.portfolio || "",
        bio: prof.bio || "",
        isPublic: prof.isPublic === undefined ? false : Boolean(prof.isPublic)
      });
    }
  }, [profile]);

  if (loading) return <div className="container" style={{ padding: "4rem 0" }}>Loading...</div>;
  if (!user) return <div className="container" style={{ padding: "4rem 0" }}>Please log in to view your profile.</div>;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    try {
      const docRef = doc(db, "users", user.uid);
      await updateDoc(docRef, { ...formData });
      setMessage("Profile updated successfully!");
    } catch (err) {
      console.error(err);
      setMessage("Failed to update profile.");
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 0', maxWidth: '800px' }}>
      <h1 style={{ marginBottom: '2rem' }}>Edit Profile</h1>
      <div className="glass-panel">
        {message && <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--radius-md)' }}>{message}</div>}
        <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          
          <div className="input-group">
            <label className="input-label">Full Name</label>
            <input type="text" name="fullName" className="input-field" value={formData.fullName} onChange={handleChange} required />
          </div>

          <div className="input-group">
            <label className="input-label">Phone Number</label>
            <input type="tel" name="phone" className="input-field" value={formData.phone} onChange={handleChange} />
          </div>

          <div className="input-group">
            <label className="input-label">College Name</label>
            <input type="text" name="college" className="input-field" value={formData.college} onChange={handleChange} />
          </div>

          <div className="input-group">
            <label className="input-label">Year/Branch</label>
            <input type="text" name="yearBranch" className="input-field" value={formData.yearBranch} onChange={handleChange} />
          </div>

          <div className="input-group" style={{ gridColumn: 'span 2' }}>
            <label className="input-label">Skills (comma separated)</label>
            <input type="text" name="skills" className="input-field" value={formData.skills} onChange={handleChange} />
          </div>

          <div className="input-group" style={{ gridColumn: 'span 2' }}>
            <label className="input-label">Interests</label>
            <input type="text" name="interests" className="input-field" value={formData.interests} onChange={handleChange} />
          </div>

          <div className="input-group">
            <label className="input-label">LinkedIn URL</label>
            <input type="url" name="linkedin" className="input-field" value={formData.linkedin} onChange={handleChange} />
          </div>

          <div className="input-group">
            <label className="input-label">GitHub URL</label>
            <input type="url" name="github" className="input-field" value={formData.github} onChange={handleChange} />
          </div>

          <div className="input-group" style={{ gridColumn: 'span 2' }}>
            <label className="input-label">Portfolio URL</label>
            <input type="url" name="portfolio" className="input-field" value={formData.portfolio} onChange={handleChange} />
          </div>

          <div className="input-group" style={{ gridColumn: 'span 2' }}>
            <label className="input-label">Bio (Short Headline about yourself)</label>
            <textarea name="bio" className="input-field" rows={3} value={formData.bio} onChange={handleChange}></textarea>
          </div>

          <div className="input-group" style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input 
              type="checkbox" 
              name="isPublic" 
              id="isPublic"
              checked={formData.isPublic} 
              onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })} 
              style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
            />
            <label htmlFor="isPublic" style={{ fontSize: '1rem', fontWeight: 500, cursor: 'pointer' }}>Make Profile Public (Show in Member Directory)</label>
          </div>

          <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="submit" className="btn btn-primary">Save Profile</button>
          </div>
        </form>
      </div>
    </div>
  );
}
