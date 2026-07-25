"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import Link from "next/link";
import { useAuth } from "@/modules/module3/components/AuthContext";

export default function MemberProfile({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMember = async () => {
      try {
        const docRef = doc(db, "users", params.id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().isPublic) {
          setMember({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (error) {
        console.error("Error fetching member", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMember();
  }, [params.id]);

  if (loading) return <div className="container" style={{ padding: "4rem 0", textAlign: "center" }}>Loading profile...</div>;

  if (!member) {
    return (
      <div className="container" style={{ padding: "4rem 0", textAlign: "center" }}>
        <h1>Profile Not Found</h1>
        <p className="text-muted" style={{ marginTop: '1rem' }}>This profile is either private or does not exist.</p>
        <Link href="/members" className="btn btn-primary" style={{ marginTop: '2rem', display: 'inline-block' }}>Back to Directory</Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: "4rem 0", maxWidth: "800px" }}>
      <Link href="/members" style={{ color: 'var(--primary-color)', textDecoration: 'none', marginBottom: '2rem', display: 'inline-block' }}>
        &larr; Back to Directory
      </Link>
      
      <div className="glass-panel" style={{ padding: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{member.fullName}</h1>
        {member.college && <div style={{ fontSize: '1.125rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{member.college} {member.yearBranch ? `(${member.yearBranch})` : ''}</div>}
        
        {member.bio && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>About</h3>
            <p style={{ lineHeight: 1.6 }}>{member.bio}</p>
          </div>
        )}

        {member.skills && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Skills</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {member.skills.split(',').map((skill: string) => skill.trim() && (
                <span key={skill} style={{ padding: '0.25rem 0.75rem', backgroundColor: 'var(--surface-hover)', borderRadius: '1rem', fontWeight: 500 }}>
                  {skill.trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        {member.interests && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Interests</h3>
            <p style={{ lineHeight: 1.6 }}>{member.interests}</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
          {member.linkedin && <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">LinkedIn</a>}
          {member.github && <a href={member.github} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">GitHub</a>}
          {member.portfolio && <a href={member.portfolio} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">Portfolio</a>}
          {user && <a href={`mailto:${member.email}`} className="btn btn-primary">Send Email</a>}
        </div>
      </div>
    </div>
  );
}
