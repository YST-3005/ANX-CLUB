"use client";
// app/events/page.jsx
// Forge Alumnus Events page — 100% UI match to the design screenshots.
// Tabs: List | Grid | Applied
// Features: search, view toggle, register, registered state

import { useState, useEffect, useCallback } from "react";
import { auth, db } from "@/modules/module4/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import EventCard from "@/modules/module4/components/events/EventCard";
import EventListRow from "@/modules/module4/components/events/EventListRow";

// ─── Sidebar (inline for self-containment) ────────────────────────────────────
function Sidebar() {
  const navItems = [
    { label: "Dashboard",       icon: "⊞",  href: "/dashboard", active: false },
    { label: "My Activity",     icon: "👤", href: "/activity" },
    { label: "Leaderboard",     icon: "📊", href: "/leaderboard" },
    { label: "Events",          icon: "📋", href: "/module4/events",    active: true,  badge: "Standard" },
    { label: "College Events",  icon: "🏫", href: "/college-events" },
  ];
  const hubItems = [
    { label: "Resume Builder",  icon: "📄", href: "/resume" },
    { label: "Portfolio Builder",icon: "🌐",href: "/portfolio" },
    { label: "Compiler",        icon: "</>",href: "/compiler" },
    { label: "Courses",         icon: "🎓", href: "/courses",   badge: "Standard" },
    { label: "Higher Education",icon: "🏛", href: "/higher-ed", badge: "Standard" },
    { label: "Appointments",    icon: "📅", href: "/appointments", badge: "Standard" },
    { label: "My Calendar",     icon: "🗓", href: "/calendar" },
    { label: "Career Hub",      icon: "📈", href: "/career",    badge: "Professional", badgeColor: "#22c55e" },
  ];

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">
          <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
            <path d="M8 8 L20 4 L32 8 L32 28 L20 36 L8 28 Z" fill="#f59e0b" opacity="0.9"/>
            <path d="M20 4 L32 8 L32 28 L20 36 Z" fill="#f59e0b" opacity="0.6"/>
          </svg>
        </div>
        <div>
          <div className="logo-text">FORGE ALUMNUS</div>
          <div className="logo-sub">Accelerating Futures</div>
        </div>
      </div>

      {/* Main Menu */}
      <div className="nav-section-label">MAIN MENU</div>
      <nav className="nav-list">
        {navItems.map((item) => (
          <a key={item.label} href={item.href} className={`nav-item ${item.active ? "active" : ""}`}>
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {item.badge && (
              <span className="nav-badge" style={{ background: item.badgeColor || "#3b82f6" }}>
                {item.badge}
              </span>
            )}
          </a>
        ))}
      </nav>

      {/* Student Hub */}
      <div className="nav-section-label">STUDENT HUB</div>
      <nav className="nav-list">
        {hubItems.map((item) => (
          <a key={item.label} href={item.href} className="nav-item">
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {item.badge && (
              <span className="nav-badge" style={{ background: item.badgeColor || "#3b82f6" }}>
                {item.badge}
              </span>
            )}
          </a>
        ))}
      </nav>

      <style jsx>{`
        .sidebar {
          width: 240px;
          min-width: 240px;
          background: #0d1b3e;
          height: 100vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0;
          top: 0;
          z-index: 100;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.1) transparent;
        }
        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 18px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .logo-icon { flex-shrink: 0; }
        .logo-text {
          font-size: 12px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: 0.5px;
        }
        .logo-sub {
          font-size: 9px;
          color: rgba(255,255,255,0.45);
          letter-spacing: 0.3px;
        }
        .nav-section-label {
          font-size: 10px;
          font-weight: 700;
          color: rgba(255,255,255,0.35);
          letter-spacing: 1px;
          padding: 16px 16px 6px;
        }
        .nav-list {
          display: flex;
          flex-direction: column;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          text-decoration: none;
          color: rgba(255,255,255,0.7);
          font-size: 13px;
          font-weight: 500;
          transition: background 0.15s, color 0.15s;
          border-radius: 0;
          position: relative;
        }
        .nav-item:hover { background: rgba(255,255,255,0.06); color: #fff; }
        .nav-item.active {
          background: rgba(255,255,255,0.1);
          color: #fff;
          font-weight: 600;
        }
        .nav-icon { font-size: 14px; width: 20px; text-align: center; flex-shrink: 0; }
        .nav-label { flex: 1; }
        .nav-badge {
          font-size: 9.5px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 20px;
          color: #fff;
          flex-shrink: 0;
        }
      `}</style>
    </aside>
  );
}

// ─── Navbar ────────────────────────────────────────────────────────────────────
function Navbar() {
  const [userName, setUserName] = useState("Vishnu Kanuku");

  useEffect(() => {
    const user = auth.currentUser;
    if (user?.displayName) setUserName(user.displayName);
  }, []);

  return (
    <header className="navbar">
      <div className="nav-left">
        <button className="icon-btn" title="Menu">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M3 12h18M3 6h18M3 18h18"/>
          </svg>
        </button>
        <button className="icon-btn" title="Refresh">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
        </button>
        <button className="icon-btn" title="Back">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
      </div>
      <div className="nav-right">
        <button className="icon-btn">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        </button>
        <button className="icon-btn">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
          </svg>
        </button>
        <button className="icon-btn">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
          </svg>
        </button>
        {/* Notification bell with badge */}
        <button className="icon-btn notif-btn">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span className="notif-dot">1</span>
        </button>
        {/* User */}
        <div className="user-pill">
          <div className="user-avatar">
            {userName.charAt(0).toUpperCase()}
          </div>
          <span className="user-name">{userName}</span>
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
        <button className="icon-btn">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>

      <style jsx>{`
        .navbar {
          position: fixed;
          top: 0;
          left: 240px;
          right: 0;
          height: 56px;
          background: #fff;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          z-index: 99;
        }
        .nav-left, .nav-right {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .icon-btn {
          width: 34px;
          height: 34px;
          background: none;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #475569;
          transition: background 0.15s;
        }
        .icon-btn:hover { background: #f1f5f9; }
        .notif-btn { position: relative; }
        .notif-dot {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 14px;
          height: 14px;
          background: #ef4444;
          border-radius: 50%;
          font-size: 8px;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
        }
        .user-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 10px 4px 4px;
          border-radius: 24px;
          cursor: pointer;
          border: 1px solid #e2e8f0;
          margin: 0 4px;
        }
        .user-avatar {
          width: 28px;
          height: 28px;
          background: #0d1b3e;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          color: #fff;
        }
        .user-name {
          font-size: 13px;
          font-weight: 600;
          color: #0f172a;
        }
      `}</style>
    </header>
  );
}

// ─── Main Events Page ─────────────────────────────────────────────────────────
export default function EventsPage() {
  const [activeTab, setActiveTab] = useState("grid"); // "list" | "grid" | "applied"
  const [events, setEvents] = useState([]);
  const [appliedEvents, setAppliedEvents] = useState([]);
  const [userRegisteredIds, setUserRegisteredIds] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // ── Fetch all events ─────────────────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/module4/events");
      const data = await res.json();
      if (data.success) setEvents(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch user's registered event IDs ─────────────────────────────────────
  const fetchUserRegistrations = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const snap = await getDocs(
        query(collection(db, "eventRegistrations"), where("userId", "==", user.uid))
      );
      const ids = snap.docs.map((d) => d.data().eventId);
      setUserRegisteredIds(ids);
      setAppliedEvents(events.filter((e) => ids.includes(e.id)));
    } catch (err) {
      console.error(err);
    }
  }, [events]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { fetchUserRegistrations(); }, [fetchUserRegistrations]);

  const handleRegistered = () => {
    fetchEvents();
    fetchUserRegistrations();
  };

  // ── Filter by search ──────────────────────────────────────────────────────
  const filterEvents = (list) =>
    list.filter(
      (e) =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.description.toLowerCase().includes(search.toLowerCase())
    );

  const displayEvents = filterEvents(activeTab === "applied" ? appliedEvents : events);

  // ── Format date for list view ─────────────────────────────────────────────
  function listDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div className="page-root">
      <Sidebar />
      <Navbar />

      <main className="main-content">
        {/* Page Header */}
        <div className="page-header">
          <h1 className="page-title">EVENTS</h1>
          <nav className="breadcrumb">
            <a href="/dashboard">Dashboard</a>
          </nav>
        </div>

        {/* Upgrade Banner */}
        <div className="upgrade-banner">
          <span className="upgrade-text">
            Upgrade to{" "}
            <span className="badge-pill blue">Standard Membership</span>
            {" "}or{" "}
            <span className="badge-pill blue">Professional Membership</span>
            {" "}plan to Apply for Higher Education.
          </span>
          <button className="upgrade-btn">Upgrade Membership</button>
        </div>

        {/* Tab Navigation */}
        <div className="tab-nav">
          {[
            { key: "list", label: "List" },
            { key: "grid", label: "Grid" },
            { key: "applied", label: "Applied" },
          ].map((tab) => (
            <button
              key={tab.key}
              className={`tab-btn ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="loading-state">
            <div className="loader" />
            <p>Loading events...</p>
          </div>
        ) : displayEvents.length === 0 ? (
          <div className="empty-state">
            <p>{activeTab === "applied" ? "You haven't registered for any events yet." : "No events found."}</p>
          </div>
        ) : (
          <>
            {/* ── GRID VIEW ── */}
            {activeTab === "grid" && (
              <div className="events-grid">
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

            {/* ── LIST VIEW ── */}
            {activeTab === "list" && (
              <div className="table-wrapper">
                <div className="table-search-bar">
                  <span>Search:</span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder=""
                    className="search-input"
                  />
                </div>
                <table className="events-table">
                  <thead>
                    <tr>
                      <th>S.No <span className="sort-icon">▲</span></th>
                      <th>Name <span className="sort-icon">⇅</span></th>
                      <th>Description <span className="sort-icon">⇅</span></th>
                      <th>Dates <span className="sort-icon">⇅</span></th>
                      <th>Attend <span className="sort-icon">⇅</span></th>
                      <th>Detail <span className="sort-icon">⇅</span></th>
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
            )}

            {/* ── APPLIED VIEW ── same as grid but only registered events ── */}
            {activeTab === "applied" && (
              <div className="events-grid">
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
          </>
        )}
      </main>

      {/* Floating action buttons — bottom right (matches screenshots) */}
      <div className="fab-group">
        <button className="fab phone-fab" title="Contact">
          <svg width="22" height="22" fill="#fff" viewBox="0 0 24 24">
            <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
          </svg>
        </button>
        <button className="fab bot-fab" title="AI Assistant">
          <svg width="22" height="22" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/>
            <path d="M12 7v4M8 14h.01M16 14h.01M12 14h.01"/>
          </svg>
        </button>
      </div>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', -apple-system, sans-serif; background: #f1f5f9; }
      `}</style>

      <style jsx>{`
        .page-root {
          display: flex;
          min-height: 100vh;
          background: #f1f5f9;
        }
        .main-content {
          margin-left: 240px;
          padding-top: 56px;
          flex: 1;
          min-width: 0;
          padding-left: 24px;
          padding-right: 24px;
          padding-bottom: 48px;
        }

        /* Page Header */
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 0 16px;
        }
        .page-title {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: 0.5px;
        }
        .breadcrumb a {
          font-size: 13px;
          color: #64748b;
          text-decoration: none;
        }
        .breadcrumb a:hover { color: #0f1f4a; }

        /* Upgrade Banner */
        .upgrade-banner {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }
        .upgrade-text { font-size: 13.5px; color: #374151; }
        .badge-pill {
          display: inline-block;
          padding: 2px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
        }
        .badge-pill.blue { background: #1e3a8a; color: #fff; }
        .upgrade-btn {
          padding: 8px 18px;
          background: #0f1f4a;
          color: #fff;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.18s;
        }
        .upgrade-btn:hover { background: #1e3a8a; }

        /* Tab Navigation */
        .tab-nav {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 20px;
        }
        .tab-btn {
          padding: 12px;
          border: none;
          background: transparent;
          font-size: 14px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.18s;
          text-align: center;
        }
        .tab-btn.active {
          background: #0f1f4a;
          color: #fff;
        }
        .tab-btn:not(.active):hover { background: #f8fafc; color: #0f172a; }

        /* Grid */
        .events-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        /* Table */
        .table-wrapper {
          background: #fff;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }
        .table-search-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: flex-end;
          padding: 12px 16px;
          font-size: 13px;
          color: #64748b;
          border-bottom: 1px solid #f1f5f9;
        }
        .search-input {
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          padding: 5px 10px;
          font-size: 13px;
          outline: none;
          width: 180px;
        }
        .search-input:focus { border-color: #0f1f4a; }
        .events-table {
          width: 100%;
          border-collapse: collapse;
        }
        .events-table thead tr {
          background: #f8fafc;
          border-bottom: 2px solid #e2e8f0;
        }
        .events-table th {
          padding: 12px 16px;
          font-size: 13px;
          font-weight: 700;
          color: #374151;
          text-align: left;
          white-space: nowrap;
        }
        .sort-icon { font-size: 10px; color: #94a3b8; margin-left: 4px; }

        /* Loading / empty */
        .loading-state, .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 80px 0;
          color: #64748b;
        }
        .loader {
          width: 36px;
          height: 36px;
          border: 3px solid #e2e8f0;
          border-top-color: #0f1f4a;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* FABs */
        .fab-group {
          position: fixed;
          bottom: 24px;
          right: 24px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          z-index: 200;
        }
        .fab {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(0,0,0,0.2);
          transition: transform 0.18s, box-shadow 0.18s;
        }
        .fab:hover { transform: scale(1.08); box-shadow: 0 8px 24px rgba(0,0,0,0.25); }
        .phone-fab { background: #0f1f4a; }
        .bot-fab { background: #0f1f4a; }
      `}</style>
    </div>
  );
}
