import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { authenticate } from '@/lib/auth';
import { paymentsRepository } from '@/lib/turso/repositories/paymentsRepository';

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'dummy_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
});

export async function POST(request: Request) {
  try {
    const authUid = await authenticate(request);
    const body = await request.json().catch(() => ({}));
    const {
      amount,
      currency = 'INR',
      userId = '',
      email = '',
      purpose = 'Payment',
      eventId = '',
      name = '',
      college = '',
      mobile = '',
      teamName = '',
      teamMembers = '',
    } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }

    const canonicalUserId = authUid || userId || 'guest_user';

    const options = {
      amount: Math.round(amount * 100),
      currency,
      receipt: `rcptid_${Date.now()}`,
      notes: {
        userId: canonicalUserId,
        email,
        purpose,
        eventId,
        name: name.substring(0, 255),
        college: college.substring(0, 255),
        mobile: mobile.substring(0, 255),
        teamName: teamName.substring(0, 255),
        teamMembers: teamMembers.substring(0, 255),
      },
    };

    const order = await razorpay.orders.create(options);

    // Record in Turso payments table
    if (canonicalUserId && canonicalUserId !== 'guest_user') {
      try {
        await paymentsRepository.createPendingOrder({
          orderId: order.id,
          userId: canonicalUserId,
          paymentType: purpose.toLowerCase().includes('membership') ? 'membership' : (eventId ? 'event' : 'other'),
          amount: Number(amount),
          currency,
        });
      } catch (tursoErr) {
        console.warn('[razorpay/order] Turso pending payment write notice:', tursoErr);
      }
    }

    return NextResponse.json(order);
  } catch (error: any) {
    console.error('Razorpay Order Error:', error);
    return NextResponse.json({ error: error?.message || 'Error creating order' }, { status: 500 });
  }
}
