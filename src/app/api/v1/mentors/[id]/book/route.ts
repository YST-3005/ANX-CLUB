import { NextResponse, NextRequest } from 'next/server';
import { authenticate } from '@/lib/auth';
import { requestsRepository } from '@/lib/turso/repositories/requestsRepository';
import { mentorsRepository } from '@/lib/turso/repositories/mentorsRepository';
import { usersRepository } from '@/lib/turso/repositories/usersRepository';
import { paymentsRepository } from '@/lib/turso/repositories/paymentsRepository';
import { queuePushWebhook } from '@/lib/webhooks/dispatcher';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUserId = await authenticate(request);
    if (!authUserId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required to request mentorship.' } },
        { status: 401 }
      );
    }

    const mentor = await mentorsRepository.getById(params.id);
    if (!mentor) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Mentor not found.' } },
        { status: 404 }
      );
    }

    if (!mentor.is_available) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAVAILABLE', message: 'This mentor is currently unavailable for bookings.' } },
        { status: 400 }
      );
    }

    if (mentor.user_id && mentor.user_id === authUserId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'You cannot request mentorship from your own mentor profile.' } },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const userEmail = body.userEmail || body.email || body.memberEmail || `user_${authUserId}@anx.club`;
    const userName = body.userName || body.memberName || 'Member';
    const topic = body.topic || body.reason || body.message || '1-on-1 Mentorship Consultation';
    const message = body.message || body.reason || '';

    // Verify payment for paid mentoring consultations
    const isPaidMentor = Number(mentor.hourly_rate || 0) > 0;
    let verifiedPaymentId: string | undefined = undefined;

    if (isPaidMentor) {
      const paymentRefId = body.paymentId || body.orderId || body.razorpay_payment_id;
      if (!paymentRefId) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'PAYMENT_REQUIRED',
              message: `This mentor charges ₹${mentor.hourly_rate}/hr. Verified payment is required to submit a booking.`,
            },
          },
          { status: 400 }
        );
      }

      const isPaymentVerified = await paymentsRepository.verifyMentoringPayment(
        authUserId,
        paymentRefId,
        mentor.hourly_rate
      );

      if (!isPaymentVerified) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'PAYMENT_NOT_VERIFIED',
              message: 'Payment verification failed: No genuine verified payment record found for this mentor consultation.',
            },
          },
          { status: 402 }
        );
      }

      verifiedPaymentId = paymentRefId;
    }

    // Ensure student exists in Turso
    let user = await usersRepository.getById(authUserId);
    if (!user) {
      user = await usersRepository.provisionMember({
        id: authUserId,
        email: userEmail,
        full_name: userName,
      });
    }

    // Create mentoring request in Turso (status: 'pending')
    // Accepting and scheduling must be done by the mentor
    const newRequest = await requestsRepository.create({
      student_id: authUserId,
      mentor_id: params.id,
      topic,
      message,
      is_paid: isPaidMentor,
      amount: isPaidMentor ? mentor.hourly_rate : 0,
      payment_id: verifiedPaymentId,
    });

    // Notify mentor via push webhook
    if (mentor.user_id) {
      queuePushWebhook({
        recipientId: mentor.user_id,
        entity: 'mentor_request',
        entity_id: newRequest.id,
        summary: `New Request from ${user.full_name}`,
        version: newRequest.version,
        updated_at: newRequest.updated_at,
        data: {
          requestId: newRequest.id,
          studentName: user.full_name,
          topic,
          actionUrl: '/mentor/dashboard',
          message: `${user.full_name} submitted a mentorship request on "${topic}".`,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Mentoring request submitted successfully. The mentor will review and schedule your session.',
        data: {
          id: newRequest.id,
          status: newRequest.status,
          topic: newRequest.topic,
          mentorName: mentor.full_name,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(`[POST /api/v1/mentors/${params.id}/book] Error:`, error);
    const isConflict = error?.message?.includes('already have an active request');
    return NextResponse.json(
      {
        success: false,
        error: {
          code: isConflict ? 'CONFLICT' : 'INTERNAL_ERROR',
          message: error?.message || 'Error submitting mentoring request',
        },
      },
      { status: isConflict ? 409 : 500 }
    );
  }
}
