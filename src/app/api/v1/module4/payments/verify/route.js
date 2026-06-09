// app/api/payments/verify/route.js
import { NextResponse } from "next/server";
import { verifyRazorpaySignature } from "@/modules/module4/lib/razorpay";
import { adminDb, adminAuth } from "@/modules/module4/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { sendRegistrationConfirmation, sendPaymentConfirmation } from "@/modules/module4/lib/email";

// ─── POST /api/payments/verify ────────────────────────────────────────────────
// Verifies Razorpay signature after client-side payment.
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, eventId, name, email, phone }
export async function POST(request) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const token = request.headers.get("Authorization")?.split("Bearer ")[1];
    if (!token) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      eventId,
      name,
      email,
      phone,
    } = await request.json();

    // ── Verify signature ──────────────────────────────────────────────────────
    const isValid = verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      return NextResponse.json(
        { success: false, message: "Payment verification failed. Contact support." },
        { status: 400 }
      );
    }

    // ── Fetch event ──────────────────────────────────────────────────────────
    const eventDoc = await adminDb.collection("events").doc(eventId).get();
    if (!eventDoc.exists) {
      return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    }
    const event = { id: eventDoc.id, ...eventDoc.data() };

    // ── Fetch payment record ──────────────────────────────────────────────────
    const paymentDoc = await adminDb.collection("payments").doc(razorpay_order_id).get();
    if (!paymentDoc.exists) {
      return NextResponse.json({ success: false, message: "Payment record not found." }, { status: 404 });
    }
    const payment = paymentDoc.data();

    // ── Fetch user ────────────────────────────────────────────────────────────
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const user = userDoc.data() || {};

    // ── Atomic: create registration + update payment + increment seats ─────────
    const batch = adminDb.batch();

    const regRef = adminDb.collection("eventRegistrations").doc();
    batch.set(regRef, {
      eventId,
      eventTitle: event.title,
      userId: uid,
      name: name || user.fullName || "",
      email: email || user.email || decoded.email || "",
      phone: phone || user.phone || "",
      membershipType: user.membershipType || "free",
      paymentStatus: "paid",
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      amount: payment.amount,
      registeredAt: FieldValue.serverTimestamp(),
      status: "confirmed",
    });

    batch.update(adminDb.collection("payments").doc(razorpay_order_id), {
      status: "paid",
      paymentId: razorpay_payment_id,
      verifiedAt: FieldValue.serverTimestamp(),
    });

    batch.update(adminDb.collection("events").doc(eventId), {
      seatsBooked: FieldValue.increment(1),
    });

    await batch.commit();

    // ── Emails (non-blocking) ─────────────────────────────────────────────────
    const recipientEmail = email || user.email || decoded.email || "";
    const recipientName = name || user.fullName || "";

    Promise.all([
      sendRegistrationConfirmation({
        to: recipientEmail,
        name: recipientName,
        eventTitle: event.title,
        eventDate: new Date(event.date).toLocaleDateString("en-IN", { dateStyle: "full" }),
        eventVenue: event.venue,
      }),
      sendPaymentConfirmation({
        to: recipientEmail,
        name: recipientName,
        eventTitle: event.title,
        amount: payment.amount,
        paymentId: razorpay_payment_id,
      }),
    ]).catch((err) => console.warn("[Email]", err.message));

    return NextResponse.json({
      success: true,
      message: "Payment verified and registration confirmed!",
      data: { registrationId: regRef.id },
    });
  } catch (error) {
    console.error("[POST /api/payments/verify]", error);
    return NextResponse.json(
      { success: false, message: "Verification failed. Please contact support." },
      { status: 500 }
    );
  }
}
