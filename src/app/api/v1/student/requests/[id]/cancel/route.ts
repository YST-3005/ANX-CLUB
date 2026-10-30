import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyRequestAccess } from '@/lib/mentoring-auth';
import { sendEmail } from '@/lib/resend';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await verifyRequestAccess(req, params.id, { allowStudent: true, allowMentor: false });
    if (access.error) return access.error;

    const { user, request } = access;

    // Student can cancel only pending or accepted_awaiting_scheduling requests
    if (request.status === 'scheduled') {
      return NextResponse.json(
        { success: false, error: 'Session is already scheduled. Please cancel the session directly.' },
        { status: 400 }
      );
    }

    if (request.status === 'cancelled' || request.status === 'declined') {
      return NextResponse.json(
        { success: false, error: `Request is already ${request.status}.` },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const reason = body.reason || 'Cancelled by student';
    const nowISO = new Date().toISOString();

    const updatedHistory = [
      ...(request.history || []),
      {
        action: 'cancelled',
        performedBy: user.uid,
        performedByRole: 'student',
        timestamp: nowISO,
        notes: reason,
      },
    ];

    await adminDb.collection('mentorRequests').doc(params.id).update({
      status: 'cancelled',
      declineReason: reason,
      updatedAt: nowISO,
      history: updatedHistory,
    });

    // Notify mentor in-app
    try {
      if (request.mentorId) {
        await adminDb.collection('notifications').add({
          recipientId: request.mentorId,
          title: 'Mentoring Request Cancelled',
          body: `${request.studentName || 'Student'} cancelled their mentoring request: "${request.topic}".`,
          actionUrl: '/mentor-dashboard',
          category: 'mentoring',
          channels: ['in_app'],
          isRead: false,
          createdAt: nowISO,
        });
      }
    } catch (e) {
      console.warn('[student/requests/cancel] Notification error:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Mentoring request has been cancelled.',
    });
  } catch (error: any) {
    console.error('[POST /api/v1/student/requests/[id]/cancel] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
