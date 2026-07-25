import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/client';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const q = query(collection(db, 'mentors'), orderBy('createdAt', 'desc'));
    const mentorsSnapshot = await getDocs(q);
    const mentors = mentorsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json(mentors);
  } catch (error: any) {
    console.error('Error fetching mentors:', error);
    return NextResponse.json({ error: error.message || 'Error fetching mentors' }, { status: 500 });
  }
}

