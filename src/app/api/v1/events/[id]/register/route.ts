import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { eventsRepository } from '@/lib/turso/repositories/eventsRepository';
import { usersRepository } from '@/lib/turso/repositories/usersRepository';
import { paymentsRepository } from '@/lib/turso/repositories/paymentsRepository';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireAuth(request);
    if ('response' in authResult) {
      return authResult.response;
    }
    const { user: authUser } = authResult;
    const userId = authUser.uid;

    const body = await request.json().catch(() => ({}));
    const { id: eventId } = params;

    // Seed default events if newly initialized
    await eventsRepository.seedDefaultEventsIfEmpty().catch(() => {});

    const event = await eventsRepository.getById(eventId);
    if (!event) {
      return NextResponse.json({ success: false, message: 'Event not found.' }, { status: 404 });
    }

    if (event.registration_deadline) {
      const deadline = new Date(event.registration_deadline);
      if (new Date() > deadline) {
        return NextResponse.json({ success: false, message: 'Registration deadline has passed.' }, { status: 400 });
      }
    }

    // Ensure student record exists
    let user = await usersRepository.getById(userId);
    if (!user) {
      user = await usersRepository.upsert({
        id: userId,
        email: authUser.email || body.email || 'student@example.com',
        full_name: body.name || 'Student',
        role: 'Member',
        membership_type: 'free',
      });
    }

    const isPremiumUser = user.membership_type === 'premium' || user.role === 'Premium Member';
    const effectivePrice =
      event.event_type === 'paid' || event.event_type === 'premium' || event.price > 0
        ? isPremiumUser && event.premium_price !== undefined
          ? event.premium_price
          : event.price
        : 0;

    // Cryptographically and transactionally verify payment status in Turso
    let paymentStatus: 'free' | 'paid' | 'pending' = 'free';
    let verifiedPaymentId: string | undefined = undefined;
    let verifiedOrderId: string | undefined = undefined;

    if (effectivePrice > 0) {
      const paymentRef = body.paymentId || body.orderId;
      if (paymentRef) {
        const isVerified = await paymentsRepository.verifyEventPayment(
          userId,
          paymentRef,
          effectivePrice
        );
        if (isVerified) {
          paymentStatus = 'paid';
          verifiedPaymentId = body.paymentId || undefined;
          verifiedOrderId = body.orderId || undefined;
        } else {
          paymentStatus = 'pending';
        }
      } else {
        paymentStatus = 'pending';
      }
    }

    // Register user atomically in Turso SQLite
    const regResult = await eventsRepository.registerUser({
      eventId,
      userId,
      name: body.name || user.full_name || 'Member',
      email: user.email || body.email || '',
      phone: body.phone || user.phone_number || undefined,
      college: body.college || user.college_name || undefined,
      teamName: body.teamName,
      teamMembers: body.teamMembers,
      paymentStatus,
      paymentId: verifiedPaymentId,
      orderId: verifiedOrderId,
      amount: effectivePrice,
    });

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
      JSON.stringify({ ticketId: regResult.ticketId, eventId, eventTitle: event.title, userId })
    )}`;

    // Trigger confirmation email asynchronously if configured
    if (body.email || user.email) {
      const email = body.email || user.email;
      import('@/lib/resend')
        .then(async ({ sendEmail }) => {
          const { eventRegistrationEmail } = await import('@/lib/email-templates');
          await sendEmail(
            email,
            `Registration Confirmed: ${event.title}`,
            eventRegistrationEmail(
              event.title,
              user?.full_name || 'Member',
              event.date,
              event.time || '10:00 AM',
              event.venue || 'Online Stream',
              event.meeting_link || undefined
            )
          );
        })
        .catch(() => {});
    }

    return NextResponse.json(
      {
        success: true,
        message: effectivePrice > 0 ? 'VIP Event Ticket issued.' : 'Registration confirmed successfully.',
        data: {
          registrationId: regResult.registrationId,
          ticketId: regResult.ticketId,
          qrCodeUrl,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(`[POST /api/v1/events/${params.id}/register] Error:`, error);
    const status = error.message?.includes('already registered') ? 409 : 400;
    return NextResponse.json({ success: false, message: error.message || 'Registration failed.' }, { status });
  }
}
