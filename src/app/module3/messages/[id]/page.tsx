"use client";

import { useAuth } from "@/modules/module3/components/AuthContext";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/modules/module3/lib/firebase/client";
import { collection, query, orderBy, onSnapshot, addDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import Link from "next/link";
import toast from "react-hot-toast";

export default function ChatRoom({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [chatInfo, setChatInfo] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/module3/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchChatAndMessages = async () => {
      if (!user?.email) return;

      try {
        // Fetch chat metadata
        const chatDocRef = doc(db, "chats", params.id);
        const chatSnap = await getDoc(chatDocRef);
        
        if (!chatSnap.exists()) {
          toast.error("Chat not found");
          router.push("/module3/messages");
          return;
        }

        const data = chatSnap.data();
        if (!data.participants.includes(user.email)) {
          toast.error("Access denied");
          router.push("/module3/messages");
          return;
        }

        setChatInfo(data);

        // Listen to messages
        const q = query(
          collection(db, "chats", params.id, "messages"),
          orderBy("createdAt", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          setMessages(msgs);
          setLoading(false);
          // Scroll to bottom
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        });

        return () => unsubscribe();

      } catch (error) {
        console.error("Error fetching chat:", error);
        setLoading(false);
      }
    };

    if (user && !authLoading) {
      fetchChatAndMessages();
    }
  }, [user, authLoading, params.id, router]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user?.email || sending) return;

    setSending(true);
    try {
      // 1. Add message to subcollection
      await addDoc(collection(db, "chats", params.id, "messages"), {
        senderId: user.email,
        text: newMessage.trim(),
        createdAt: new Date().toISOString()
      });

      // 2. Update parent chat doc
      await updateDoc(doc(db, "chats", params.id), {
        lastMessage: newMessage.trim(),
        updatedAt: new Date().toISOString()
      });

      setNewMessage("");
    } catch (error: any) {
      toast.error("Failed to send message");
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  if (authLoading || loading) return <div className="container" style={{ padding: '4rem 0' }}>Loading chat...</div>;
  if (!user || !chatInfo) return null;

  const otherParticipantEmail = chatInfo.participants.find((p: string) => p !== user.email) || user.email;
  const otherParticipantName = chatInfo.participantNames[otherParticipantEmail] || otherParticipantEmail;

  return (
    <div className="container" style={{ padding: '2rem 0', maxWidth: '800px', height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link href="/module3/messages" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          &larr; Back
        </Link>
        <h2 style={{ margin: 0 }}>{otherParticipantName}</h2>
      </div>

      <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        
        {/* Messages Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
              No messages yet. Send the first message!
            </div>
          ) : (
            messages.map(msg => {
              const isMine = msg.senderId === user.email;
              return (
                <div key={msg.id} style={{
                  alignSelf: isMine ? 'flex-end' : 'flex-start',
                  maxWidth: '70%',
                  backgroundColor: isMine ? 'var(--primary-color)' : 'var(--surface-color)',
                  color: isMine ? 'white' : 'var(--text-color)',
                  padding: '0.75rem 1rem',
                  borderRadius: isMine ? '1rem 1rem 0 1rem' : '1rem 1rem 1rem 0',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <p style={{ margin: 0, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                  <div style={{ fontSize: '0.65rem', marginTop: '0.25rem', opacity: 0.7, textAlign: isMine ? 'right' : 'left' }}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--background-color)' }}>
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              className="input-field" 
              style={{ flex: 1, marginBottom: 0 }}
              placeholder="Type a message..." 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={sending}
            />
            <button type="submit" className="btn btn-primary" disabled={!newMessage.trim() || sending}>
              {sending ? '...' : 'Send'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
