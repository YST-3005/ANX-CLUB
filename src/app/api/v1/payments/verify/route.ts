import { NextRequest, NextResponse } from "next/server";
import { verifyRazorpaySignature } from "@/lib/payments/razorpay";
import { adminDb } from "@/lib/firebase/admin";
import { authenticate } from "@/lib/auth";
import { paymentsRepository } from "@/lib/turso/repositories/paymentsRepository";
import { usersRepository } from "@/lib/turso/repositories/usersRepository";
import { eventsRepository } from "@/lib/turso/repositories/eventsRepository";
import { db } from "@/lib/turso/client";
import * as admin from "firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const userId = await authenticate(request);
    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized: Sign in required." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      eventId,
      name,
      email,
      phone,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { success: false, message: "Missing required fields: razorpay_order_id, razorpay_payment_id, and razorpay_signature are required." },
        { status: 400 }
      );
    }

    // 1. Verify Razorpay HMAC signature with timing-safe comparison
    const isValid = verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      return NextResponse.json({ success: false, message: "Signature verification failed: Invalid transaction." }, { status: 400 });
    }

    // 2. Fetch stored order from authoritative Turso database (with fallback to Firestore)
    let paymentOrder = await paymentsRepository.getByOrderId(razorpay_order_id);
    let fsPaymentData: any = null;

    if (!paymentOrder && adminDb && typeof adminDb.collection === "function") {
      const paymentDoc = await adminDb.collection("payments").doc(razorpay_order_id).get();
      if (paymentDoc.exists) {
        fsPaymentData = paymentDoc.data()!;
        // Replicate to Turso
        paymentOrder = await paymentsRepository.createPendingOrder({
          orderId: razorpay_order_id,
          userId: fsPaymentData.userId,
          paymentType: fsPaymentData.paymentType || "membership",
          amount: fsPaymentData.amount || 0,
        });
      }
    }

    if (!paymentOrder) {
      return NextResponse.json({ success: false, message: "Payment order not found on server." }, { status: 404 });
    }

    // Strict ownership verification: payment order must belong to the authenticated user
    if (paymentOrder.user_id !== userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: This payment order does not belong to your account." },
        { status: 403 }
      );
    }

    // 3. Idempotency check: if already paid, return early
    if (paymentOrder.status === "paid") {
      return NextResponse.json({
        success: true,
        message: "Payment already verified successfully.",
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
      });
    }

    // 4. Mark payment as paid in Turso
    await paymentsRepository.markPaid({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    // 5. Handle Membership upgrade in Turso
    if (paymentOrder.payment_type === "membership") {
      const startDate = Date.now();
      const isMonthly = fsPaymentData?.billingPeriod === "monthly" || paymentOrder.amount < 500;
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + (isMonthly ? 1 : 12));
      const expiryTimestamp = expiryDate.getTime();

      // Authoritatively update user role and membership in Turso
      await usersRepository.updateRole(userId, "Premium Member", "premium");
      await db.execute({
        sql: `UPDATE users SET membership_expiry = ?, updated_at = ? WHERE id = ?`,
        args: [expiryTimestamp, Date.now(), userId],
      });

      // Insert record into Turso memberships table
      await paymentsRepository.createMembership({
        userId,
        plan: isMonthly ? "monthly_149" : "annual_999",
        startDate,
        endDate: expiryTimestamp,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        amount: paymentOrder.amount,
      });

      // Dual-write to Firestore for backward compatibility
      if (adminDb && typeof adminDb.collection === "function") {
        try {
          await adminDb.collection("users").doc(userId).set({
            uid: userId,
            membershipType: "premium",
            membershipExpiry: expiryDate.toISOString(),
            role: "Premium Member",
            updatedAt: admin.firestore.FieldValue?.serverTimestamp ? admin.firestore.FieldValue.serverTimestamp() : new Date(),
          }, { merge: true });

          await adminDb.collection("payments").doc(razorpay_order_id).update({
            status: "paid",
            paymentId: razorpay_payment_id,
            verifiedAt: admin.firestore.FieldValue?.serverTimestamp ? admin.firestore.FieldValue.serverTimestamp() : new Date(),
          }).catch(() => {});
        } catch (fsErr) {
          console.warn("[verify] Firestore dual-write skipped:", fsErr);
        }
      }

      // Send confirmation email
      const targetEmail = email || fsPaymentData?.userEmail || "";
      if (targetEmail) {
        try {
          const { sendEmail } = await import("@/lib/resend");
          const { membershipActivationEmail, paymentConfirmationEmail } = await import("@/lib/email-templates");
          await sendEmail(
            targetEmail,
            "A.N.X Premium Membership Activated! 🚀",
            membershipActivationEmail(name || "Member", expiryDate.toISOString().split("T")[0], isMonthly ? "Monthly Elite" : "Annual Elite")
          );
          await sendEmail(
            targetEmail,
            "Payment Receipt - A.N.X Platform",
            paymentConfirmationEmail(paymentOrder.amount, razorpay_payment_id, "Premium Membership Subscription")
          );
        } catch (emailErr) {
          console.warn("Membership emails skipped:", emailErr);
        }
      }

      return NextResponse.json({
        success: true,
        message: "Membership upgraded successfully.",
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
      });
    }

    // 6. Handle Paid Mentoring Verification
    if (paymentOrder.payment_type === "mentoring") {
      // Dual-write to Firestore for backward compatibility
      if (adminDb && typeof adminDb.collection === "function") {
        try {
          await adminDb.collection("payments").doc(razorpay_order_id).update({
            status: "paid",
            paymentId: razorpay_payment_id,
            verifiedAt: admin.firestore.FieldValue?.serverTimestamp ? admin.firestore.FieldValue.serverTimestamp() : new Date(),
          }).catch(() => {});
        } catch {}
      }

      return NextResponse.json({
        success: true,
        message: "Mentoring consultation payment verified successfully. You can now complete your booking.",
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
      });
    }

    // 7. Handle Event Registration Verification
    const targetEventId = eventId || fsPaymentData?.eventId;
    if (targetEventId) {
      const regId = `reg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = Date.now();

      // Register in Turso event_registrations table
      try {
        await db.execute({
          sql: `
            INSERT INTO event_registrations (
              id, event_id, user_id, name, email, phone,
              payment_status, payment_id, order_id, amount,
              ticket_id, status, version, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'paid', ?, ?, ?, ?, 'confirmed', 1, ?, ?)
            ON CONFLICT(event_id, user_id) DO UPDATE SET
              payment_status = 'paid',
              payment_id = excluded.payment_id,
              order_id = excluded.order_id,
              status = 'confirmed',
              updated_at = excluded.updated_at
          `,
          args: [
            regId,
            targetEventId,
            userId,
            name || "Attendee",
            email || "attendee@example.com",
            phone || null,
            razorpay_payment_id,
            razorpay_order_id,
            paymentOrder.amount,
            `TKT_${razorpay_order_id.slice(-6).toUpperCase()}`,
            now,
            now,
          ],
        });

        // Increment event seats booked in Turso
        await db.execute({
          sql: `UPDATE events SET seats_booked = seats_booked + 1, updated_at = ? WHERE id = ?`,
          args: [now, targetEventId],
        });
      } catch (tursoRegErr) {
        console.warn("[verify] Turso event registration notice:", tursoRegErr);
      }

      // Dual-write to Firestore
      if (adminDb && typeof adminDb.collection === "function") {
        try {
          const regRef = adminDb.collection("eventRegistrations").doc();
          await regRef.set({
            eventId: targetEventId,
            userId,
            name: name || "Attendee",
            email: email || "",
            phone: phone || "",
            paymentStatus: "paid",
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            amount: paymentOrder.amount,
            registeredAt: admin.firestore.FieldValue?.serverTimestamp ? admin.firestore.FieldValue.serverTimestamp() : new Date(),
            status: "confirmed",
          });

          await adminDb.collection("payments").doc(razorpay_order_id).update({
            status: "paid",
            paymentId: razorpay_payment_id,
            verifiedAt: admin.firestore.FieldValue?.serverTimestamp ? admin.firestore.FieldValue.serverTimestamp() : new Date(),
          }).catch(() => {});
        } catch (fsErr) {
          console.warn("[verify] Firestore event dual-write skipped:", fsErr);
        }
      }

      return NextResponse.json({
        success: true,
        message: "Payment verified and event registration confirmed!",
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully.",
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    });
  } catch (error: any) {
    console.error("[POST /api/v1/payments/verify]", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Verification failed." },
      { status: 500 }
    );
  }
}
