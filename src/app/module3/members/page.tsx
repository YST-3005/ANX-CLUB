"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/modules/module3/lib/firebase/client";
import Link from "next/link";

export default function MembersDirectory() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const q = query(collection(db, "users"), where("isPublic", "==", true));
        const querySnapshot = await getDocs(q);
        const mems = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMembers(mems);
      } catch (error) {
        console.error("Error fetching members", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, []);

  if (loading) return <div className="container" style={{ padding: "4rem 0", textAlign: "center" }}>Loading members...</div>;

  return (
    <div className="container" style={{ padding: "4rem 0" }}>
      <h1 style={{ marginBottom: '1rem' }}>Member Directory</h1>
      <p className="text-muted" style={{ marginBottom: '2rem' }}>Connect and network with fellow community members.</p>
      
      {members.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: "center", padding: "3rem" }}>
          <p className="text-muted">No public members found yet. Be the first to make your profile public!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
          {members.map(member => (
            <div key={member.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '0.25rem' }}>{member.fullName}</h3>
              {member.college && <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{member.college} {member.yearBranch ? `(${member.yearBranch})` : ''}</div>}
              {member.bio && <p style={{ fontSize: '0.875rem', marginBottom: '1rem', flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{member.bio}</p>}
              
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                {member.skills?.split(',').map((skill: string) => skill.trim() && (
                  <span key={skill} style={{ fontSize: '0.75rem', padding: '0.125rem 0.5rem', backgroundColor: 'var(--surface-hover)', borderRadius: '1rem' }}>
                    {skill.trim()}
                  </span>
                ))}
              </div>
              
              <Link href={`/module3/members/${member.id}`} className="btn btn-secondary" style={{ textAlign: 'center', display: 'block', width: '100%', padding: '0.5rem', marginTop: 'auto' }}>
                View Profile
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
