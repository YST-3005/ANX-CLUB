"use client";

import { useAuth } from "@/modules/module3/components/AuthContext";
import Link from "next/link";
import { ROADMAPS } from "@/modules/module3/lib/data/roadmaps";

export default function RoadmapsList() {
  const { profile } = useAuth();
  const isPremium = profile?.membershipType === "Premium" || profile?.role === "Admin";

  return (
    <div className="container" style={{ padding: '4rem 0' }}>
      <h1 style={{ marginBottom: '2rem' }}>Learning Roadmaps</h1>
      <p style={{ fontSize: '1.125rem', color: 'var(--text-muted)', marginBottom: '3rem' }}>
        Curated paths to help you master new skills.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
        {ROADMAPS.map(roadmap => {
          const locked = roadmap.isPremium && !isPremium;
          return (
            <div key={roadmap.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ marginBottom: '0.5rem' }}>{roadmap.title}</h3>
                  {roadmap.isPremium && (
                    <span style={{ padding: '0.25rem 0.5rem', backgroundColor: 'var(--primary-color)', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600 }}>
                      Premium
                    </span>
                  )}
                </div>
                <p style={{ color: 'var(--text-muted)' }}>{roadmap.description}</p>
              </div>
              
              <Link href={`/module3/roadmaps/${roadmap.id}`} className={locked ? "btn btn-primary" : "btn btn-secondary"} style={{ width: '100%', textAlign: 'center', marginTop: '2rem' }}>
                {locked ? "Upgrade to Unlock" : "View Roadmap Details"}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
