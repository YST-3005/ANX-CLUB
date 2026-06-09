"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ScrollReveal } from "@/modules/module3/components/ScrollReveal";
import { TiltCard } from "@/modules/module3/components/TiltCard";
import { showPremiumToast } from "@/modules/module3/lib/customToast";

export default function EventsList() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/v1/module3/events', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch events');
        const data = await res.json();
        setEvents(data);
      } catch (error: any) {
        showPremiumToast("Error loading events", error.message, "error");
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  return (
    <div className="container" style={{ padding: '4rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Upcoming Events</h1>
        <Link href="/module3/events/create" className="btn btn-primary">
          Host an Event
        </Link>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="skeleton" style={{ width: '40%', height: '1rem', marginBottom: '0.5rem' }}></div>
              <div className="skeleton" style={{ width: '80%', height: '1.5rem', marginBottom: '0.5rem' }}></div>
              <div className="skeleton" style={{ width: '60%', height: '1rem', marginBottom: '1.5rem' }}></div>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
                <div className="skeleton" style={{ width: '60px', height: '1.5rem', borderRadius: '1rem' }}></div>
                <div className="skeleton" style={{ width: '50px', height: '1.5rem', borderRadius: '1rem' }}></div>
              </div>
              <div className="skeleton" style={{ width: '100%', height: '2.5rem', borderRadius: '0.5rem' }}></div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>No upcoming events at the moment. Check back later!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
          {events.map((event, i) => (
            <ScrollReveal key={event.id} delay={i * 0.1}>
              <TiltCard>
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--primary-color)', fontWeight: 600 }}>
                  {new Date(event.date).toLocaleDateString()}
                </span>
                <h3 style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>{event.title}</h3>
                <p style={{ color: 'var(--text-muted)' }}>By {event.speaker}</p>
                
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', marginBottom: '2rem' }}>
                  <span style={{ padding: '0.25rem 0.75rem', backgroundColor: 'var(--surface-color)', borderRadius: '1rem', fontSize: '0.75rem' }}>
                    {event.type}
                  </span>
                  <span style={{ padding: '0.25rem 0.75rem', backgroundColor: 'var(--surface-color)', borderRadius: '1rem', fontSize: '0.75rem' }}>
                    {event.price === 0 ? "Free" : `₹${event.price}`}
                  </span>
                  {event.memberOnly && (
                    <span style={{ padding: '0.25rem 0.75rem', backgroundColor: 'var(--surface-color)', borderRadius: '1rem', fontSize: '0.75rem', border: '1px solid var(--secondary-color)', color: 'var(--secondary-color)' }}>
                      Members Only
                    </span>
                  )}
                </div>
              </div>
              
                <Link href={`/module3/events/${event.id}`} className="btn btn-secondary" style={{ width: '100%', textAlign: 'center' }}>
                  View Details
                </Link>
                </div>
              </TiltCard>
            </ScrollReveal>
          ))}
        </div>
      )}
    </div>
  );
}
