import { NextResponse, NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { requestsRepository } from '@/lib/turso/repositories/requestsRepository';
import { queuePushWebhook } from '@/lib/webhooks/dispatcher';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authRes = await requireAdmin(request);
    if ('response' in authRes) return authRes.response;

    const body = await request.json().catch(() => ({}));
    const { status, declineReason } = body;

    const reqData = await requestsRepository.getById(params.id);
    if (!reqData) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Request not found' } }, { status: 404 });
    }

    if (status === 'Approved' || status === 'accepted') {
      const updated = await requestsRepository.accept(params.id, reqData.mentor_id);
      queuePushWebhook({
        recipientId: reqData.student_id,
        entity: 'mentor_request',
        entity_id: updated.id,
        summary: `Request Accepted: ${reqData.topic}`,
        version: updated.version,
        updated_at: updated.updated_at,
        data: {
          requestId: updated.id,
          status: 'accepted',
          actionUrl: '/dashboard',
          message: `Your mentoring request with ${reqData.mentor_name} was approved.`,
        },
      });
      return NextResponse.json({ success: true, status: 'accepted', request: updated });
    }

    if (status === 'Rejected' || status === 'declined') {
      const reason = declineReason || 'Declined by administration';
      const updated = await requestsRepository.decline(params.id, reqData.mentor_id, reason);
      queuePushWebhook({
        recipientId: reqData.student_id,
        entity: 'mentor_request',
        entity_id: updated.id,
        summary: `Request Declined: ${reqData.topic}`,
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
      return NextResponse.json({ success: true, status: 'declined', request: updated });
    }

    return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid status' } }, { status: 400 });
  } catch (error: any) {
    console.error(`[PATCH /api/v1/admin/mentor-requests/${params.id}] Error:`, error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error?.message || 'Error updating request' } },
      { status: 500 }
    );
  }
}
