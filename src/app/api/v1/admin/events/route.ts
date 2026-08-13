import { NextResponse, NextRequest } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { authenticate } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userId = await authenticate(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const userDoc = await getAdminDb().collection("users").doc(userId).get();
    if (!userDoc.exists || userDoc.data()?.role?.toLowerCase() !== "admin") {
      return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 });
    }

    const eventsSnapshot = await getAdminDb().collection('events').orderBy('createdAt', 'desc').get();
    const events = eventsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json(events);
  } catch (error: any) {
    console.error('Error fetching admin events:', error);
    return NextResponse.json({ error: error.message || 'Error fetching events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await authenticate(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const userDoc = await getAdminDb().collection("users").doc(userId).get();
    if (!userDoc.exists || userDoc.data()?.role?.toLowerCase() !== "admin") {
      return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, date, type, price, premiumPrice, memberOnly, speaker, seats, imageUrl } = body;

    if (!title || !date || !type || !seats) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const eventData = {
      title,
      description: description || '',
      date,
      type,
      price: Number(price) || 0,
      premiumPrice: Number(premiumPrice) || 0,
      memberOnly: Boolean(memberOnly),
      speaker: speaker || '',
      seats: Number(seats) || 0,
      registeredCount: 0,
      imageUrl: imageUrl || '',
      status: 'Approved', // Admin created events are automatically approved
      createdAt: new Date().toISOString()
    };

    const docRef = await getAdminDb().collection('events').add(eventData);

    return NextResponse.json({ id: docRef.id, ...eventData }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating event:', error);
    return NextResponse.json({ error: error.message || 'Error creating event' }, { status: 500 });
  }
}
