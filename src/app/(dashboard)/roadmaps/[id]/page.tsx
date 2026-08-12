"use client";

import { useAuth } from "@/modules/module3/components/AuthContext";
import { getRoadmapById } from "@/modules/module7/lib/roadmaps";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase/client";
import { doc, getDoc, setDoc } from "firebase/firestore";
import toast from "react-hot-toast";

export default function RoadmapDetail({ params }: { params: { id: string } }) {
  const { user, profile, loading: authLoading } = useAuth();
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  const roadmap = getRoadmapById(params.id);
  
  if (!roadmap) {
    notFound();
  }

  useEffect(() => {
    if (user && roadmap.steps && roadmap.steps.length > 0) {
      const fetchProgress = async () => {
        try {
          const docRef = doc(db, "users", user.uid, "roadmapProgress", roadmap.id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setCompletedSteps(docSnap.data().completed || []);
          }
        } catch (error) {
          console.error("Error fetching roadmap progress:", error);
        } finally {
          setDataLoaded(true);
        }
      };
      fetchProgress();
    } else {
      setDataLoaded(true);
    }
  }, [user, roadmap.id, roadmap.steps]);

  const handleToggleStep = async (stepId: string) => {
    if (!user) {
      toast.error("Please sign in to track progress.");
      return;
    }
    
    setSaving(true);
    const newCompleted = completedSteps.includes(stepId)
      ? completedSteps.filter(id => id !== stepId)
      : [...completedSteps, stepId];
      
    setCompletedSteps(newCompleted);

    try {
      const docRef = doc(db, "users", user.uid, "roadmapProgress", roadmap.id);
      await setDoc(docRef, { completed: newCompleted }, { merge: true });
    } catch (error) {
      console.error("Error saving progress:", error);
      toast.error("Failed to save progress");
      // Revert state on error
      setCompletedSteps(completedSteps);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !dataLoaded) return <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>Loading roadmap...</div>;

  const isPremium = profile?.membershipType === "Premium" || profile?.role === "Admin";
  const locked = roadmap.isPremium && !isPremium;

  const progressPercentage = roadmap.steps && roadmap.steps.length > 0
    ? Math.round((completedSteps.length / roadmap.steps.length) * 100)
    : 0;

  return (
    <div className="container" style={{ padding: '4rem 0', maxWidth: '800px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/roadmaps" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          &larr; Back to Roadmaps
        </Link>
      </div>

      <div className="glass-panel" style={{ padding: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <h1 style={{ fontSize: '2.5rem', margin: 0 }}>{roadmap.title}</h1>
          {roadmap.isPremium && (
            <span style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--primary-color)', borderRadius: '2rem', fontSize: '0.875rem', fontWeight: 600 }}>
              Premium
            </span>
          )}
        </div>
        
        <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '3rem', lineHeight: 1.6 }}>
          {roadmap.description}
        </p>

        {locked ? (
          <div style={{ backgroundColor: 'var(--surface-color)', padding: '2rem', borderRadius: '1rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
            <h2 style={{ marginBottom: '1rem' }}>Premium Roadmap</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem auto' }}>
              This curated learning path is exclusive to Premium members. Upgrade your membership to unlock this and all other premium roadmaps.
            </p>
            <Link href="/membership" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.125rem' }}>
              Upgrade to Premium
            </Link>
          </div>
        ) : (
          <div style={{ backgroundColor: 'var(--surface-color)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
            <h2 style={{ marginBottom: '1rem' }}>Your Progress</h2>
            
            {roadmap.steps && roadmap.steps.length > 0 ? (
              <>
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Progress</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{progressPercentage}%</span>
                  </div>
                  <div style={{ width: '100%', backgroundColor: 'var(--background-color)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${progressPercentage}%`, backgroundColor: 'var(--primary-color)', height: '100%', transition: 'width 0.3s ease' }}></div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {roadmap.steps.map((step: any) => {
                    const isCompleted = completedSteps.includes(step.id);
                    return (
                      <label 
                        key={step.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '1rem', 
                          padding: '1rem', 
                          backgroundColor: isCompleted ? 'rgba(59, 130, 246, 0.1)' : 'var(--background-color)', 
                          borderRadius: '0.5rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          border: isCompleted ? '1px solid var(--primary-color)' : '1px solid var(--border-color)'
                        }}
                      >
                        <input 
                          type="checkbox" 
                          checked={isCompleted} 
                          onChange={() => handleToggleStep(step.id)}
                          disabled={saving}
                          style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
                        />
                        <span style={{ 
                          fontSize: '1rem', 
                          fontWeight: 500,
                          textDecoration: isCompleted ? 'line-through' : 'none',
                          color: isCompleted ? 'var(--text-muted)' : 'inherit'
                        }}>
                          {step.title}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                  This roadmap is hosted externally. Click the button below to launch the interactive roadmap in a new tab.
                </p>
                <a 
                  href={roadmap.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn btn-primary" 
                  style={{ display: 'inline-block', padding: '1rem 2rem', fontSize: '1.125rem' }}
                >
                  Launch Roadmap
                </a>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
