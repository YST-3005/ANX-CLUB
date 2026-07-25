"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import MentorCard from "@/modules/module5/components/MentorCard";

export default function MentorsList() {
  const [mentors, setMentors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMentors = async () => {
      try {
        const res = await fetch('/api/v1/mentors');
        const data = await res.json();
        if (res.ok) {
          setMentors(data);
        }
      } catch (err) {
        console.error("Failed to fetch mentors", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMentors();
  }, []);

  return (
    <div className="container" style={{ padding: '4rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Find a Mentor</h1>
        <Link href="/admin/mentors/create" className="btn btn-primary">
          Create Mentor
        </Link>
      </div>
      <p style={{ fontSize: '1.125rem', color: 'var(--text-muted)', marginBottom: '3rem' }}>
        Get 1:1 guidance from industry experts to accelerate your career. (Premium Feature)
      </p>

      {loading ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
          Loading mentors...
        </div>
      ) : mentors.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
          No mentors available yet.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
          {mentors.map(mentor => (
            <MentorCard key={mentor.id} mentor={mentor} />
          ))}
        </div>
      )}
    </div>
  );
}
