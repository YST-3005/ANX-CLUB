"use client";

import { useAuth } from "@/modules/module3/components/AuthContext";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Link from "next/link";

export default function CreatePublicEvent() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    type: "Online",
    seats: 50,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      toast.error("You must be logged in to host an event.");
      router.push("/module3/login");
    }
  }, [user, loading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const res = await fetch('/api/v1/module3/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          organizerId: user?.uid,
          speaker: profile?.fullName || "Community Member",
          price: 0, // Community events are free
          premiumPrice: 0,
          memberOnly: false
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to submit event');
      
      toast.success('Event published successfully!');
      router.refresh();
      router.push('/module3/events');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) return <div className="container" style={{ padding: "4rem 0", textAlign: "center" }}>Loading...</div>;

  return (
    <div className="container" style={{ padding: '2rem 0', maxWidth: '800px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/module3/events" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          &larr; Back to Events
        </Link>
      </div>

      <h1 style={{ marginBottom: '0.5rem' }}>Host a Community Event</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Share your knowledge with the community! All community-hosted events must be free to attend.
      </p>
      
      <form onSubmit={handleSubmit} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Event Title</label>
          <input 
            type="text" 
            name="title"
            value={formData.title} 
            onChange={handleChange}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-color)' }}
            required
            placeholder="e.g. Intro to Next.js 14"
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Description</label>
          <textarea 
            name="description"
            value={formData.description} 
            onChange={handleChange}
            rows={4}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-color)', resize: 'vertical' }}
            required
            placeholder="What will attendees learn?"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Date and Time</label>
            <input 
              type="datetime-local" 
              name="date"
              value={formData.date} 
              onChange={handleChange}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-color)' }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Event Type / Venue</label>
            <select 
              name="type"
              value={formData.type} 
              onChange={handleChange}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-color)' }}
            >
              <option value="Online">Online (Zoom/Google Meet link will be arranged)</option>
              <option value="In-Person">In-Person</option>
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Max Attendees (Seats)</label>
          <input 
            type="number" 
            name="seats"
            value={formData.seats} 
            onChange={handleChange}
            min="1"
            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-color)' }}
            required
          />
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Publishing...' : 'Publish Event'}
          </button>
        </div>
      </form>
    </div>
  );
}
