import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifySessionAccess } from '@/lib/mentoring-auth';
import { sendEmail } from '@/lib/resend';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await verifySessionAccess(req, params.id, { allowStudent: true, allowMentor: false });
    if (access.error) return access.error;

    const { user, session } = access;

    if (session.status === 'completed' || session.status === 'cancelled') {
      return NextResponse.json(
        { success: false, error: `Session is already ${session.status}.` },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const reason = body.reason || 'Cancelled by student';
    const nowISO = new Date().toISOString();

    const updatedHistory = [
      ...(session.history || []),
      {
        action: 'cancelled',
        performedBy: user.uid,
        performedByRole: 'student',
        timestamp: nowISO,
        notes: reason,
      },
    ];

    // Update session document in mentoringSessions
    await adminDb.collection('mentoringSessions').doc(params.id).update({
      status: 'cancelled',
      cancelReason: reason,
      updatedAt: nowISO,
      history: updatedHistory,
    });

    // Also update originating request if present
    if (session.requestId) {
      try {
        await adminDb.collection('mentorRequests').doc(session.requestId).update({
          status: 'cancelled',
          declineReason: reason,
          updatedAt: nowISO,
        });
      } catch (e) {}
    }

    // In-app notification to mentor
    try {
      if (session.mentorId) {
        await adminDb.collection('notifications').add({
          recipientId: session.mentorId,
          title: 'Mentoring Session Cancelled',
          body: `${session.studentName || 'Student'} cancelled the session scheduled for ${session.startAtUTC.split('T')[0]}. Reason: ${reason}`,
          actionUrl: '/mentor-dashboard',
          category: 'mentoring',
          channels: ['in_app'],
          isRead: false,
          createdAt: nowISO,
        });
      }
    } catch (e) {
      console.warn('[student/sessions/cancel] Notification error:', e);
    }

    // Send email to mentor
    try {
      if (session.mentorEmail) {
        await sendEmail(
          session.mentorEmail,
          `Cancelled: Mentorship Session with ${session.studentName}`,
          `<p>Hi ${session.mentorName},</p><p>${session.studentName} has cancelled the session scheduled for <strong>${session.startAtUTC}</strong>.</p><p>Reason: ${reason}</p>`
        );
      }
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: 'Session has been cancelled.',
    });
  } catch (error: any) {
    console.error('[POST /api/v1/student/sessions/[id]/cancel] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
