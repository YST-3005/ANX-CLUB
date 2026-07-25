"use client";

import { useAuth } from "@/modules/module3/components/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

export default function Dashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const token = await user.getIdToken();
        const res = await fetch("/api/v1/module2/dashboard", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (!res.ok) throw new Error("Failed to load dashboard data");
        const data = await res.json();
        setDashboardData(data);
      } catch (error: any) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Failed to load dashboard updates.");
      } finally {
        setLoading(false);
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
    if (!selectedMentor || !user) return;
    setSubmittingReview(true);
    
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/v1/mentors/${selectedMentor.id}/reviews`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment,
          memberId: user.uid,
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

  if (authLoading || loading) return <div className="container" style={{ padding: "4rem 0", textAlign: "center" }}>Loading dashboard dashboard...</div>;

  const isPremium = profile?.membershipType === "Premium" || profile?.role === "Admin" || profile?.role === "Premium Member";

  const upcomingEvents = dashboardData?.upcomingEvents || [];
  const registeredEvents = dashboardData?.registeredEvents || [];
  const mentorBookings = dashboardData?.mentorBookings || [];
  const announcements = dashboardData?.announcements || [];
  const recommendations = dashboardData?.recommendations || [];
  const projects = dashboardData?.projects || [];

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
              <Link href="/membership" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', fontSize: '0.875rem' }}>
                Upgrade to Premium
              </Link>
            )}
          </div>
          
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Quick Links</h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li><Link href="/profile">Edit Profile</Link></li>
              <li><Link href="/events">Upcoming Events</Link></li>
              <li><Link href="/projects/my-projects">My Projects</Link></li>
              <li><Link href="/mentors">Find a Mentor</Link></li>
              {profile?.role === "Mentor" && (
                <li><Link href="/mentor-dashboard" style={{ color: 'var(--primary-color)' }}>Mentor Dashboard</Link></li>
              )}
              {profile?.role === "Admin" && (
                <li><Link href="/admin" style={{ color: 'var(--accent-color)' }}>Admin Panel</Link></li>
              )}
            </ul>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <section>
            <h2>Announcements</h2>
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {announcements.length === 0 ? (
                <p style={{ margin: 0 }}>Welcome to the ANX platform! No new announcements today.</p>
              ) : (
                announcements.map((ann: any) => (
                  <div key={ann.id} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '1rem' }}>{ann.title}</div>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem' }}>{ann.content}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="glass-panel">
              <h3>Registered Events</h3>
              {registeredEvents.length === 0 ? (
                <>
                  <p className="text-muted" style={{ marginTop: '0.5rem' }}>You haven&apos;t registered for any events yet.</p>
                  <Link href="/events" className="btn btn-secondary" style={{ marginTop: '1rem' }}>Browse Events</Link>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                  {registeredEvents.map((evt: any) => (
                    <div key={evt.id} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                      <div style={{ fontWeight: 600 }}>{evt.title}</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        {new Date(evt.date).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="glass-panel">
              <h3>Mentor Sessions</h3>
              {mentorBookings.length === 0 ? (
                <>
                  <p className="text-muted" style={{ marginTop: '0.5rem' }}>No upcoming mentorship sessions.</p>
                  <Link href="/mentors" className="btn btn-secondary" style={{ marginTop: '1rem' }}>Book a Mentor</Link>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                  {mentorBookings.slice(0, 3).map((req: any) => (
                    <div key={req.id} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                      <div style={{ fontWeight: 600 }}>{req.mentorName}</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{req.dateTime}</div>
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
            </div>
          </section>

          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>Recommended Resources</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {recommendations.slice(0, 4).map((rec: any) => (
                <div key={rec.id} className="glass-panel" style={{ flex: 1 }}>
                  <h4 style={{ marginBottom: '0.5rem' }}>{rec.title}</h4>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{rec.description}</p>
                  <a href={rec.link} target="_blank" rel="noreferrer" style={{ fontSize: '0.875rem' }}>Open Link &rarr;</a>
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
