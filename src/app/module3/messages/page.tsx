"use client";

import { useAuth } from "@/modules/module3/components/AuthContext";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/modules/module3/lib/firebase/client";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import Link from "next/link";

export default function ChatList() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/module3/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.email) {
      const q = query(
        collection(db, "chats"),
        where("participants", "array-contains", user.email)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const chatsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort by updatedAt descending locally (since we can't orderBy with array-contains easily without composite index)
        chatsData.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setChats(chatsData);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching chats:", error);
        setLoading(false);
      });

      return () => unsubscribe();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  if (authLoading || loading) return <div className="container" style={{ padding: '4rem 0' }}>Loading chats...</div>;
  if (!user) return null;

  return (
    <div className="container" style={{ padding: '4rem 0', maxWidth: '800px' }}>
      <h1 style={{ marginBottom: '2rem' }}>Messages</h1>
      
      {chats.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
          <p className="text-muted">You have no active conversations.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {chats.map(chat => {
            // Find the name of the OTHER participant
            const otherParticipantEmail = chat.participants.find((p: string) => p !== user.email) || user.email;
            const otherParticipantName = chat.participantNames[otherParticipantEmail] || otherParticipantEmail;

            return (
              <Link key={chat.id} href={`/module3/messages/${chat.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="glass-panel" style={{ 
                  padding: '1.5rem', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer'
                }}>
                  <div>
                    <h3 style={{ marginBottom: '0.25rem' }}>{otherParticipantName}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '400px' }}>
                      {chat.lastMessage || "No messages yet. Say hi!"}
                    </p>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {chat.updatedAt ? new Date(chat.updatedAt).toLocaleDateString() : ''}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
