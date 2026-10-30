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
    const access = await verifyRequestAccess(req, params.id, { allowStudent: false, allowMentor: true });
    if (access.error) return access.error;

    const { user, request } = access;

    if (request.status !== 'pending' && request.status !== 'accepted_awaiting_scheduling') {
      return NextResponse.json(
        { success: false, error: `Request cannot be declined because it is currently "${request.status}".` },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const reason = body.reason || body.declineReason || 'Schedule conflict';
    const nowISO = new Date().toISOString();

    const updatedHistory = [
      ...(request.history || []),
      {
        action: 'declined',
        performedBy: user.uid,
        performedByRole: 'mentor',
        timestamp: nowISO,
        notes: reason,
      },
    ];

    await adminDb.collection('mentorRequests').doc(params.id).update({
      status: 'declined',
      declineReason: reason,
      updatedAt: nowISO,
      history: updatedHistory,
    });

    // Notify student in-app
    const studentUid = request.studentId || request.memberId;
    if (studentUid) {
      try {
        await adminDb.collection('notifications').add({
          recipientId: studentUid,
          title: 'Mentoring Request Update',
          body: `${request.mentorName} was unable to accept your request on "${request.topic}". Reason: ${reason}`,
          actionUrl: '/mentors/my-sessions',
          category: 'mentoring',
          channels: ['in_app'],
          isRead: false,
          createdAt: nowISO,
        });
      } catch (e) {
        console.warn('Failed to send notification to student:', e);
      }
    }

    // Send email to student
    const studentEmail = request.studentEmail || request.memberEmail;
    if (studentEmail) {
      try {
        await sendEmail(
          studentEmail,
          `Mentoring Request Update: ${request.mentorName}`,
          `<p>Hi ${request.studentName || 'Student'},</p><p>${request.mentorName} was unable to accept your mentoring request on <em>"${request.topic}"</em> at this time.</p><p><strong>Reason provided:</strong> ${reason}</p><p>Feel free to explore other verified mentors on the <a href="https://anx.club/mentors">Mentor Directory</a>.</p>`
        );
      } catch (e) {
        console.warn('Email dispatch warning:', e);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Request declined.',
    });
  } catch (error: any) {
    console.error('[POST /api/v1/mentor/requests/[id]/decline] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
