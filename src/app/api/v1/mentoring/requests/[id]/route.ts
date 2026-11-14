import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { requestsRepository } from '@/lib/turso/repositories/requestsRepository';
import { mentorsRepository } from '@/lib/turso/repositories/mentorsRepository';
import { queuePushWebhook } from '@/lib/webhooks/dispatcher';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const reqData = await requestsRepository.getById(params.id);
    if (!reqData) {
      return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
    }

    // Tenant isolation: verify user is student, mentor, or admin
    // Tenant isolation: verify user is student, mentor, or admin
    const mentor = await mentorsRepository.getByUserId(user.uid);

    const isStudent = reqData.student_id === user.uid;
    const isMentor = mentor && reqData.mentor_id === mentor.id;
    const isAdmin = user.role.toLowerCase() === 'admin';

    if (!isStudent && !isMentor && !isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden: Access denied to this request.' }, { status: 403 });
    }

    return NextResponse.json({ success: true, request: reqData });
  } catch (error: any) {
    console.error(`[GET /api/v1/mentoring/requests/${params.id}] Error:`, error);
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { action, declineReason } = body;

    const reqData = await requestsRepository.getById(params.id);
    if (!reqData) {
      return NextResponse.json({ success: false, error: 'Request not found.' }, { status: 404 });
    }

    // Resolve mentor strictly by user_id
    const mentor = await mentorsRepository.getByUserId(user.uid);

    if (action === 'accept') {
      // Must be the assigned mentor
      if (!mentor || mentor.id !== reqData.mentor_id) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Only the assigned mentor can accept this request.' },
          { status: 403 }
        );
      }

      const updated = await requestsRepository.accept(params.id, reqData.mentor_id);

      // Notify student
      queuePushWebhook({
        recipientId: reqData.student_id,
        entity: 'mentor_request',
        entity_id: updated.id,
        summary: `Request Accepted by ${reqData.mentor_name || 'Mentor'}`,
        version: updated.version,
        updated_at: updated.updated_at,
        data: {
          requestId: updated.id,
          status: 'accepted',
          actionUrl: '/dashboard',
          message: `${reqData.mentor_name || 'Your mentor'} accepted your mentoring request. Meeting scheduling will follow shortly.`,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Request accepted. You can now schedule date, time, and duration.',
        request: updated,
      });
    }

    if (action === 'decline') {
      if (!mentor || mentor.id !== reqData.mentor_id) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Only the assigned mentor can decline this request.' },
          { status: 403 }
        );
      }

      const reason = declineReason || 'Mentor is currently at capacity.';
      const updated = await requestsRepository.decline(params.id, reqData.mentor_id, reason);

      // Notify student
      queuePushWebhook({
        recipientId: reqData.student_id,
        entity: 'mentor_request',
        entity_id: updated.id,
        summary: `Request Declined by ${reqData.mentor_name || 'Mentor'}`,
        version: updated.version,
        updated_at: updated.updated_at,
        data: {
          requestId: updated.id,
          status: 'declined',
          declineReason: reason,
          actionUrl: '/dashboard',
          message: `Your mentoring request was declined: ${reason}`,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Request declined.',
        request: updated,
      });
    }

    if (action === 'cancel') {
      // Must be the student
      if (reqData.student_id !== user.uid && user.role.toLowerCase() !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Only the student can cancel this request.' },
          { status: 403 }
        );
      }

      const updated = await requestsRepository.cancelByStudent(params.id, reqData.student_id);

      // Notify mentor if accepted/pending
      if (mentor?.user_id) {
        queuePushWebhook({
          recipientId: mentor.user_id,
          entity: 'mentor_request',
          entity_id: updated.id,
          summary: `Request Cancelled by Student: ${reqData.student_name}`,
          version: updated.version,
          updated_at: updated.updated_at,
          data: {
            requestId: updated.id,
            status: 'cancelled',
            actionUrl: '/mentor/dashboard',
            message: `${reqData.student_name} cancelled their mentoring request for "${reqData.topic}".`,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Request cancelled successfully.',
        request: updated,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action. Expected accept, decline, or cancel.' }, { status: 400 });
  } catch (error: any) {
    console.error(`[PATCH /api/v1/mentoring/requests/${params.id}] Error:`, error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to update request' }, { status: 500 });
  }
}
