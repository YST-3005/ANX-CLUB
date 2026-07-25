"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/modules/module3/components/AuthContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import EventCard from "@/modules/module4/components/EventCard";
import EventListRow from "@/modules/module4/components/EventListRow";
import Link from "next/link";
import { Event } from "@/types";

export default function EventsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"grid" | "list" | "applied">("grid");
  const [events, setEvents] = useState<Event[]>([]);
  const [appliedEvents, setAppliedEvents] = useState<Event[]>([]);
  const [userRegisteredIds, setUserRegisteredIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/events");
      const data = await res.json();
      if (data.success) {
        setEvents(data.data);
      } else if (Array.isArray(data)) {
        setEvents(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserRegistrations = useCallback(async () => {
    if (!user) return;
    try {
      const snap = await getDocs(
        query(collection(db, "eventRegistrations"), where("userId", "==", user.uid))
      );
      const ids = snap.docs.map((d) => d.data().eventId as string);
      setUserRegisteredIds(ids);
    } catch (err) {
      console.error(err);
    }
  }, [user]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (user) {
      fetchUserRegistrations();
    }
  }, [user, fetchUserRegistrations]);

  useEffect(() => {
    setAppliedEvents(events.filter((e) => userRegisteredIds.includes(e.id)));
  }, [events, userRegisteredIds]);

  const handleRegistered = () => {
    fetchEvents();
    fetchUserRegistrations();
  };

  const filterEvents = (list: Event[]) =>
    list.filter(
      (e) =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.description.toLowerCase().includes(search.toLowerCase())
    );

  const displayEvents = filterEvents(activeTab === "applied" ? appliedEvents : events);

  return (
    <div className="container" style={{ padding: "4rem 0" }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1>Upcoming Events</h1>
          <p style={{ color: "var(--text-muted)", margin: 0 }}>Join discussions, masterclasses, and networking events.</p>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          {profile?.role === "Admin" && (
            <Link href="/events/create" className="btn btn-primary">
              Host an Event
            </Link>
          )}
        </div>
      </div>

      {/* Search and Tabs Panel */}
      <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {[
              { key: "grid", label: "Grid View" },
              { key: "list", label: "List View" },
              { key: "applied", label: "My Registrations" },
            ].map((tab) => (
              <button
                key={tab.key}
                className={`btn ${activeTab === tab.key ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setActiveTab(tab.key as any)}
                style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div style={{ position: "relative", width: "100%", maxWidth: "300px" }}>
            <input
              type="text"
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingRight: "2.5rem" }}
            />
          </div>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "2rem" }}>
          {[1, 2, 3].map((n) => (
            <div key={n} className="glass-panel" style={{ display: "flex", flexDirection: "column", height: "350px" }}>
              <div className="skeleton" style={{ width: "100%", height: "200px", marginBottom: "1rem" }}></div>
              <div className="skeleton" style={{ width: "80%", height: "1.5rem", marginBottom: "0.5rem" }}></div>
              <div className="skeleton" style={{ width: "60%", height: "1rem" }}></div>
            </div>
          ))}
        </div>
      ) : displayEvents.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: "center", padding: "4rem 2rem" }}>
          <p style={{ fontSize: "1.125rem", color: "var(--text-muted)", margin: 0 }}>
            {activeTab === "applied" ? "You haven't registered for any events yet." : "No upcoming events found matching your query."}
          </p>
        </div>
      ) : activeTab === "list" ? (
        <div className="glass-panel" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border-color)", background: "rgba(255,255,255,0.02)" }}>
                <th style={{ padding: "1rem 1.5rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>S.No</th>
                <th style={{ padding: "1rem 1.5rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>Name</th>
                <th style={{ padding: "1rem 1.5rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>Description</th>
                <th style={{ padding: "1rem 1.5rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>Date</th>
                <th style={{ padding: "1rem 1.5rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>Attend</th>
                <th style={{ padding: "1rem 1.5rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>Detail</th>
              </tr>
            </thead>
            <tbody>
              {displayEvents.map((event, i) => (
                <EventListRow
                  key={event.id}
                  event={event}
                  index={i + 1}
                  userRegisteredIds={userRegisteredIds}
                  onRegistered={handleRegistered}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "2rem" }}>
          {displayEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              userRegisteredIds={userRegisteredIds}
              onRegistered={handleRegistered}
            />
          ))}
        </div>
      )}
    </div>
  );
}
