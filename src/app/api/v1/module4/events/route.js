// app/api/events/route.js
import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/modules/module4/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

// ─── GET /api/events ───────────────────────────────────────────────────────────
// Public: returns all approved/active events, ordered by date desc.
// Query params:
//   ?type=free|paid|premium   → filter by event type
//   ?upcoming=true            → only future events
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get("type");
    const onlyUpcoming = searchParams.get("upcoming") === "true";

    let query = adminDb.collection("events").orderBy("date", "desc");

    if (typeFilter) {
      query = query.where("eventType", "==", typeFilter);
    }

    if (onlyUpcoming) {
      query = query.where("date", ">=", new Date().toISOString());
    }

    const snapshot = await query.get();

    const events = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ success: true, data: events }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/events]", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch events." },
      { status: 500 }
    );
  }
}

// ─── POST /api/events ──────────────────────────────────────────────────────────
// Admin only: create a new event.
// Requires Authorization: Bearer <idToken> with Admin role.
export async function POST(request) {
  try {
    // ── Auth check ──────────────────────────────────────────────────────────
    const token = request.headers.get("Authorization")?.split("Bearer ")[1];
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
    if (!userDoc.exists || userDoc.data().role !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    // ── Validate body ────────────────────────────────────────────────────────
    const body = await request.json();
    const {
      title,
      description,
      date,           // ISO string, e.g. "2026-06-10T10:00:00.000Z"
      venue,
      speakerName,
      eventType,      // "free" | "paid" | "premium" | "member-only"
      price,
      premiumPrice,
      registrationDeadline,
      seatsAvailable,
      posterUrl,
      onlineLink,
    } = body;

    // Required field validation
    const required = ["title", "description", "date", "venue", "eventType"];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, message: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    if ((eventType === "paid" || eventType === "premium") && !price) {
      return NextResponse.json(
        { success: false, message: "Price is required for paid/premium events." },
        { status: 400 }
      );
    }

    // ── Write to Firestore ───────────────────────────────────────────────────
    const eventData = {
      title,
      description,
      date,
      venue,
      speakerName: speakerName || "",
      eventType,
      price: price ? Number(price) : 0,
      premiumPrice: premiumPrice ? Number(premiumPrice) : 0,
      registrationDeadline: registrationDeadline || null,
      seatsAvailable: seatsAvailable ? Number(seatsAvailable) : null,
      seatsBooked: 0,
      posterUrl: posterUrl || "",
      onlineLink: onlineLink || "",
      createdBy: decoded.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      isActive: true,
    };

    const docRef = await adminDb.collection("events").add(eventData);

    return NextResponse.json(
      { success: true, message: "Event created.", data: { id: docRef.id, ...eventData } },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/events]", error);
    return NextResponse.json(
      { success: false, message: "Failed to create event." },
      { status: 500 }
    );
  }
}
