import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { authenticate } from "@/lib/auth";
import * as admin from "firebase-admin";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await authenticate(request);
    if (!userId) {
      return NextResponse.json({ success: false, message: "Please log in to register." }, { status: 401 });
    }

    const { id: eventId } = params;
    const eventDoc = await adminDb.collection("events").doc(eventId).get();

    if (!eventDoc.exists || eventDoc.data()?.isActive === false) {
      return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    }

    const event = eventDoc.data()!;

    // Check deadline
    if (event.registrationDeadline) {
      const deadline = new Date(event.registrationDeadline);
      if (new Date() > deadline) {
        return NextResponse.json({ success: false, message: "Registration deadline has passed." }, { status: 400 });
      }
    }

    // Check seats
    const seatsAvailable = event.seatsAvailable ?? event.seats;
    const seatsBooked = event.seatsBooked ?? event.registeredCount ?? 0;
    if (seatsAvailable !== null && seatsAvailable !== undefined) {
      if (seatsBooked >= seatsAvailable) {
        return NextResponse.json({ success: false, message: "No seats available." }, { status: 400 });
      }
    }

    // Duplicate registration check
    const existingReg = await adminDb.collection("eventRegistrations")
      .where("userId", "==", userId)
      .where("eventId", "==", eventId)
      .limit(1)
      .get();

    if (!existingReg.empty) {
      return NextResponse.json({ success: false, message: "You are already registered for this event." }, { status: 409 });
    }

    const userDoc = await adminDb.collection("users").doc(userId).get();
    const user = userDoc.data() || {};

    // Member-only check
    if (event.eventType === "member-only") {
      if (!["premium", "admin"].includes(user.role?.toLowerCase() || "")) {
        return NextResponse.json(
          { success: false, message: "This event is for Premium Members only." },
          { status: 403 }
        );
      }
    }

    const isPremiumUser = user.membershipType === "premium" || user.role === "Premium Member";
    const effectivePrice =
      event.eventType === "paid" || event.eventType === "premium"
        ? isPremiumUser && event.premiumPrice
          ? event.premiumPrice
          : event.price
        : 0;

    // Paid event check -> return details for order checkout flow
    if (effectivePrice > 0) {
      // Generate Razorpay order ID
      const res = await fetch(`${new URL(request.url).origin}/api/v1/payments/create-order`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": request.headers.get("Authorization") || ""
        },
        body: JSON.stringify({ eventId })
      });
      const orderData = await res.json();
      if (!orderData.success) {
        throw new Error(orderData.message || "Failed to create payment order");
      }

      return NextResponse.json({
        success: true,
        paymentRequired: true,
        amount: effectivePrice,
        orderId: orderData.orderId,
        eventId,
        eventTitle: event.title,
        message: "Payment required to complete registration.",
      });
    }

    // Free event -> create registration directly
    const body = await request.json().catch(() => ({}));

    const registrationData = {
      eventId,
      eventTitle: event.title,
      userId,
      name: body.name || user.fullName || "User",
      email: body.email || user.email || "",
      phone: body.phone || user.phone || "",
      membershipType: user.membershipType || "free",
      paymentStatus: "not_required",
      paymentId: null,
      orderId: null,
      amount: 0,
      registeredAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "confirmed",
    };

    const batch = adminDb.batch();
    const regRef = adminDb.collection("eventRegistrations").doc();
    batch.set(regRef, registrationData);

    const updateFields: any = {};
    updateFields.seatsBooked = admin.firestore.FieldValue.increment(1);
    updateFields.registeredCount = admin.firestore.FieldValue.increment(1);

    batch.update(adminDb.collection("events").doc(eventId), updateFields);
    await batch.commit();

    return NextResponse.json(
      {
        success: true,
        paymentRequired: false,
        message: "Successfully registered!",
        data: { registrationId: regRef.id },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[POST /api/events/:id/register]", error);
    return NextResponse.json({ success: false, message: "Registration failed.", error: error.message }, { status: 500 });
  }
}
