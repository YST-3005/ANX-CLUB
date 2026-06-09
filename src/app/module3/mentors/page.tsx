"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

export default function MentorsList() {
  const [mentors, setMentors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMentors = async () => {
      try {
        const res = await fetch('/api/v1/module3/mentors');
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
        <Link href="/module3/admin/mentors/create" className="btn btn-primary">
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
            <div key={mentor.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                  {mentor.imageUrl ? (
                    <Image src={mentor.imageUrl} alt={mentor.name} width={60} height={60} style={{ borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--surface-color)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-color)' }}>
                      {mentor.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 style={{ marginBottom: '0.25rem' }}>{mentor.name}</h3>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{mentor.role} at {mentor.company}</div>
                  </div>
                </div>
                
                <div style={{ marginTop: '1rem', marginBottom: '2rem' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Topics:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {mentor.topics.map((topic: string) => (
                      <span key={topic} style={{ padding: '0.25rem 0.5rem', backgroundColor: 'var(--surface-color)', borderRadius: '0.25rem', fontSize: '0.75rem' }}>
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <Link href={`/module3/mentors/${mentor.id}`} className="btn btn-secondary" style={{ width: '100%', textAlign: 'center' }}>
                View Profile
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
