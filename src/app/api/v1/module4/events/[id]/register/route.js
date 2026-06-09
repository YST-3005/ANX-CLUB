  // app/api/events/[id]/register/route.js
import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/modules/module4/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { sendRegistrationConfirmation } from "@/modules/module4/lib/email";

// ─── POST /api/events/:id/register ────────────────────────────────────────────
// Authenticated: register a logged-in member for an event.
//
// For FREE events:
//   → Directly creates an eventRegistrations record.
//   → Sends confirmation email.
//
// For PAID events:
//   → Returns paymentRequired: true + price details.
//   → Client must call /api/payments/create-order next.
//
// Body: { name, email, phone }  (pre-filled from user profile usually)
export async function POST(request, { params }) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const token = request.headers.get("Authorization")?.split("Bearer ")[1];
    if (!token) {
      return NextResponse.json({ success: false, message: "Please log in to register." }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    // ── Fetch event ──────────────────────────────────────────────────────────
    const { id: eventId } = params;
    const eventDoc = await adminDb.collection("events").doc(eventId).get();

    if (!eventDoc.exists || !eventDoc.data().isActive) {
      return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    }

    const event = { id: eventDoc.id, ...eventDoc.data() };

    // ── Deadline check ────────────────────────────────────────────────────────
    if (event.registrationDeadline) {
      const deadline = new Date(event.registrationDeadline);
      if (new Date() > deadline) {
        return NextResponse.json({ success: false, message: "Registration deadline has passed." }, { status: 400 });
      }
    }

    // ── Seat availability check ───────────────────────────────────────────────
    if (event.seatsAvailable !== null) {
      if (event.seatsBooked >= event.seatsAvailable) {
        return NextResponse.json({ success: false, message: "No seats available." }, { status: 400 });
      }
    }

    // ── Duplicate registration check ──────────────────────────────────────────
    const existingReg = await adminDb
      .collection("eventRegistrations")
      .where("userId", "==", uid)
      .where("eventId", "==", eventId)
      .limit(1)
      .get();

    if (!existingReg.empty) {
      return NextResponse.json({ success: false, message: "You are already registered for this event." }, { status: 409 });
    }

    // ── Fetch user profile ────────────────────────────────────────────────────
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const user = userDoc.data() || {};

    // ── Member-only check ─────────────────────────────────────────────────────
    if (event.eventType === "member-only") {
      if (!["premium", "admin"].includes(user.role)) {
        return NextResponse.json(
          { success: false, message: "This event is for Premium Members only." },
          { status: 403 }
        );
      }
    }

    // ── Determine effective price (premium discount) ───────────────────────────
    const isPremiumUser = user.membershipType === "premium";
    const effectivePrice =
      event.eventType === "paid"
        ? isPremiumUser && event.premiumPrice
          ? event.premiumPrice
          : event.price
        : 0;

    // ── PAID event → tell client to proceed to payment ────────────────────────
    if (effectivePrice > 0) {
      return NextResponse.json({
        success: true,
        paymentRequired: true,
        amount: effectivePrice,
        eventId,
        eventTitle: event.title,
        message: "Payment required to complete registration.",
      });
    }

    // ── FREE event → direct registration ─────────────────────────────────────
    const body = await request.json().catch(() => ({}));

    const registrationData = {
      eventId,
      eventTitle: event.title,
      userId: uid,
      name: body.name || user.fullName || "",
      email: body.email || user.email || decoded.email || "",
      phone: body.phone || user.phone || "",
      membershipType: user.membershipType || "free",
      paymentStatus: "not_required",
      paymentId: null,
      orderId: null,
      amount: 0,
      registeredAt: FieldValue.serverTimestamp(),
      status: "confirmed",
    };

    // Atomic write: add registration + increment seatsBooked
    const batch = adminDb.batch();
    const regRef = adminDb.collection("eventRegistrations").doc();
    batch.set(regRef, registrationData);
    batch.update(adminDb.collection("events").doc(eventId), {
      seatsBooked: FieldValue.increment(1),
    });
    await batch.commit();

    // ── Send confirmation email (non-blocking) ────────────────────────────────
    sendRegistrationConfirmation({
      to: registrationData.email,
      name: registrationData.name,
      eventTitle: event.title,
      eventDate: new Date(event.date).toLocaleDateString("en-IN", { dateStyle: "full" }),
      eventVenue: event.venue,
    }).catch((err) => console.warn("[Email]", err.message));

    return NextResponse.json(
      {
        success: true,
        paymentRequired: false,
        message: "Successfully registered!",
        data: { registrationId: regRef.id },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/events/:id/register]", error);
    return NextResponse.json({ success: false, message: "Registration failed. Please try again." }, { status: 500 });
  }
}
