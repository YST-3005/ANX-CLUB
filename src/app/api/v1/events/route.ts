import { NextRequest, NextResponse } from "next/server";
import { eventsRepository } from "@/lib/turso/repositories/eventsRepository";
import { authenticateUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    // Seed default events if newly initialized
    await eventsRepository.seedDefaultEventsIfEmpty().catch(() => {});

    const events = await eventsRepository.listUpcoming(limit);

    // Map to API DTO
    const mapped = events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description || '',
      date: e.date,
      time: e.time || '10:00 AM',
      duration: e.duration_minutes,
      venue: e.venue || (e.is_online ? 'Online Live Stream' : 'Campus Hall A'),
      isOnline: Boolean(e.is_online),
      meetingLink: e.meeting_link || '',
      category: e.category,
      eventType: e.event_type,
      price: e.price,
      premiumPrice: e.premium_price,
      capacity: e.capacity,
      seatsBooked: e.seats_booked,
      seatsAvailable: Math.max(0, e.capacity - e.seats_booked),
      registrationDeadline: e.registration_deadline,
      posterUrl: e.poster_url || '',
      speaker: e.speaker || 'ANX Mentor',
      speakerBio: e.speaker_bio || '',
      speakerImage: e.speaker_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(e.speaker || 'Speaker')}&background=8b5cf6&color=fff`,
      status: e.status,
      isActive: Boolean(e.is_active),
    }));

    const isRawArrayRequest = request.headers.get("referer")?.includes("/module") || request.url.includes("module");

    let response: NextResponse;
    if (isRawArrayRequest) {
      response = NextResponse.json(mapped, { status: 200 });
    } else {
      response = NextResponse.json(
        { success: true, data: mapped, count: mapped.length },
        { status: 200 }
      );
    }

    response.headers.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
    return response;
  } catch (error: any) {
    console.error("[GET /api/v1/events] Error:", error);
    return NextResponse.json({ success: false, data: [], count: 0 }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateUser(request);
    if (!user || user.role.toLowerCase() !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin authorization required.' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const title = body.title?.trim() || "ANX Masterclass Workshop";
    const date = body.date?.trim() || new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0];
    const category = body.category || body.eventType || "workshop";
    const id = body.id || `evt_${Date.now()}`;

    const created = await eventsRepository.upsert({
      id,
      title,
      description: body.description?.trim(),
      date,
      time: body.time?.trim() || "10:00 AM",
      duration_minutes: Number(body.duration) || 60,
      venue: body.venue?.trim(),
      is_online: body.isOnline !== undefined ? (body.isOnline ? 1 : 0) : 1,
      meeting_link: body.meetingLink || body.onlineLink || null,
      category,
      event_type: body.eventType || "free",
      price: Number(body.price || 0),
      premium_price: Number(body.premiumPrice || 0),
      capacity: Number(body.capacity || 100),
      seats_booked: 0,
      registration_deadline: body.registrationDeadline || null,
      poster_url: body.posterUrl || null,
      speaker: body.speaker || body.speakerName || null,
      speaker_bio: body.speakerBio || null,
      speaker_image: body.speakerImage || null,
      status: "Published",
      is_published: 1,
      is_active: 1,
      organizer_id: user.uid,
    });

    return NextResponse.json(
      { success: true, message: "Event created successfully.", data: created },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[POST /api/v1/events] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create event.", error: error?.message || error },
      { status: 500 }
    );
  }
}
