import { NextResponse } from 'next/server';
import crypto from 'crypto';
import {getAdminDb} from '@/lib/firebase/admin';
const db = getAdminDb();
import { sendEmail } from '@/lib/resend';
import { paymentConfirmationEmail } from '@/lib/email-templates';

export async function POST(request: Request) {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      userId,
      userEmail,
      amount = 0,
      paymentType = 'Unknown'
    } = await request.json();

    const secret = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';

    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    if (digest !== razorpay_signature) {
      return NextResponse.json({ error: 'Transaction not legit!' }, { status: 400 });
    }

    // 1. Prevent duplicate processing
    const paymentRef = db.collection('payments').doc(razorpay_payment_id);
    const paymentDoc = await paymentRef.get();

    if (!paymentDoc.exists) {
      // 2. Log Payment Record in Firestore
      const paymentRecord = {
        userId: userId || 'anonymous',
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        amount,
        paymentType,
        status: 'success',
        timestamp: new Date().toISOString(),
        clientProcessed: true
      };
      await paymentRef.set(paymentRecord);

      // 3. Update User Membership (if applicable)
      if (userId && paymentType.includes('Premium')) {
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);

        await db.collection('users').doc(userId).update({
          membershipType: 'Premium',
          membershipExpiry: expiryDate.toISOString(),
        });
      }

      // 4. Send Confirmation Email (if email provided)
      if (userEmail) {
        const emailHtml = paymentConfirmationEmail(amount, razorpay_order_id, paymentType);
        await sendEmail(userEmail, 'Payment Successful', emailHtml);
      }
    }

    return NextResponse.json({
      message: 'success',
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    });
  } catch (error: any) {
    console.error('Razorpay Verify Error:', error);
    return NextResponse.json({ error: error.message || 'Error verifying payment' }, { status: 500 });
  }
}
