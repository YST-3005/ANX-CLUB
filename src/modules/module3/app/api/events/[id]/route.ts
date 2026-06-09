import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/client';
import { doc, getDoc } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const docRef = await getDoc(doc(db, 'events', params.id));
    
    if (!docRef.exists()) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ id: docRef.id, ...docRef.data() });
  } catch (error: any) {
    console.error('Error fetching event:', error);
    return NextResponse.json({ error: error.message || 'Error fetching event' }, { status: 500 });
  }
}
