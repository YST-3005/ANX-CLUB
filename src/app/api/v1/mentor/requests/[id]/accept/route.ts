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

    if (request.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Request cannot be accepted because it is currently "${request.status}".` },
        { status: 400 }
      );
    }

    const nowISO = new Date().toISOString();
    const updatedHistory = [
      ...(request.history || []),
      {
        action: 'accepted',
        performedBy: user.uid,
        performedByRole: 'mentor',
        timestamp: nowISO,
        notes: 'Request accepted by mentor. Awaiting session scheduling.',
      },
    ];

    // Status moves to accepted_awaiting_scheduling and DOES NOT schedule a meeting
    await adminDb.collection('mentorRequests').doc(params.id).update({
      status: 'accepted_awaiting_scheduling',
      updatedAt: nowISO,
      history: updatedHistory,
    });

    // Send in-app notification to the student
    const studentUid = request.studentId || request.memberId;
    if (studentUid) {
      try {
        await adminDb.collection('notifications').add({
          recipientId: studentUid,
          title: 'Mentoring Request Accepted!',
          body: `${request.mentorName} accepted your request on "${request.topic}". Your mentor is now setting up the session schedule.`,
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
          `✅ Mentoring Request Accepted by ${request.mentorName}`,
          `<p>Hi ${request.studentName || 'Student'},</p><p>Great news! <strong>${request.mentorName}</strong> has accepted your mentoring request on <em>"${request.topic}"</em>.</p><p>Your mentor will schedule the official calendar meeting time shortly. You can monitor status from your <a href="https://anx.club/mentors/my-sessions">My Sessions</a> portal.</p>`
        );
      } catch (e) {
        console.warn('Email dispatch warning:', e);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Request accepted! You can now choose a date, time, and duration to schedule the session.',
    });
  } catch (error: any) {
    console.error('[POST /api/v1/mentor/requests/[id]/accept] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
