"use client";

import { useAuth } from "@/modules/module3/components/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function AdminEvents() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [activeTab, setActiveTab] = useState<"approved" | "pending">("approved");

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/module3/login");
      } else if (profile?.role !== "Admin") {
        router.push("/module3/dashboard");
      } else {
        fetchEvents();
      }
    }
  }, [user, profile, loading, router]);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/v1/module3/admin/events');
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      setEvents(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleStatusUpdate = async (eventId: string, action: 'Approve' | 'Reject') => {
    try {
      const res = await fetch(`/api/v1/module3/admin/events/${eventId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (!res.ok) throw new Error(`Failed to ${action.toLowerCase()} event`);
      toast.success(`Event ${action.toLowerCase()}d successfully`);
      fetchEvents();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading || !user || profile?.role !== "Admin") return <div className="container" style={{ padding: "4rem 0" }}>Loading...</div>;

  const approvedEvents = events.filter(e => !e.status || e.status === 'Approved');
  const pendingEvents = events.filter(e => e.status === 'Pending');

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Manage Events</h1>
        <Link href="/module3/admin/events/create" className="btn btn-primary">
          Create New Event
        </Link>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <button 
          className={`btn ${activeTab === 'approved' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('approved')}
        >
          Approved / Active Events ({approvedEvents.length})
        </button>
        <button 
          className={`btn ${activeTab === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Community Events ({pendingEvents.length})
        </button>
      </div>

      {loadingEvents ? (
        <p>Loading events...</p>
      ) : activeTab === 'approved' ? (
        approvedEvents.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
            <p>No active events found. Create your first one!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {approvedEvents.map((event) => (
              <div key={event.id} className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0' }}>{event.title}</h3>
                  <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    <span>{new Date(event.date).toLocaleDateString()}</span>
                    <span>{event.type}</span>
                    <span>Seats: {event.registeredCount || 0} / {event.seats}</span>
                    {event.organizerId && <span style={{ color: 'var(--primary-color)' }}>Community Hosted</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <Link href={`/module3/admin/events/${event.id}/registrations`} className="btn btn-secondary">
                    View Registrations
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        pendingEvents.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
            <p>No pending event submissions.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {pendingEvents.map((event) => (
              <div key={event.id} className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 0.5rem 0' }}>{event.title}</h3>
                  <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)' }}>{event.description}</p>
                  <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    <span>{new Date(event.date).toLocaleDateString()}</span>
                    <span>{event.type}</span>
                    <span>Requested Seats: {event.seats}</span>
                    <span>Submitted by: {event.speaker}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <button onClick={() => handleStatusUpdate(event.id, 'Approve')} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                    Approve
                  </button>
                  <button onClick={() => handleStatusUpdate(event.id, 'Reject')} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
