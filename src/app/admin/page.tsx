"use client";

import { useAuth } from "@/modules/module3/components/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, where, getCountFromServer } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export default function AdminDashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState({
    totalUsers: 0,
    premiumMembers: 0,
    totalEvents: 0,
    pendingProjects: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else if (profile?.role !== "Admin") {
        router.push("/dashboard");
      }
    }
  }, [user, profile, authLoading, router]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch Total Users
        const usersSnap = await getCountFromServer(collection(db, "users"));
        
        // Fetch Premium Members (this needs a getDocs or count query if we index it, let's just use a query)
        const premiumSnap = await getCountFromServer(query(collection(db, "users"), where("membershipType", "==", "Premium")));
        
        // Fetch Total Events
        const eventsSnap = await getCountFromServer(collection(db, "events"));

        // Fetch Pending Mentor Requests (as a placeholder for pending projects for now, or if projects collection exists, count that)
        // Let's try counting 'projects' where status == 'Pending'
        let pendingProjectsCount = 0;
        try {
           const projectsSnap = await getCountFromServer(query(collection(db, "projects"), where("status", "==", "Pending")));
           pendingProjectsCount = projectsSnap.data().count;
        } catch (e) {
           console.log("No projects collection found or error:", e);
        }

        setStats({
          totalUsers: usersSnap.data().count,
          premiumMembers: premiumSnap.data().count,
          totalEvents: eventsSnap.data().count,
          pendingProjects: pendingProjectsCount
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoadingStats(false);
      }
    };

    if (user && profile?.role === "Admin") {
      fetchStats();
    }
  }, [user, profile]);

  if (authLoading || !user || profile?.role !== "Admin") return <div className="container" style={{ padding: "4rem 0" }}>Loading...</div>;

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Admin Dashboard</h1>
      </div>

      {/* Stats */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <div className="glass-panel" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary-color)' }}>
            {loadingStats ? "..." : stats.totalUsers}
          </div>
          <div style={{ color: 'var(--text-muted)' }}>Total Users</div>
        </div>
        <div className="glass-panel" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--secondary-color)' }}>
            {loadingStats ? "..." : stats.premiumMembers}
          </div>
          <div style={{ color: 'var(--text-muted)' }}>Premium Members</div>
        </div>
        <div className="glass-panel" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>
            {loadingStats ? "..." : stats.totalEvents}
          </div>
          <div style={{ color: 'var(--text-muted)' }}>Total Events</div>
        </div>
        <div className="glass-panel" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>
            {loadingStats ? "..." : stats.pendingProjects}
          </div>
          <div style={{ color: 'var(--text-muted)' }}>Pending Projects</div>
        </div>
      </section>

      {/* Navigation */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div className="glass-panel">
          <h2>Manage Users</h2>
          <p className="text-muted">View all members and manage their membership status.</p>
          <Link href="/admin/users" className="btn btn-secondary" style={{ marginTop: '1rem' }}>View Users</Link>
        </div>

        <div className="glass-panel">
          <h2>Manage Events</h2>
          <p className="text-muted">Create, edit, and view registrations for events.</p>
          <Link href="/admin/events" className="btn btn-secondary" style={{ marginTop: '1rem' }}>Manage Events</Link>
        </div>

        <div className="glass-panel">
          <h2>Mentor Bookings</h2>
          <p className="text-muted">Approve or reject mentorship session requests.</p>
          <Link href="/admin/mentors" className="btn btn-secondary" style={{ marginTop: '1rem' }}>View Requests</Link>
        </div>

        <div className="glass-panel">
          <h2>Project Submissions</h2>
          <p className="text-muted">Review and approve member project submissions.</p>
          <Link href="/admin/projects" className="btn btn-secondary" style={{ marginTop: '1rem' }}>Review Projects</Link>
        </div>
      </section>
    </div>
  );
}

