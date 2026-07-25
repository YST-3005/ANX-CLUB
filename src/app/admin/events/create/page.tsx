"use client";

import { useAuth } from "@/modules/module3/components/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function CreateEvent() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    type: "Online",
    price: 0,
    premiumPrice: 0,
    memberOnly: false,
    speaker: "",
    seats: 50,
    imageUrl: ""
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) router.push("/login");
      else if (profile?.role !== "Admin") router.push("/dashboard");
    }
  }, [user, profile, loading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to create event');
      
      toast.success('Event created successfully!');
      router.push('/admin/events');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user || profile?.role !== "Admin") return <div className="container" style={{ padding: "4rem 0" }}>Loading...</div>;

  return (
    <div className="container" style={{ padding: '2rem 0', maxWidth: '800px' }}>
      <h1 style={{ marginBottom: '2rem' }}>Create New Event</h1>
      
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
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Event Type</label>
            <select 
              name="type"
              value={formData.type} 
              onChange={handleChange}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-color)' }}
            >
              <option value="Online">Online</option>
              <option value="In-Person">In-Person</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Regular Price (₹)</label>
            <input 
              type="number" 
              name="price"
              value={formData.price} 
              onChange={handleChange}
              min="0"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-color)' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Premium Member Price (₹)</label>
            <input 
              type="number" 
              name="premiumPrice"
              value={formData.premiumPrice} 
              onChange={handleChange}
              min="0"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-color)' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Total Seats</label>
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
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Speaker / Mentor Name</label>
            <input 
              type="text" 
              name="speaker"
              value={formData.speaker} 
              onChange={handleChange}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-color)' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input 
            type="checkbox" 
            name="memberOnly"
            id="memberOnly"
            checked={formData.memberOnly} 
            onChange={handleChange}
            style={{ width: '1.25rem', height: '1.25rem' }}
          />
          <label htmlFor="memberOnly" style={{ fontWeight: 600 }}>Member Only Event (Requires Premium Membership)</label>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Event'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => router.push('/admin/events')} disabled={submitting}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
