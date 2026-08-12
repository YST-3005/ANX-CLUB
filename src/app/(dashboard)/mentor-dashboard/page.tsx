"use client";

import { useAuth } from "@/modules/module3/components/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import { collection, query, where, getDocs } from "firebase/firestore";
import toast from "react-hot-toast";

export default function MentorDashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [mentorProfile, setMentorProfile] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchMentorData = async () => {
      const email = profile?.email || user?.email;
      if (user && email) {
        try {
          // 1. Check if user is linked to a mentor profile
          const mentorQ = query(collection(db, "mentors"), where("ownerEmail", "==", email));
          const mentorSnap = await getDocs(mentorQ);
          
          if (mentorSnap.empty) {
            setLoading(false);
            return;
          }

          const mentorData = { id: mentorSnap.docs[0].id, ...mentorSnap.docs[0].data() };
          setMentorProfile(mentorData);

          // 2. Fetch requests for this mentor
          const reqQ = query(collection(db, "mentorRequests"), where("mentorId", "==", mentorData.id));
          const reqSnap = await getDocs(reqQ);
          const reqs = reqSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          reqs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setRequests(reqs);

        } catch (error) {
          console.error("Error fetching mentor data:", error);
          toast.error("Failed to load dashboard data.");
        } finally {
          setLoading(false);
        }
      }
    };

    if (user && !authLoading) {
      fetchMentorData();
    }
  }, [user, profile, authLoading]);

  const handleUpdateStatus = async (requestId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/v1/admin/mentor-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }

      toast.success(`Request marked as ${newStatus}`);
      
      // Update local state
      setRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, status: newStatus } : req
      ));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (authLoading || loading) return <div className="container" style={{ padding: "4rem 0" }}>Loading...</div>;

  if (!mentorProfile) {
    return (
      <div className="container" style={{ padding: "4rem 0", textAlign: "center" }}>
        <h1>Mentor Dashboard</h1>
        <div className="glass-panel" style={{ marginTop: "2rem", padding: "3rem" }}>
          <h2>Access Denied</h2>
          <p className="text-muted" style={{ marginTop: "1rem" }}>
            Your account is not linked to any active mentor profile. 
            If you believe this is a mistake, please contact an administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '4rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Mentor Dashboard</h1>
          <p className="text-muted" style={{ marginTop: "0.5rem" }}>Managing sessions for {mentorProfile.name}</p>
        </div>
      </div>

      <div className="glass-panel">
        <h2>Your Session Requests</h2>
        {requests.length === 0 ? (
          <p style={{ marginTop: '1rem', color: "var(--text-muted)" }}>You don&apos;t have any booking requests yet.</p>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '1rem 0' }}>Member</th>
                  <th>Date & Time</th>
                  <th>Topic & Message</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem 0', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 600 }}>{req.memberName}</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{req.memberEmail}</div>
                    </td>
                    <td style={{ verticalAlign: 'top', paddingTop: '1rem' }}>
                      <div style={{ fontWeight: 500 }}>{req.preferredDate}</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{req.preferredTime}</div>
                    </td>
                    <td style={{ verticalAlign: 'top', paddingTop: '1rem', maxWidth: '300px' }}>
                      <div style={{ fontWeight: 600 }}>{req.topic}</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{req.message}</div>
                    </td>
                    <td style={{ verticalAlign: 'top', paddingTop: '1rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '1rem', 
                        fontSize: '0.75rem',
                        backgroundColor: req.status === 'Approved' ? 'var(--primary-color)' : req.status === 'Rejected' ? 'var(--accent-color)' : 'var(--surface-color)',
                        color: req.status === 'Approved' ? 'white' : 'inherit'
                      }}>
                        {req.status}
                      </span>
                    </td>
                    <td style={{ verticalAlign: 'top', paddingTop: '1rem' }}>
                      {req.status === 'Pending' && (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button onClick={() => handleUpdateStatus(req.id, 'Approved')} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>Approve</button>
                          <button onClick={() => handleUpdateStatus(req.id, 'Rejected')} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>Reject</button>
                        </div>
                      )}
                      {req.status === 'Approved' && (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button onClick={() => handleUpdateStatus(req.id, 'Completed')} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>Mark Completed</button>
                          {req.meetingLink && (
                            <a href={req.meetingLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', textDecoration: 'none' }}>
                              Join Meeting
                            </a>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

