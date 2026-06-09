"use client";

import { useAuth } from "@/modules/module3/components/AuthContext";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";

export default function MentorProfile({ params }: { params: { id: string } }) {
  const { user, profile } = useAuth();
  const router = useRouter();
  
  const [mentor, setMentor] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMentorData = async () => {
      try {
        const [mentorRes, reviewsRes] = await Promise.all([
          fetch(`/api/v1/module3/mentors/${params.id}`),
          fetch(`/api/v1/module3/mentors/${params.id}/reviews`)
        ]);
        
        if (!mentorRes.ok) throw new Error('Mentor not found');
        
        const mentorData = await mentorRes.json();
        setMentor(mentorData);
        
        if (reviewsRes.ok) {
          const reviewsData = await reviewsRes.json();
          setReviews(reviewsData);
        }
      } catch (err: any) {
        toast.error(err.message);
        router.push('/module3/mentors');
      } finally {
        setLoading(false);
      }
    };
    fetchMentorData();
  }, [params.id, router]);

  if (loading) return <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>Loading profile...</div>;
  if (!mentor) return null;

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="container" style={{ padding: '4rem 0', maxWidth: '800px' }}>
      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          
          {mentor.imageUrl ? (
            <Image src={mentor.imageUrl} alt={mentor.name} width={120} height={120} style={{ borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: 'var(--surface-color)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '3rem', fontWeight: 700, color: 'var(--primary-color)' }}>
              {mentor.name.charAt(0)}
            </div>
          )}

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 style={{ marginBottom: '0.5rem' }}>{mentor.name}</h1>
                <div style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  {mentor.role} @ {mentor.company}
                </div>
              </div>
              {averageRating && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--surface-color)', padding: '0.5rem 1rem', borderRadius: '2rem' }}>
                  <span style={{ color: '#fbbf24', fontSize: '1.25rem' }}>★</span>
                  <span style={{ fontWeight: 600 }}>{averageRating}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>({reviews.length})</span>
                </div>
              )}
            </div>

            {mentor.linkedin && (
              <a href={mentor.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'underline', display: 'inline-block', marginBottom: '1.5rem' }}>
                View LinkedIn Profile
              </a>
            )}

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>About</h3>
              <p style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{mentor.bio}</p>
            </div>

            <div style={{ marginBottom: '3rem' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>Mentorship Topics</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {mentor.topics.map((topic: string) => (
                  <span key={topic} style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--surface-color)', borderRadius: '2rem', fontSize: '0.875rem' }}>
                    {topic}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <Link href={`/module3/mentors/${mentor.id}/book`} className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.125rem' }}>
                Request a Session
              </Link>
              {mentor.ownerEmail && (
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '1rem 2rem', fontSize: '1.125rem' }}
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/v1/module3/chats', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          currentEmail: user?.email,
                          currentUserName: profile?.fullName || 'User',
                          targetEmail: mentor.ownerEmail,
                          targetUserName: mentor.name
                        })
                      });
                      if (!res.ok) throw new Error('Failed to start chat');
                      const data = await res.json();
                      router.push(`/module3/messages/${data.chatId}`);
                    } catch (error: any) {
                      toast.error(error.message);
                    }
                  }}
                >
                  Message Mentor
                </button>
              )}
            </div>
            
          </div>
        </div>
      </div>

      {reviews.length > 0 && (
        <div className="glass-panel">
          <h2 style={{ marginBottom: '1.5rem' }}>Mentee Reviews</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {reviews.map(review => (
              <div key={review.id} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 600 }}>{review.memberName}</span>
                  <div style={{ color: '#fbbf24' }}>
                    {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                  </div>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  {new Date(review.createdAt).toLocaleDateString()}
                </p>
                {review.comment && <p style={{ lineHeight: 1.5 }}>{review.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
