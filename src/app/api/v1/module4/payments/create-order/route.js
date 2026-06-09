// app/api/payments/create-order/route.js
import { NextResponse } from "next/server";
import { razorpay } from "@/modules/module4/lib/razorpay";
import { adminDb, adminAuth } from "@/modules/module4/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

// ─── POST /api/payments/create-order ─────────────────────────────────────────
// Creates a Razorpay order for a paid event.
// Body: { eventId }
export async function POST(request) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const token = request.headers.get("Authorization")?.split("Bearer ")[1];
    if (!token) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const { eventId } = await request.json();
    if (!eventId) {
      return NextResponse.json({ success: false, message: "eventId is required." }, { status: 400 });
    }

    // ── Fetch event ──────────────────────────────────────────────────────────
    const eventDoc = await adminDb.collection("events").doc(eventId).get();
    if (!eventDoc.exists || !eventDoc.data().isActive) {
      return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    }
    const event = { id: eventDoc.id, ...eventDoc.data() };

    // ── Seat / deadline check ─────────────────────────────────────────────────
    if (event.seatsAvailable !== null && event.seatsBooked >= event.seatsAvailable) {
      return NextResponse.json({ success: false, message: "No seats available." }, { status: 400 });
    }

    // ── Determine amount with premium discount ────────────────────────────────
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const user = userDoc.data() || {};
    const isPremium = user.membershipType === "premium";
    const amount =
      isPremium && event.premiumPrice ? event.premiumPrice : event.price;

    // ── Duplicate guard ───────────────────────────────────────────────────────
    const existingReg = await adminDb
      .collection("eventRegistrations")
      .where("userId", "==", uid)
      .where("eventId", "==", eventId)
      .limit(1)
      .get();
    if (!existingReg.empty) {
      return NextResponse.json({ success: false, message: "Already registered." }, { status: 409 });
    }

    // ── Create Razorpay order ─────────────────────────────────────────────────
    const order = await razorpay.orders.create({
      amount: amount * 100,           // Razorpay needs paise
      currency: "INR",
      receipt: `evt_${eventId}_${uid.slice(0, 8)}`,
      notes: {
        eventId,
        userId: uid,
        eventTitle: event.title,
      },
    });

    // ── Store pending payment record ──────────────────────────────────────────
    await adminDb.collection("payments").doc(order.id).set({
      orderId: order.id,
      eventId,
      eventTitle: event.title,
      userId: uid,
      amount,
      currency: "INR",
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount,
      currency: "INR",
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      prefill: {
        name: user.fullName || "",
        email: user.email || decoded.email || "",
        contact: user.phone || "",
      },
    });
  } catch (error) {
    console.error("[POST /api/payments/create-order]", error);
    return NextResponse.json({ success: false, message: "Could not create payment order." }, { status: 500 });
  }
}
