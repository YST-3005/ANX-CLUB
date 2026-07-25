"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import Link from "next/link";
import toast from "react-hot-toast";

export default function AdminMentors() {
  const [mentors, setMentors] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"requests" | "profiles">("requests");

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Mentors
      const mentorsSnap = await getDocs(query(collection(db, 'mentors'), orderBy('createdAt', 'desc')));
      setMentors(mentorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Fetch Requests
      const requestsSnap = await getDocs(query(collection(db, 'mentorRequests'), orderBy('createdAt', 'desc')));
      setRequests(requestsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load mentor data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateStatus = async (requestId: string, newStatus: string) => {
    try {
      // We call the API so it can send the email
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
      fetchData(); // Refresh list
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) return <div className="container" style={{ padding: '4rem 0' }}>Loading mentor management...</div>;

  return (
    <div className="container" style={{ padding: '4rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Mentor Management</h1>
        <Link href="/admin/mentors/create" className="btn btn-primary">Create Mentor Profile</Link>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <button 
          className={`btn ${activeTab === 'requests' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('requests')}
        >
          Booking Requests ({requests.length})
        </button>
        <button 
          className={`btn ${activeTab === 'profiles' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('profiles')}
        >
          Mentor Profiles ({mentors.length})
        </button>
      </div>

      {activeTab === 'requests' && (
        <div className="glass-panel">
          <h2>Mentorship Requests</h2>
          {requests.length === 0 ? (
            <p style={{ marginTop: '1rem' }}>No booking requests found.</p>
          ) : (
            <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '1rem 0' }}>Member</th>
                    <th>Mentor</th>
                    <th>Date & Time</th>
                    <th>Topic</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(req => (
                    <tr key={req.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem 0' }}>
                        <div style={{ fontWeight: 600 }}>{req.memberName}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{req.memberEmail}</div>
                      </td>
                      <td>{req.mentorName}</td>
                      <td>
                        <div>{req.preferredDate}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{req.preferredTime}</div>
                      </td>
                      <td>{req.topic}</td>
                      <td>
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
                      <td>
                        {req.status === 'Pending' && (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
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
      )}

      {activeTab === 'profiles' && (
        <div className="glass-panel">
          <h2>Active Mentors</h2>
          {mentors.length === 0 ? (
            <p style={{ marginTop: '1rem' }}>No mentors found. Create one to get started.</p>
          ) : (
            <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '1rem 0' }}>Name</th>
                    <th>Role & Company</th>
                    <th>Topics</th>
                  </tr>
                </thead>
                <tbody>
                  {mentors.map(mentor => (
                    <tr key={mentor.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem 0', fontWeight: 600 }}>{mentor.name}</td>
                      <td>
                        <div>{mentor.role}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{mentor.company}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                          {mentor.topics?.map((t: string) => (
                            <span key={t} style={{ padding: '0.25rem 0.5rem', backgroundColor: 'var(--surface-color)', borderRadius: '0.25rem', fontSize: '0.75rem' }}>{t}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

