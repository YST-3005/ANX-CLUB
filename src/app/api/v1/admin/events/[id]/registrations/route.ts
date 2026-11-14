import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { eventsRepository } from '@/lib/turso/repositories/eventsRepository';
import { adminDb } from '@/lib/firebase/admin';
import { getMemoryRegistrations } from '@/lib/memory-store';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireAdmin(request);
    if ('response' in authResult) {
      return authResult.response;
    }

    const { id: eventId } = params;

    // 1. Authoritative Turso event registrations
    try {
      const tursoRegs = await eventsRepository.getEventRegistrations(eventId);
      if (tursoRegs && tursoRegs.length > 0) {
        const formatted = tursoRegs.map((r: any) => ({
          id: r.id,
          eventId: r.event_id,
          userId: r.user_id,
          userName: r.user_name,
          userEmail: r.user_email,
          ticketId: r.ticket_id,
          paymentStatus: r.payment_status,
          amountPaid: r.amount_paid,
          registeredAt: new Date(r.registered_at).toISOString(),
          phone: r.phone_number,
          college: r.college_name,
        }));
        return NextResponse.json(formatted);
      }
    } catch (tursoErr) {
      console.warn(`[admin event registrations Turso query failed, falling back]:`, tursoErr);
    }

    // 2. Fallback to Firestore / memory store for backwards compatibility
    let registrations: any[] = [];
    try {
      const registrationsSnapshot = await adminDb.collection('eventRegistrations')
        .where('eventId', '==', eventId)
        .get();
        
      const firestoreRegs = registrationsSnapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          registeredAt: data.registeredAt?.toDate ? data.registeredAt.toDate().toISOString() : data.registeredAt || data.createdAt || new Date().toISOString()
        };
      });

      const memRegs = getMemoryRegistrations(eventId);
      const regMap = new Map<string, any>();
      memRegs.forEach(r => regMap.set(r.id, r));
      firestoreRegs.forEach(r => regMap.set(r.id, r));
      registrations = Array.from(regMap.values());
    } catch (dbErr: any) {
      console.warn(`[admin event registrations fallback to memory store]: ${dbErr?.message || dbErr}`);
      registrations = getMemoryRegistrations(eventId);
    }

    if (registrations.length === 0) {
      registrations = getMemoryRegistrations(eventId);
    }

    return NextResponse.json(registrations);
  } catch (error: any) {
    console.error('Error fetching admin event registrations:', error?.message || error);
    return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 });
  }
}
