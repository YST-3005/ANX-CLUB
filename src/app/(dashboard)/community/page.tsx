"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";

export default function CommunityForums() {
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("All");

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const res = await fetch('/api/v1/community');
        if (!res.ok) throw new Error('Failed to fetch topics');
        const data = await res.json();
        setTopics(data);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTopics();
  }, []);

  if (loading) return <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>Loading forums...</div>;

  const filteredTopics = filterType === "All" ? topics : topics.filter(t => t.type === filterType);

  return (
    <div className="container" style={{ padding: '4rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', margin: 0 }}>Community Forums</h1>
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>Discuss, ask questions, and find teammates.</p>
        </div>
        <Link href="/community/new" className="btn btn-primary">
          New Topic
        </Link>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        {['All', 'Discussion', 'Question', 'Team Matchmaking'].map(type => (
          <button 
            key={type}
            onClick={() => setFilterType(type)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '2rem',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: filterType === type ? 'var(--primary-color)' : 'var(--surface-color)',
              color: filterType === type ? 'white' : 'inherit',
              fontWeight: 500
            }}
          >
            {type}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredTopics.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
            <p className="text-muted">No topics found.</p>
          </div>
        ) : (
          filteredTopics.map(topic => (
            <div key={topic.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <span style={{ 
                    padding: '0.125rem 0.5rem', 
                    borderRadius: '1rem', 
                    fontSize: '0.75rem',
                    backgroundColor: topic.type === 'Team Matchmaking' ? '#8b5cf6' : topic.type === 'Question' ? '#f59e0b' : '#3b82f6',
                    color: 'white'
                  }}>
                    {topic.type}
                  </span>
                  <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                    Posted by {topic.authorName} • {new Date(topic.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{topic.title}</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {topic.content}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {topic.tags?.map((tag: string) => (
                    <span key={tag} style={{ fontSize: '0.75rem', padding: '0.125rem 0.5rem', backgroundColor: 'var(--background-color)', borderRadius: '0.25rem' }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
              {/* Dummy replies count for visual completeness */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--background-color)', borderRadius: '0.5rem', minWidth: '80px' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>{topic.repliesCount || 0}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Replies</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
