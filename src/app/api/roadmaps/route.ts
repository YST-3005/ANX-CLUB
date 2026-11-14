import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { authenticate, requireAdmin } from '@/lib/auth';
import { DEFAULT_NATIVE_ROADMAPS } from '@/lib/roadmaps';
import { getMemoryRoadmaps, addMemoryRoadmap } from '@/lib/memory-store';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let roadmaps: any[] = [];
    try {
      const snapshot = await adminDb.collection('roadmaps').get();
      
      if (!snapshot.empty) {
        const firestoreRoadmaps = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const memRoadmaps = getMemoryRoadmaps();
        const rmMap = new Map<string, any>();
        memRoadmaps.forEach(r => rmMap.set(r.id, r));
        firestoreRoadmaps.forEach(r => rmMap.set(r.id, r));
        roadmaps = Array.from(rmMap.values());
      } else {
        roadmaps = getMemoryRoadmaps();
      }
    } catch (e: any) {
      console.warn(`[GET /api/roadmaps] Firestore query fallback to memory roadmaps: ${e?.message || e}`);
      roadmaps = getMemoryRoadmaps();
    }

    if (roadmaps.length === 0) {
      roadmaps = getMemoryRoadmaps();
    }

    return NextResponse.json(roadmaps);
  } catch (error: any) {
    console.warn(`[GET /api/roadmaps] Error: ${error?.message || error}`);
    return NextResponse.json(getMemoryRoadmaps(), { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const authRes = await requireAdmin(request);
    if ('response' in authRes) return authRes.response;
    const user = authRes.user;

    const body = await request.json();
    const { 
      title, 
      category, 
      description, 
      difficulty, 
      isPremium, 
      estimatedHours, 
      steps 
    } = body;

    if (!title || !category || !description) {
      return NextResponse.json({ error: 'Missing required roadmap fields' }, { status: 400 });
    }

    const docId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `roadmap_${Date.now()}`;
    const roadmapRef = adminDb.collection('roadmaps').doc(docId);

    const newRoadmap = {
      id: docId,
      title: title.trim(),
      category: category.trim(),
      description: description.trim(),
      difficulty: difficulty || 'Intermediate',
      isPremium: Boolean(isPremium),
      estimatedHours: Number(estimatedHours) || 80,
      steps: Array.isArray(steps) && steps.length > 0 ? steps : [
        { id: `${docId}-1`, title: 'Core Fundamentals & Environment Setup', description: 'Initial setup and foundational concepts.' },
        { id: `${docId}-2`, title: 'Intermediate Implementations', description: 'Building functional modules and practice projects.' },
        { id: `${docId}-3`, title: 'Advanced Production Readiness', description: 'Performance optimization, security, and deployment.' }
      ],
      createdBy: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await roadmapRef.set({
        ...newRoadmap,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch (saveErr: any) {
      console.warn(`[POST /api/roadmaps] Firestore save fallback: ${saveErr?.message || saveErr}`);
    }

    // Always record in memory store for instant reflection in /roadmaps
    addMemoryRoadmap(newRoadmap);

    return NextResponse.json({ success: true, data: newRoadmap }, { status: 201 });
  } catch (error: any) {
    console.warn(`[POST /api/roadmaps] Error: ${error?.message || error}`);
    return NextResponse.json({ error: error?.message || 'Failed to create roadmap' }, { status: 500 });
  }
}
