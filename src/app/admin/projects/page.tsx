"use client";

import { useAuth } from "@/modules/module3/components/AuthContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase/client";
import { collection, query, where, getDocs } from "firebase/firestore";
import Link from "next/link";
import toast from "react-hot-toast";

export default function AdminProjects() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile && profile.role !== "Admin") {
      router.push("/dashboard");
      return;
    }

    const fetchPendingProjects = async () => {
      try {
        const q = query(collection(db, "projects"), where("approvalStatus", "==", "pending"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProjects(data);
      } catch (error) {
        console.error("Error fetching pending projects:", error);
      } finally {
        setLoading(false);
      }
    };

    if (profile?.role === "Admin") {
      fetchPendingProjects();
    }
  }, [profile, router]);

  const handleUpdate = async (projectId: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch("/api/v1/admin/projects/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminUid: user?.uid,
          projectId,
          status
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`Project ${status} successfully!`);
      // Remove from list
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (!profile || profile.role !== "Admin") return null;

  return (
    <div className="container" style={{ padding: '4rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Review Submitted Projects</h1>
        <Link href="/admin" className="btn btn-secondary">Back to Admin</Link>
      </div>

      <div className="glass-panel">
        {loading ? (
          <p>Loading...</p>
        ) : projects.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No pending projects to review.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {projects.map((project) => (
              <div key={project.id} style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ flex: 1, minWidth: '300px' }}>
                  <h3 style={{ margin: '0 0 0.5rem 0' }}>{project.name}</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{project.description}</p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem', fontSize: '0.875rem' }}>
                    <strong>Author:</strong> <span>{project.userId}</span>
                    <strong>Status:</strong> <span>{project.status}</span>
                    <strong>Tech Stack:</strong> <span>{project.techStack?.join(", ")}</span>
                    <strong>Links:</strong> 
                    <span>
                      {project.github && <a href={project.github} target="_blank" rel="noreferrer">GitHub</a>}
                      {project.github && project.demo && " | "}
                      {project.demo && <a href={project.demo} target="_blank" rel="noreferrer">Demo</a>}
                    </span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-primary" onClick={() => handleUpdate(project.id, 'approved')}>Approve</button>
                  <button className="btn btn-secondary" onClick={() => handleUpdate(project.id, 'rejected')} style={{ borderColor: 'red', color: 'red' }}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

