import { NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebase/admin';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const docRef = doc(db, 'events', params.id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const body = await request.json();
    const { action } = body; // 'Approve' or 'Reject'

    if (action === 'Approve') {
      await updateDoc(docRef, { status: 'Approved' });
    } else if (action === 'Reject') {
      await updateDoc(docRef, { status: 'Rejected' });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, status: action === 'Approve' ? 'Approved' : 'Rejected' });
  } catch (error: any) {
    console.error('Error updating event status:', error);
    return NextResponse.json({ error: error.message || 'Error updating event' }, { status: 500 });
  }
}
