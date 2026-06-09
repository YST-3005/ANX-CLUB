"use client";

import Link from "next/link";
import { useAuth } from "@/modules/module3/components/AuthContext";
import { useEffect, useState } from "react";
import { db } from "@/modules/module3/lib/firebase/client";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function ProjectsList() {
  const { profile } = useAuth();
  const isPremium = profile?.membershipType === "Premium" || profile?.role === "Admin";
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const q = query(collection(db, "projects"), where("approvalStatus", "==", "approved"));
        const snapshot = await getDocs(q);
        const projectsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProjects(projectsData);
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  return (
    <div className="container" style={{ padding: '4rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Project Showcase</h1>
        {isPremium ? (
          <Link href="/module3/projects/new" className="btn btn-primary">Submit Project</Link>
        ) : (
          <Link href="/module3/membership" className="btn btn-primary">Upgrade to Submit</Link>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading projects...</div>
      ) : projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No projects have been approved yet.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
          {projects.map(project => (
            <div key={project.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              {project.images && project.images.length > 0 && (
                <div style={{ width: '100%', height: '150px', backgroundImage: `url(${project.images[0]})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }} />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ marginBottom: '0.5rem' }}>{project.name}</h3>
                  <span style={{ padding: '0.25rem 0.5rem', backgroundColor: project.status === "Launched" ? 'var(--primary-color)' : 'var(--surface-color)', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600 }}>
                    {project.status}
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)' }}>{project.description}</p>
                
                <div style={{ marginTop: '1rem', marginBottom: '2rem' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Tech Stack:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {project.techStack?.map((tech: string) => (
                      <span key={tech} style={{ padding: '0.25rem 0.5rem', border: '1px solid var(--border-color)', borderRadius: '0.25rem', fontSize: '0.75rem' }}>
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <Link href={`/module3/projects/${project.id}`} className="btn btn-secondary" style={{ width: '100%', textAlign: 'center', display: 'block' }}>View Details</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
