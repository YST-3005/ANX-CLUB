"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function CreateMentor() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    company: "",
    bio: "",
    linkedin: "",
    topics: "",
    imageUrl: "",
    ownerEmail: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convert comma-separated topics into an array
      const topicsArray = formData.topics.split(",").map(t => t.trim()).filter(t => t);

      const res = await fetch('/api/v1/admin/mentors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          topics: topicsArray
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create mentor');
      }

      toast.success('Mentor created successfully!');
      router.push('/admin/mentors');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '4rem 0', maxWidth: '600px' }}>
      <h1 style={{ marginBottom: '2rem' }}>Create Mentor Profile</h1>
      <div className="glass-panel">
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
          
          <div className="input-group">
            <label className="input-label">Full Name</label>
            <input type="text" name="name" className="input-field" required onChange={handleChange} value={formData.name} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="input-group">
              <label className="input-label">Role / Job Title</label>
              <input type="text" name="role" className="input-field" required onChange={handleChange} value={formData.role} />
            </div>
            <div className="input-group">
              <label className="input-label">Company</label>
              <input type="text" name="company" className="input-field" required onChange={handleChange} value={formData.company} />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Topics (comma separated)</label>
            <input type="text" name="topics" className="input-field" required placeholder="e.g. Machine Learning, System Design" onChange={handleChange} value={formData.topics} />
          </div>

          <div className="input-group">
            <label className="input-label">Bio</label>
            <textarea name="bio" className="input-field" rows={4} onChange={handleChange} value={formData.bio}></textarea>
          </div>

          <div className="input-group">
            <label className="input-label">LinkedIn URL</label>
            <input type="url" name="linkedin" className="input-field" onChange={handleChange} value={formData.linkedin} />
          </div>

          <div className="input-group">
            <label className="input-label">Profile Image URL (optional)</label>
            <input type="url" name="imageUrl" className="input-field" onChange={handleChange} value={formData.imageUrl} />
          </div>

          <div className="input-group">
            <label className="input-label">Owner Email (optional, to link a user account to this mentor)</label>
            <input type="email" name="ownerEmail" className="input-field" onChange={handleChange} value={formData.ownerEmail} />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1 }}>
              {loading ? "Creating..." : "Create Mentor"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => router.push('/admin/mentors')} style={{ flex: 1 }}>
              Cancel
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
