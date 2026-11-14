import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { authenticate, requireAdmin } from "@/lib/auth";
import { MOCK_EVENTS } from "@/lib/constants";
import { findMemoryEvent } from "@/lib/memory-store";
import { eventsRepository } from "@/lib/turso/repositories/eventsRepository";
import * as admin from "firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    let eventData: any = null;

    // Check Turso relational database first
    try {
      const tursoEvent = await eventsRepository.getById(id);
      if (tursoEvent) {
        eventData = {
          id: tursoEvent.id,
          title: tursoEvent.title,
          description: tursoEvent.description,
          date: new Date(tursoEvent.date).toISOString(),
          category: tursoEvent.category,
          capacity: tursoEvent.capacity,
          seatsBooked: tursoEvent.seats_booked,
          seatsRemaining: Math.max(0, tursoEvent.capacity - tursoEvent.seats_booked),
          venue: tursoEvent.venue,
          price: tursoEvent.price,
          isPaid: (tursoEvent as any).is_paid === 1 || tursoEvent.price > 0,
          isLive: (tursoEvent as any).is_live === 1 || tursoEvent.is_active === 1,
          bannerUrl: (tursoEvent as any).banner_url || tursoEvent.poster_url,
          tags: JSON.parse((tursoEvent as any).tags_json || '[]'),
          speakers: JSON.parse((tursoEvent as any).speakers_json || '[]'),
          agenda: JSON.parse((tursoEvent as any).agenda_json || '[]'),
          createdAt: new Date(tursoEvent.created_at).toISOString(),
          updatedAt: new Date(tursoEvent.updated_at).toISOString(),
        };
      }
    } catch (tursoErr) {
      console.warn(`Turso get event ${id} error:`, tursoErr);
    }

    if (!eventData) {
      try {
        const doc = await adminDb.collection("events").doc(id).get();
        if (doc.exists) {
          const d = doc.data() || {};
          eventData = {
            id: doc.id,
            ...d,
            date: d.date?.toDate ? d.date.toDate().toISOString() : d.date,
            createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt,
            updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate().toISOString() : d.updatedAt,
          };
        }
      } catch (dbErr) {
        console.warn(`Firestore get event ${id} error:`, dbErr);
      }
    }

    if (!eventData) {
      const memEvt = findMemoryEvent(id);
      if (memEvt) {
        eventData = { ...memEvt };
      }
    }

    if (!eventData) {
      const mockEvt = MOCK_EVENTS.find((e: any) => e.id === id);
      if (mockEvt) {
        eventData = {
          ...mockEvt,
          date: mockEvt.date instanceof Date ? mockEvt.date.toISOString() : mockEvt.date,
        };
      }
    }

    if (!eventData) {
      return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: eventData,
      ...eventData
    }, { status: 200 });
  } catch (error: any) {
    console.error("[GET /api/v1/events/:id]", error);
    return NextResponse.json({ success: false, message: "Server error.", error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authRes = await requireAdmin(request);
    if ('response' in authRes) return authRes.response;

    const { id } = params;
    const body = await request.json();
    const { createdAt, createdBy, seatsBooked, ...allowedUpdates } = body;

    await adminDb.collection("events").doc(id).update({
      ...allowedUpdates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, message: "Event updated." });
  } catch (error: any) {
    console.error("[PUT /api/v1/events/:id]", error);
    return NextResponse.json({ success: false, message: "Server error.", error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authRes = await requireAdmin(request);
    if ('response' in authRes) return authRes.response;

    const { id } = params;
    await adminDb.collection("events").doc(id).update({
      isActive: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, message: "Event deleted." });
  } catch (error: any) {
    console.error("[DELETE /api/v1/events/:id]", error);
    return NextResponse.json({ success: false, message: "Server error.", error: error.message }, { status: 500 });
  }
}
