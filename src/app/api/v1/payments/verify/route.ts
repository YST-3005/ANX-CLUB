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
      return NextResponse.json(
        { success: false, message: "Payment verification failed. Signature mismatch." },
        { status: 400 }
      );
    }

    const eventDoc = await adminDb.collection("events").doc(eventId).get();
    if (!eventDoc.exists) {
      return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    }
    const event = eventDoc.data()!;

    const paymentDoc = await adminDb.collection("payments").doc(razorpay_order_id).get();
    if (!paymentDoc.exists) {
      return NextResponse.json({ success: false, message: "Payment record not found." }, { status: 404 });
    }
    const payment = paymentDoc.data()!;

    const userDoc = await adminDb.collection("users").doc(userId).get();
    const user = userDoc.data() || {};

    const batch = adminDb.batch();

    const regRef = adminDb.collection("eventRegistrations").doc();
    batch.set(regRef, {
      eventId,
      eventTitle: event.title,
      userId,
      name: name || user.fullName || "User",
      email: email || user.email || "",
      phone: phone || user.phone || "",
      membershipType: user.membershipType || "free",
      paymentStatus: "paid",
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      amount: payment.amount,
      registeredAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "confirmed",
    });

    batch.update(adminDb.collection("payments").doc(razorpay_order_id), {
      status: "paid",
      paymentId: razorpay_payment_id,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updateFields: any = {};
    updateFields.seatsBooked = admin.firestore.FieldValue.increment(1);
    updateFields.registeredCount = admin.firestore.FieldValue.increment(1);
    batch.update(adminDb.collection("events").doc(eventId), updateFields);

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: "Payment verified and registration confirmed!",
      data: { registrationId: regRef.id },
    });
  } catch (error: any) {
    console.error("[POST /api/v1/payments/verify]", error);
    return NextResponse.json(
      { success: false, message: "Verification failed.", error: error.message },
      { status: 500 }
    );
  }
}
