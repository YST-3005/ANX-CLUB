"use client";

import { useAuth } from "@/modules/module3/components/AuthContext";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

export default function CreateTopic() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: "Discussion",
    tags: ""
  });

  if (authLoading) return <div className="container" style={{ padding: '4rem 0' }}>Loading...</div>;
  if (!user) {
    router.push('/login');
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tagsArray = formData.tags.split(",").map(t => t.trim()).filter(t => t);

      const res = await fetch('/api/v1/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tags: tagsArray,
          authorId: user.uid,
          authorName: profile?.fullName || "Anonymous"
        })
      });

      if (!res.ok) {
        throw new Error('Failed to post topic');
      }

      toast.success('Topic posted successfully!');
      router.push('/community');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '4rem 0', maxWidth: '600px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/community" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          &larr; Back to Community
        </Link>
      </div>

      <h1 style={{ marginBottom: '2rem' }}>Create New Topic</h1>
      <div className="glass-panel">
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
          
          <div className="input-group">
            <label className="input-label">Topic Type</label>
            <select name="type" className="input-field" value={formData.type} onChange={handleChange} required>
              <option value="Discussion">Discussion</option>
              <option value="Question">Question</option>
              <option value="Team Matchmaking">Team Matchmaking</option>
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Title</label>
            <input type="text" name="title" className="input-field" required onChange={handleChange} value={formData.title} />
          </div>

          <div className="input-group">
            <label className="input-label">Content</label>
            <textarea name="content" className="input-field" rows={6} required onChange={handleChange} value={formData.content} placeholder="What's on your mind?"></textarea>
          </div>

          <div className="input-group">
            <label className="input-label">Tags (comma separated)</label>
            <input type="text" name="tags" className="input-field" placeholder="e.g. React, Looking for Co-founder" onChange={handleChange} value={formData.tags} />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1 }}>
              {loading ? "Posting..." : "Post Topic"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => router.push('/community')} style={{ flex: 1 }}>
              Cancel
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
