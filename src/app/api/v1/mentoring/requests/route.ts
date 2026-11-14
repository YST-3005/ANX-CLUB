import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { requestsRepository } from '@/lib/turso/repositories/requestsRepository';
import { mentorsRepository } from '@/lib/turso/repositories/mentorsRepository';
import { usersRepository } from '@/lib/turso/repositories/usersRepository';
import { queuePushWebhook } from '@/lib/webhooks/dispatcher';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/mentoring/requests
 * Lists requests for authenticated student or mentor with strict tenant isolation.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const viewAs = searchParams.get('as'); // 'mentor' or 'student'

    // Check if user is a mentor strictly via user_id
    const mentor = await mentorsRepository.getByUserId(user.uid);

    if (viewAs === 'mentor' || (mentor && viewAs !== 'student')) {
      if (!mentor) {
        return NextResponse.json({ success: false, error: 'User is not registered as a mentor.' }, { status: 403 });
      }
      const requests = await requestsRepository.listByMentor(mentor.id);
      return NextResponse.json({ success: true, requests });
    }

    // Default: view as student
    const requests = await requestsRepository.listByStudent(user.uid);
    return NextResponse.json({ success: true, requests });
  } catch (error: any) {
    console.error('[GET /api/v1/mentoring/requests] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/v1/mentoring/requests
 * Student submits a mentoring request. Status begins as 'pending'.
 * Does NOT schedule meeting or generate fake links!
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Sign in required to submit a request.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { mentorId, topic, message, paymentId } = body;

    if (!mentorId || !topic) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: mentorId and topic are mandatory.' },
        { status: 400 }
      );
    }

    // Verify mentor exists and is available
    const mentor = await mentorsRepository.getById(mentorId);
    if (!mentor) {
      return NextResponse.json({ success: false, error: 'Mentor not found.' }, { status: 404 });
    }

    if (!mentor.is_available) {
      return NextResponse.json({ success: false, error: 'This mentor is currently unavailable for new bookings.' }, { status: 400 });
    }

    // Prevent student from requesting mentorship from themselves
    if (mentor.user_id && mentor.user_id === user.uid) {
      return NextResponse.json({ success: false, error: 'You cannot request mentorship from your own mentor profile.' }, { status: 400 });
    }

    // Ensure student record exists in Turso
    let student = await usersRepository.getById(user.uid);
    if (!student) {
      student = await usersRepository.provisionMember({
        id: user.uid,
        email: user.email || `student_${user.uid}@anx.club`,
        full_name: body.studentName || user.email?.split('@')[0] || 'Student',
      });
    }

    // Server-enforced payment verification for paid mentoring
    const isPaidMentor = Number(mentor.hourly_rate || 0) > 0;
    let verifiedPaymentId: string | undefined = undefined;

    if (isPaidMentor) {
      const paymentRefId = paymentId || body.orderId || body.razorpay_payment_id;
      if (!paymentRefId) {
        return NextResponse.json(
          { success: false, error: `This mentor charges ₹${mentor.hourly_rate}/hr. A verified payment is required before booking.` },
          { status: 400 }
        );
      }

      const { paymentsRepository } = await import('@/lib/turso/repositories/paymentsRepository');
      const isPaymentVerified = await paymentsRepository.verifyMentoringPayment(
        user.uid,
        paymentRefId,
        mentor.hourly_rate
      );

      if (!isPaymentVerified) {
        return NextResponse.json(
          { success: false, error: 'Payment verification failed: No genuine verified payment record found for this mentor consultation.' },
          { status: 402 }
        );
      }
      verifiedPaymentId = paymentRefId;
    }

    // Create the pending request (with duplicate prevention transaction)
    const newRequest = await requestsRepository.create({
      student_id: user.uid,
      mentor_id: mentorId,
      topic,
      message,
      is_paid: isPaidMentor,
      amount: isPaidMentor ? mentor.hourly_rate : 0,
      payment_id: verifiedPaymentId,
    });

    // Dispatch non-blocking push notification webhook to mentor
    if (mentor.user_id) {
      queuePushWebhook({
        recipientId: mentor.user_id,
        entity: 'mentor_request',
        entity_id: newRequest.id,
        summary: `New 1-on-1 Mentorship Request: ${student.full_name}`,
        version: newRequest.version,
        updated_at: newRequest.updated_at,
        data: {
          requestId: newRequest.id,
          studentName: student.full_name,
          topic,
          actionUrl: '/mentor/dashboard',
          message: `${student.full_name} submitted a mentorship request regarding "${topic}".`,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Mentoring request submitted successfully. Awaiting mentor review.',
        request: newRequest,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[POST /api/v1/mentoring/requests] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to submit mentoring request.' },
      { status: error?.message?.includes('already have an active request') ? 409 : 500 }
    );
  }
}
