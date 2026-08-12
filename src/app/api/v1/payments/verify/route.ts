import { NextRequest, NextResponse } from "next/server";
import { verifyRazorpaySignature } from "@/lib/payments/razorpay";
import { adminDb } from "@/lib/firebase/admin";
import * as admin from "firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      eventId,
      name,
      email,
      phone,
    } = await request.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !eventId) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    const isValid = verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      return NextResponse.json({ success: false, message: "Signature verification failed" }, { status: 400 });
    }

    // Execute atomic transaction for seat booking and registration creation
    const result = await adminDb.runTransaction(async (transaction) => {
      const eventRef = adminDb.collection("events").doc(eventId);
      const paymentRef = adminDb.collection("payments").doc(razorpay_order_id);
      const regQuery = adminDb.collection("eventRegistrations")
        .where("orderId", "==", razorpay_order_id)
        .limit(1);

      const [eventDoc, paymentDoc, regSnap] = await Promise.all([
        transaction.get(eventRef),
        transaction.get(paymentRef),
        transaction.get(regQuery),
      ]);

      if (!eventDoc.exists) throw new Error("EVENT_NOT_FOUND");
      if (!paymentDoc.exists) throw new Error("PAYMENT_NOT_FOUND");

      // Idempotency check: prevent duplicate registration processing
      if (!regSnap.empty) {
        return { registrationId: regSnap.docs[0].id, idempotent: true };
      }

      const eventData = eventDoc.data()!;
      const seatsAvailable = eventData.seatsAvailable;
      const seatsBooked = eventData.seatsBooked || 0;

      if (seatsAvailable !== null && seatsAvailable !== undefined && seatsBooked >= seatsAvailable) {
        throw new Error("EVENT_SOLD_OUT");
      }

      const regRef = adminDb.collection("eventRegistrations").doc();
      const registrationData = {
        eventId,
        eventTitle: eventData.title,
        userId,
        name: name || "Attendee",
        email: email || "",
        phone: phone || "",
        paymentStatus: "paid",
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        amount: paymentDoc.data()!.amount,
        registeredAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "confirmed",
      };

      transaction.set(regRef, registrationData);
      transaction.update(paymentRef, {
        status: "paid",
        paymentId: razorpay_payment_id,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      transaction.update(eventRef, {
        seatsBooked: admin.firestore.FieldValue.increment(1),
        registeredCount: admin.firestore.FieldValue.increment(1),
      });

      return { registrationId: regRef.id, idempotent: false };
    });

    return NextResponse.json({
      success: true,
      message: "Payment verified and registration confirmed!",
      data: result,
    });
  } catch (error: any) {
    console.error("[POST /api/v1/payments/verify]", error);
    const status = error.message === "EVENT_SOLD_OUT" ? 409 : 500;
    return NextResponse.json(
      { success: false, message: error.message || "Verification failed." },
      { status }
    );
  }
}
