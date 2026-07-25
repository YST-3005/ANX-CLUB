"use client";

import { useAuth } from "@/modules/module3/components/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function EventRegistrations({ params }: { params: { id: string } }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [event, setEvent] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch event details
        const eventRes = await fetch(`/api/v1/events/${params.id}`);
        if (!eventRes.ok) throw new Error('Failed to fetch event');
        const eventData = await eventRes.json();
        setEvent(eventData);

        // Fetch registrations
        const regRes = await fetch(`/api/v1/admin/events/${params.id}/registrations`);
        if (!regRes.ok) throw new Error('Failed to fetch registrations');
        const regData = await regRes.json();
        setRegistrations(regData);

      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoadingData(false);
      }
    };

    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (profile?.role !== "Admin") {
        router.push("/dashboard");
      } else {
        fetchData();
      }
    }
  }, [user, profile, loading, router, params.id]);

  if (loading || !user || profile?.role !== "Admin") return <div className="container" style={{ padding: "4rem 0" }}>Loading...</div>;

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Registrations: {event?.title || 'Loading...'}</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            <Link href="/admin/events" style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>&larr; Back to Events</Link>
          </p>
        </div>
        <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{registrations.length}</span>
          <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.875rem' }}>Total Registered</span>
        </div>
      </div>

      {loadingData ? (
        <p>Loading registrations...</p>
      ) : registrations.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>No registrations for this event yet.</p>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                <th style={{ padding: '1rem' }}>Name</th>
                <th style={{ padding: '1rem' }}>Email</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map(reg => (
                <tr key={reg.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem' }}>{reg.userName}</td>
                  <td style={{ padding: '1rem' }}>{reg.userEmail}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '1rem', 
                      fontSize: '0.75rem',
                      backgroundColor: reg.paymentStatus === 'Completed' || reg.paymentStatus === 'Free' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                      color: reg.paymentStatus === 'Completed' || reg.paymentStatus === 'Free' ? '#4ade80' : '#facc15'
                    }}>
                      {reg.paymentStatus}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                    {new Date(reg.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
