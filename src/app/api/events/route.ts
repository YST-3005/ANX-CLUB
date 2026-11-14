import { NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebase/admin';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const q = db.collection('events').orderBy('date', 'asc');
    const eventsSnapshot = await q.get();
    
    // Filter out pending events in memory to avoid needing a composite index for now
    const events = eventsSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter((e: any) => !e.status || e.status === 'Approved');

    return NextResponse.json(events);
  } catch (error: any) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: error.message || 'Error fetching events' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth(request);
    if ('response' in authResult) {
      return authResult.response;
    }
    const { user } = authResult;

    const body = await request.json();
    const { title, description, date, type, seats, speaker, price, premiumPrice, memberOnly } = body;

    if (!title || !description || !date || !type || !seats) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const isAdmin = user.role.toLowerCase() === 'admin';
    const organizerId = user.uid;

    const eventData = {
      title,
      description,
      date,
      type,
      seats: Number(seats),
      speaker: speaker || user.email || 'Community Member',
      price: Number(price) || 0,
      premiumPrice: Number(premiumPrice) || 0,
      memberOnly: Boolean(memberOnly),
      organizerId,
      registeredCount: 0,
      status: isAdmin ? 'Approved' : 'Pending', // Only admins can auto-publish
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('events').add(eventData);

    return NextResponse.json({ id: docRef.id, ...eventData }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating event:', error);
    return NextResponse.json({ error: error.message || 'Error creating event' }, { status: 500 });
  }
}
