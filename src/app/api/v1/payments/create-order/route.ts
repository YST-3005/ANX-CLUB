import { NextRequest, NextResponse } from "next/server";
import { createRazorpayOrder } from "@/lib/payments/razorpay";
import { adminDb } from "@/lib/firebase/admin";
import { authenticate } from "@/lib/auth";
import { paymentsRepository } from "@/lib/turso/repositories/paymentsRepository";
import { mentorsRepository } from "@/lib/turso/repositories/mentorsRepository";
import { eventsRepository } from "@/lib/turso/repositories/eventsRepository";
import { usersRepository } from "@/lib/turso/repositories/usersRepository";
import * as admin from "firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const userId = await authenticate(request);
    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized: Sign in required." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { eventId, mentorId, paymentType, billingPeriod = "annual" } = body;

    const isMembership = paymentType === "membership";
    const isMentoring = paymentType === "mentoring" || Boolean(mentorId);

    if (!eventId && !isMembership && !isMentoring) {
      return NextResponse.json(
        { success: false, message: "eventId, mentorId, or membership paymentType is required." },
        { status: 400 }
      );
    }

    // 1. Handle Membership Payment Order
    if (isMembership) {
      // Server-side calculated pricing: monthly = 149 INR, annual = 999 INR
      const amount = billingPeriod === "monthly" ? 149 : 999;
      const order = await createRazorpayOrder({
        amount,
        currency: "INR",
        receipt: `membership_${userId.slice(0, 8)}_${Date.now()}`,
        notes: { userId, paymentType: "membership", billingPeriod },
      });

      // Durably record pending order in authoritative Turso database
      await paymentsRepository.createPendingOrder({
        orderId: order.id,
        userId,
        paymentType: "membership",
        amount,
        currency: "INR",
      });

      // Dual-write to Firestore for backward compatibility
      if (adminDb && typeof adminDb.collection === "function") {
        try {
          await adminDb.collection("payments").doc(order.id).set({
            orderId: order.id,
            userId,
            amount,
            currency: "INR",
            status: "pending",
            paymentType: "membership",
            billingPeriod,
            createdAt: admin.firestore.FieldValue?.serverTimestamp ? admin.firestore.FieldValue.serverTimestamp() : new Date(),
          });
        } catch (fsErr) {
          console.warn("[create-order] Firestore dual-write skipped:", fsErr);
        }
      }

      return NextResponse.json({
        success: true,
        orderId: order.id,
        amount,
        currency: "INR",
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      });
    }

    // 2. Handle Paid Mentoring Payment Order
    if (isMentoring) {
      if (!mentorId) {
        return NextResponse.json({ success: false, message: "mentorId is required for mentoring payment." }, { status: 400 });
      }

      const mentor = await mentorsRepository.getById(mentorId);
      if (!mentor) {
        return NextResponse.json({ success: false, message: "Mentor not found." }, { status: 404 });
      }

      // Server-side calculated pricing based on mentor's hourly rate
      const amount = Number(mentor.hourly_rate || 0);
      if (amount <= 0) {
        return NextResponse.json(
          { success: false, message: "This mentor provides free consultations. No payment required." },
          { status: 400 }
        );
      }

      const order = await createRazorpayOrder({
        amount,
        currency: "INR",
        receipt: `mentor_${mentorId.slice(0, 8)}_${userId.slice(0, 8)}`,
        notes: {
          userId,
          paymentType: "mentoring",
          mentorId,
          mentorName: mentor.full_name,
        },
      });

      // Record in authoritative Turso database
      await paymentsRepository.createPendingOrder({
        orderId: order.id,
        userId,
        paymentType: "mentoring",
        amount,
        currency: "INR",
      });

      // Dual-write to Firestore for backward compatibility
      if (adminDb && typeof adminDb.collection === "function") {
        try {
          await adminDb.collection("payments").doc(order.id).set({
            orderId: order.id,
            userId,
            mentorId,
            mentorName: mentor.full_name,
            amount,
            currency: "INR",
            status: "pending",
            paymentType: "mentoring",
            createdAt: admin.firestore.FieldValue?.serverTimestamp ? admin.firestore.FieldValue.serverTimestamp() : new Date(),
          });
        } catch (fsErr) {
          console.warn("[create-order] Firestore dual-write skipped:", fsErr);
        }
      }

      return NextResponse.json({
        success: true,
        orderId: order.id,
        amount,
        currency: "INR",
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      });
    }

    // 3. Handle Event Registration Payment Order
    let event: any = null;
    try {
      event = await eventsRepository.getById(eventId);
    } catch {
      // Fallback to Firestore if needed
    }
    if (!event && adminDb && typeof adminDb.collection === "function") {
      const eventDoc = await adminDb.collection("events").doc(eventId).get();
      if (eventDoc.exists) {
        event = eventDoc.data();
      }
    }

    if (!event || event.is_active === 0 || event.isActive === false) {
      return NextResponse.json({ success: false, message: "Event not found or inactive." }, { status: 404 });
    }

    // Determine pricing based on student's membership in Turso
    const user = await usersRepository.getById(userId);
    const isPremium = user?.membership_type === "premium" || user?.role === "Premium Member";
    const amount = isPremium && (event.premium_price || event.premiumPrice)
      ? Number(event.premium_price || event.premiumPrice)
      : Number(event.price || 0);

    const order = await createRazorpayOrder({
      amount,
      currency: "INR",
      receipt: `evt_${eventId.slice(0, 8)}_${userId.slice(0, 8)}`,
      notes: {
        eventId,
        userId,
        eventTitle: event.title,
      },
    });

    // Record in authoritative Turso database
    await paymentsRepository.createPendingOrder({
      orderId: order.id,
      userId,
      paymentType: "event",
      amount,
      currency: "INR",
    });

    // Dual-write to Firestore for backward compatibility
    if (adminDb && typeof adminDb.collection === "function") {
      try {
        await adminDb.collection("payments").doc(order.id).set({
          orderId: order.id,
          eventId,
          eventTitle: event.title,
          userId,
          amount,
          currency: "INR",
          status: "pending",
          createdAt: admin.firestore.FieldValue?.serverTimestamp ? admin.firestore.FieldValue.serverTimestamp() : new Date(),
        });
      } catch (fsErr) {
        console.warn("[create-order] Firestore dual-write skipped:", fsErr);
      }
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount,
      currency: "INR",
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      prefill: {
        name: user?.full_name || "",
        email: user?.email || "",
        contact: user?.phone_number || "",
      },
    });
  } catch (error: any) {
    console.error("[POST /api/v1/payments/create-order]", error);
    return NextResponse.json(
      { success: false, message: "Could not create payment order.", error: error?.message || error },
      { status: 500 }
    );
  }
}
