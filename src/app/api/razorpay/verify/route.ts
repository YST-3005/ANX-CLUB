import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase/admin';
import { sendEmail } from '@/lib/resend';
import { paymentConfirmationEmail } from '@/lib/email-templates';
import { authenticate } from '@/lib/auth';
import { paymentsRepository } from '@/lib/turso/repositories/paymentsRepository';
import { usersRepository } from '@/lib/turso/repositories/usersRepository';
import { db as tursoDb } from '@/lib/turso/client';

export async function POST(request: Request) {
  try {
    const authUid = await authenticate(request);
    const body = await request.json().catch(() => ({}));
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId,
      userEmail,
      amount = 0,
      paymentType = 'Unknown',
    } = body;

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'Razorpay secret not configured' }, { status: 500 });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing required payment verification parameters' }, { status: 400 });
    }

    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    const expectedBuf = Buffer.from(digest, 'hex');
    const actualBuf = Buffer.from(razorpay_signature || '', 'hex');

    if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
      return NextResponse.json({ error: 'Transaction not legit!' }, { status: 400 });
    }

    const canonicalUserId = authUid || userId;

    // 1. Mark paid in Turso payments table
    try {
      await paymentsRepository.markPaid({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      });
    } catch (tursoErr) {
      console.warn('[razorpay/verify] Turso markPaid notice:', tursoErr);
    }

    // 2. Handle Premium Membership upgrade in Turso
    if (canonicalUserId && paymentType.toLowerCase().includes('premium')) {
      const startDate = Date.now();
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      const expiryTimestamp = expiryDate.getTime();

      try {
        await usersRepository.updateRole(canonicalUserId, 'Premium Member', 'premium');
        await tursoDb.execute({
          sql: `UPDATE users SET membership_expiry = ?, updated_at = ? WHERE id = ?`,
          args: [expiryTimestamp, Date.now(), canonicalUserId],
        });
        await paymentsRepository.createMembership({
          userId: canonicalUserId,
          plan: 'Premium',
          startDate,
          endDate: expiryTimestamp,
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
          amount: Number(amount),
        });
      } catch (tursoMemErr) {
        console.warn('[razorpay/verify] Turso membership update notice:', tursoMemErr);
      }
    }

    // 3. Dual-write to Firestore for backward compatibility
    if (adminDb && typeof adminDb.collection === 'function') {
      const paymentRef = adminDb.collection('payments').doc(razorpay_payment_id);
      await adminDb.runTransaction(async (transaction) => {
        const paymentDoc = await transaction.get(paymentRef);

        if (!paymentDoc.exists) {
          const paymentRecord = {
            userId: canonicalUserId || 'anonymous',
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            amount,
            paymentType,
            status: 'success',
            timestamp: new Date().toISOString(),
            clientProcessed: true,
          };
          transaction.set(paymentRef, paymentRecord);

          if (canonicalUserId && paymentType.toLowerCase().includes('premium')) {
            const startDate = new Date();
            const expiryDate = new Date();
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);

            const userRef = adminDb.collection('users').doc(canonicalUserId);
            const membershipRef = adminDb.collection('memberships').doc();

            transaction.set(
              userRef,
              {
                membershipType: 'Premium',
                membershipExpiry: expiryDate.toISOString(),
                role: 'Premium Member',
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            );

            transaction.set(membershipRef, {
              id: membershipRef.id,
              userId: canonicalUserId,
              plan: 'Premium',
              status: 'active',
              startDate: startDate.toISOString(),
              endDate: expiryDate.toISOString(),
              razorpayPaymentId: razorpay_payment_id,
              orderId: razorpay_order_id,
              amount: amount,
              createdAt: startDate.toISOString(),
            });
          }
        }
      });
    }

    // 4. Send Confirmation Email (if email provided)
    if (userEmail) {
      try {
        const emailHtml = paymentConfirmationEmail(amount, razorpay_order_id, paymentType);
        await sendEmail(userEmail, 'Payment Successful', emailHtml);
      } catch (emailErr) {
        console.warn('[razorpay/verify] Email send skipped:', emailErr);
      }
    }

    return NextResponse.json({
      message: 'success',
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    });
  } catch (error: any) {
    console.error('Razorpay Verify Error:', error);
    return NextResponse.json({ error: error?.message || 'Error verifying payment' }, { status: 500 });
  }
}
