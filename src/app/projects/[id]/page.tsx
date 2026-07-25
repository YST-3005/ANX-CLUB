"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { notFound } from "next/navigation";

export default function ProjectDetail({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const docRef = doc(db, "projects", params.id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setProject({ id: docSnap.id, ...docSnap.data() });
        } else {
          setError("Project not found");
        }
      } catch (err: any) {
        console.error("Error fetching project:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [params.id]);

  if (loading) return <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>Loading...</div>;
  if (error || !project) return notFound();

  return (
    <div className="container" style={{ padding: '4rem 0', maxWidth: '900px' }}>
      <Link href="/projects" style={{ color: 'var(--primary-color)', textDecoration: 'none', marginBottom: '2rem', display: 'inline-block' }}>
        &larr; Back to Showcase
      </Link>
      
      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h1 style={{ margin: 0 }}>{project.name}</h1>
          <span style={{ padding: '0.25rem 1rem', backgroundColor: project.status === "Launched" ? 'var(--primary-color)' : 'var(--surface-color)', borderRadius: '1rem', fontWeight: 600 }}>
            {project.status}
          </span>
        </div>
        
        <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
          {project.description}
        </p>

        {project.images && project.images.length > 0 && (
          <div style={{ width: '100%', height: '400px', backgroundImage: `url(${project.images[0]})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: 'var(--radius-md)', marginBottom: '3rem' }} />
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
          <div>
            <h3>Problem Statement</h3>
            <p style={{ marginTop: '1rem', lineHeight: 1.6 }}>{project.problemStatement}</p>
          </div>
          <div>
            <h3>Tech Stack</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
              {project.techStack?.map((tech: string) => (
                <span key={tech} style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--surface-color)', borderRadius: '0.5rem' }}>
                  {tech}
                </span>
              ))}
            </div>

            <h3 style={{ marginTop: '2rem' }}>Team Members</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
              {project.teamMembers?.map((member: string) => (
                <span key={member} style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--surface-color)', borderRadius: '0.5rem' }}>
                  {member}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
          {project.github && (
            <a href={project.github} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              View on GitHub
            </a>
          )}
          {project.demo && (
            <a href={project.demo} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              Live Demo
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
