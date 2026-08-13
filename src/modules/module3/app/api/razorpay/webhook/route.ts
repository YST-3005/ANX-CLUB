import { NextResponse } from 'next/server';
import crypto from 'crypto';
import {getAdminDb} from '@/lib/firebase/admin';
const db = getAdminDb();
import { sendEmail } from '@/lib/resend';
import { paymentConfirmationEmail, eventRegistrationEmail } from '@/lib/email-templates';

export async function POST(request: Request) {
  try {
    const text = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !secret) {
      return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(text)
      .digest('hex');

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const payload = JSON.parse(text);

    if (payload.event === 'payment.captured') {
      const payment = payload.payload.payment.entity;
      
      // Ideally, you'd extract user metadata passed during order creation from notes
      // e.g., payment.notes.userId
      const userId = payment.notes?.userId;
      const email = payment.notes?.email;
      const purpose = payment.notes?.purpose || 'Payment';
      const eventId = payment.notes?.eventId;
      
      if (userId) {
        // Save the raw payment record
        await db.collection('payments').doc(payment.id).set({
          ...payment,
          processedAt: new Date().toISOString(),
          webhookProcessed: true
        });

        // Example: Update membership
        if (purpose.includes('membership')) {
          await db.collection('users').doc(userId).update({
            membershipType: 'Premium'
          });
        } else if (purpose === 'event_registration' && eventId) {
          // Check if already registered to avoid duplicates on retries
          const regQuery = await db.collection('eventRegistrations')
            .where('eventId', '==', eventId)
            .where('userId', '==', userId)
            .get();
            
          if (regQuery.empty) {
            // Fetch user info for name fallback
            const userDoc = await db.collection('users').doc(userId).get();
            const userName = payment.notes?.name || (userDoc.exists ? userDoc.data()?.fullName : 'User');

            // Add registration
            await db.collection('eventRegistrations').add({
              eventId,
              userId,
              userEmail: email || userDoc.data()?.email,
              userName: userName,
              college: payment.notes?.college || '',
              mobile: payment.notes?.mobile || '',
              teamName: payment.notes?.teamName || '',
              teamMembers: payment.notes?.teamMembers || '',
              paymentStatus: 'Completed',
              razorpayOrderId: payment.order_id,
              razorpayPaymentId: payment.id,
              createdAt: new Date().toISOString()
            });

            // Increment registeredCount
            const eventRef = db.collection('events').doc(eventId);
            await db.runTransaction(async (t) => {
              const doc = await t.get(eventRef);
              if (doc.exists) {
                t.update(eventRef, { registeredCount: doc.data()!.registeredCount + 1 });
              }
            });
            
            // Email is sent below if purpose === 'event_registration'
          }
        }
        
        // Send email
        if (email) {
          if (purpose === 'event_registration' && eventId) {
            const eventDoc = await db.collection('events').doc(eventId).get();
            const eventName = eventDoc.exists ? eventDoc.data()?.title : 'the event';
            const userDoc = await db.collection('users').doc(userId).get();
            const userName = userDoc.exists ? userDoc.data()?.fullName : 'User';
            await sendEmail(email, "Event Registration Confirmed", eventRegistrationEmail(eventName, userName));
          } else {
            await sendEmail(email, "Payment Successful", paymentConfirmationEmail(payment.amount / 100, payment.order_id, purpose));
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
