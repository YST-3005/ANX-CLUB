"use client";

import { useAuth } from "@/modules/module3/components/AuthContext";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

export default function BookMentor({ params }: { params: { id: string } }) {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [mentor, setMentor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    topic: "",
    date: "",
    time: "",
    message: ""
  });

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error("Please log in to book a session.");
      router.push("/module3/login");
      return;
    }

    if (!authLoading && profile && profile.membershipType !== "Premium" && profile.role !== "Admin") {
      toast.error("Premium membership required to book mentors.");
      router.push("/module3/membership");
      return;
    }

    const fetchMentor = async () => {
      try {
        const res = await fetch(`/api/v1/module3/mentors/${params.id}`);
        if (!res.ok) throw new Error('Mentor not found');
        const data = await res.json();
        setMentor(data);
      } catch (err: any) {
        toast.error(err.message);
        router.push('/module3/mentors');
      } finally {
        setLoading(false);
      }
    };
    
    if (user) fetchMentor();
  }, [params.id, user, profile, authLoading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSubmitting(true);
    
    try {
      const res = await fetch(`/api/v1/module3/mentors/${params.id}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          userEmail: profile?.email || user.email,
          userName: profile?.fullName || "User",
          mentorName: mentor.name,
          ...formData
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit request");
      }

      toast.success("Session requested successfully! Check your email.");
      router.push(`/module3/mentors/${params.id}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || authLoading) return <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>Loading...</div>;
  if (!mentor) return null;

  return (
    <div className="container" style={{ padding: '4rem 0', maxWidth: '600px' }}>
      <h1 style={{ marginBottom: '1rem' }}>Request Mentorship Session</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        You are requesting a session with <strong>{mentor.name}</strong>.
      </p>

      <div className="glass-panel">
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          
          <div className="input-group">
            <label className="input-label">Select Topic</label>
            <select name="topic" className="input-field" required onChange={handleChange} value={formData.topic}>
              <option value="" disabled>Select a topic</option>
              {mentor.topics?.map((topic: string) => (
                <option key={topic} value={topic}>{topic}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="input-group">
              <label className="input-label">Preferred Date</label>
              <input type="date" name="date" className="input-field" required onChange={handleChange} value={formData.date} />
            </div>
            <div className="input-group">
              <label className="input-label">Preferred Time</label>
              <input type="time" name="time" className="input-field" required onChange={handleChange} value={formData.time} />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Message / Questions</label>
            <textarea name="message" className="input-field" rows={5} required placeholder="What do you want to achieve in this session?" onChange={handleChange} value={formData.message}></textarea>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ flex: 1 }}>
              {submitting ? "Sending Request..." : "Request Session"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => router.push(`/module3/mentors/${params.id}`)} style={{ flex: 1 }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
