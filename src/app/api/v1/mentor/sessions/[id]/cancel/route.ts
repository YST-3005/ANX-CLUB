import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifySessionAccess } from '@/lib/mentoring-auth';
import { sendEmail } from '@/lib/resend';
import { deleteGoogleCalendarEvent } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await verifySessionAccess(req, params.id, { allowStudent: false, allowMentor: true });
    if (access.error) return access.error;

    const { user, session } = access;

    if (session.status === 'completed' || session.status === 'cancelled') {
      return NextResponse.json(
        { success: false, error: `Session is already ${session.status}.` },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const reason = body.reason || 'Cancelled by mentor';
    const nowISO = new Date().toISOString();

    const updatedHistory = [
      ...(session.history || []),
      {
        action: 'cancelled',
        performedBy: user.uid,
        performedByRole: 'mentor' as const,
        timestamp: nowISO,
        notes: reason,
      },
    ];

    // Delete Google Calendar event if scheduled
    if (session.googleEventId) {
      await deleteGoogleCalendarEvent(user.uid, session.googleEventId);
    }

    await adminDb.collection('mentoringSessions').doc(params.id).update({
      status: 'cancelled',
      cancelReason: reason,
      updatedAt: nowISO,
      history: updatedHistory,
    });

    if (session.requestId) {
      try {
        await adminDb.collection('mentorRequests').doc(session.requestId).update({
          status: 'cancelled',
          declineReason: reason,
          updatedAt: nowISO,
        });
      } catch (e) {}
    }

    // In-app notification to student
    if (session.studentId) {
      try {
        await adminDb.collection('notifications').add({
          recipientId: session.studentId,
          title: 'Mentoring Session Cancelled',
          body: `${session.mentorName} had to cancel your session on "${session.topic}". Reason: ${reason}`,
          actionUrl: '/mentors/my-sessions',
          category: 'mentoring',
          channels: ['in_app'],
          isRead: false,
          createdAt: nowISO,
        });
      } catch (e) {}
    }

    // Send email to student
    if (session.studentEmail) {
      try {
        await sendEmail(
          session.studentEmail,
          `Cancelled: Mentorship Session with ${session.mentorName}`,
          `<p>Hi ${session.studentName},</p><p>${session.mentorName} has cancelled your session on "${session.topic}".</p><p><strong>Reason:</strong> ${reason}</p><p>You can request another session anytime from the <a href="https://anx.club/mentors">Mentor Directory</a>.</p>`
        );
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      message: 'Session has been cancelled.',
    });
  } catch (error: any) {
    console.error('[POST /api/v1/mentor/sessions/[id]/cancel] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
