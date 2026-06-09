"use client";

import { useAuth } from "@/modules/module3/components/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth, db } from "@/modules/module3/lib/firebase/client";
import { collection, query, where, getDocs } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { ROADMAPS } from "@/modules/module3/lib/data/roadmaps";

export default function Dashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/module3/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (user) {
        try {
          const reqQ = query(collection(db, "mentorRequests"), where("memberId", "==", user.uid));
          const reqSnap = await getDocs(reqQ);
          const reqs = reqSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          reqs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setRequests(reqs);
        } catch (error) {
          console.error("Error fetching dashboard data:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    if (user && !authLoading) {
      fetchDashboardData();
    }
  }, [user, authLoading]);

  const handleOpenReview = (mentorId: string, mentorName: string) => {
    setSelectedMentor({ id: mentorId, name: mentorName });
    setReviewRating(5);
    setReviewComment("");
    setReviewModalOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedMentor) return;
    setSubmittingReview(true);
    
    try {
      const res = await fetch(`/api/v1/module3/mentors/${selectedMentor.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment,
          memberId: user?.uid,
          memberName: profile?.fullName || "Anonymous Member"
        })
      });

      if (!res.ok) {
        throw new Error('Failed to submit review');
      }

      toast.success('Review submitted successfully!');
      setReviewModalOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (authLoading || loading) return <div className="container" style={{ padding: "4rem 0" }}>Loading...</div>;

  const isPremium = profile?.membershipType === "Premium" || profile?.role === "Admin";

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Welcome, {profile?.fullName || 'Member'}</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '2rem' }}>
        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Membership</h3>
            <p style={{ color: isPremium ? 'var(--primary-color)' : 'var(--text-muted)', fontWeight: 600 }}>
              {profile?.membershipType || 'Free'} Member
            </p>
            {isPremium && profile?.membershipExpiry && (
              <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                Expires: {new Date(profile.membershipExpiry).toLocaleDateString()}
              </p>
            )}
            {!isPremium && (
              <Link href="/module3/membership" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', fontSize: '0.875rem' }}>
                Upgrade to Premium
              </Link>
            )}
          </div>
          
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Quick Links</h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li><Link href="/module3/profile">Edit Profile</Link></li>
              <li><Link href="/module3/events">Upcoming Events</Link></li>
              <li><Link href="/module3/events/create">Host an Event</Link></li>
              <li><Link href="/module3/projects/my-projects">My Projects</Link></li>
              <li><Link href="/module3/mentors">Find a Mentor</Link></li>
              <li><Link href="/module3/mentor-dashboard" style={{ color: 'var(--primary-color)' }}>Mentor Dashboard</Link></li>
            </ul>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <section>
            <h2>Announcements</h2>
            <div className="glass-panel">
              <p>Welcome to the new community platform! Check out the upcoming events.</p>
            </div>
          </section>

          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="glass-panel">
              <h3>Registered Events</h3>
              <p className="text-muted">You haven&apos;t registered for any events yet.</p>
              <Link href="/module3/events" className="btn btn-secondary" style={{ marginTop: '1rem' }}>Browse Events</Link>
            </div>
            
            <div className="glass-panel">
              <h3>Mentor Sessions</h3>
              {requests.length === 0 ? (
                <p className="text-muted">No upcoming mentorship sessions.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                  {requests.slice(0, 3).map(req => (
                    <div key={req.id} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                      <div style={{ fontWeight: 600 }}>{req.mentorName}</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{req.preferredDate} at {req.preferredTime}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                        <span style={{ 
                          padding: '0.125rem 0.5rem', 
                          borderRadius: '1rem', 
                          fontSize: '0.75rem',
                          backgroundColor: req.status === 'Approved' ? 'var(--primary-color)' : req.status === 'Completed' ? '#10b981' : req.status === 'Rejected' ? 'var(--accent-color)' : 'var(--surface-color)',
                          color: (req.status === 'Approved' || req.status === 'Completed') ? 'white' : 'inherit'
                        }}>
                          {req.status}
                        </span>
                        {req.status === 'Approved' && req.meetingLink && (
                          <a 
                            href={req.meetingLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-primary"
                            style={{ padding: '0.125rem 0.5rem', fontSize: '0.75rem', textDecoration: 'none' }}
                          >
                            Join Meeting
                          </a>
                        )}
                        {req.status === 'Completed' && (
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.125rem 0.5rem', fontSize: '0.75rem' }}
                            onClick={() => handleOpenReview(req.mentorId, req.mentorName)}
                          >
                            Leave Review
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Link href="/module3/mentors" className="btn btn-secondary" style={{ marginTop: '1rem' }}>Book a Mentor</Link>
            </div>
          </section>

          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>Recommended Roadmaps</h2>
              <Link href="/module3/roadmaps" style={{ fontSize: '0.875rem', color: 'var(--primary-color)' }}>View All &rarr;</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {ROADMAPS.slice(0, 4).map(roadmap => (
                <div key={roadmap.id} className="glass-panel" style={{ flex: 1 }}>
                  <h4 style={{ marginBottom: '0.5rem' }}>{roadmap.title}</h4>
                  <Link href={`/module3/roadmaps/${roadmap.id}`} style={{ fontSize: '0.875rem' }}>View Roadmap &rarr;</Link>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {reviewModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
        }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '500px', padding: '2rem' }}>
            <h2 style={{ marginBottom: '1rem' }}>Review {selectedMentor?.name}</h2>
            <div className="input-group">
              <label className="input-label">Rating (1-5)</label>
              <select className="input-field" value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))}>
                <option value={5}>5 - Excellent</option>
                <option value={4}>4 - Very Good</option>
                <option value={3}>3 - Good</option>
                <option value={2}>2 - Fair</option>
                <option value={1}>1 - Poor</option>
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Comments (Optional)</label>
              <textarea 
                className="input-field" 
                rows={4} 
                value={reviewComment} 
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="How was your session?"
              ></textarea>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn btn-primary" onClick={handleSubmitReview} disabled={submittingReview} style={{ flex: 1 }}>
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
              <button className="btn btn-secondary" onClick={() => setReviewModalOpen(false)} style={{ flex: 1 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
