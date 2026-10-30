import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifySessionAccess } from '@/lib/mentoring-auth';
import { awardMentorSessionXP } from '@/lib/gamification';
import { sendEmail } from '@/lib/resend';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await verifySessionAccess(req, params.id, { allowStudent: false, allowMentor: true });
    if (access.error) return access.error;

    const { user, session } = access;

    if (session.status === 'completed') {
      return NextResponse.json({
        success: true,
        message: 'Session is already marked as completed.',
        data: { status: 'completed' },
      });
    }

    const nowISO = new Date().toISOString();
    const updatedHistory = [
      ...(session.history || []),
      {
        action: 'completed',
        performedBy: user.uid,
        performedByRole: 'mentor' as const,
        timestamp: nowISO,
        notes: 'Session marked as successfully completed',
      },
    ];

    // 1. Update session document
    await adminDb.collection('mentoringSessions').doc(params.id).update({
      status: 'completed',
      updatedAt: nowISO,
      history: updatedHistory,
    });

    // 2. Update originating request
    if (session.requestId) {
      try {
        await adminDb.collection('mentorRequests').doc(session.requestId).update({
          status: 'completed',
          updatedAt: nowISO,
        });
      } catch (e) {}
    }

    // 3. Award +75 XP to the student via idempotent awardMentorSessionXP
    let xpResult = null;
    const studentUid = session.studentId || session.memberId;
    if (studentUid) {
      try {
        xpResult = await awardMentorSessionXP(studentUid, params.id, session.mentorName);
      } catch (xpErr) {
        console.warn('XP award notice:', xpErr);
      }
    }

    // 4. Increment mentor's sessions completed count
    try {
      const mentorDocSnap = await adminDb.collection('mentors').doc(session.mentorId).get();
      if (mentorDocSnap.exists) {
        const cur = mentorDocSnap.data()?.sessionsCompleted || 0;
        await adminDb.collection('mentors').doc(session.mentorId).update({
          sessionsCompleted: cur + 1,
          updatedAt: nowISO,
        });
      }
    } catch (e) {}

    // 5. In-app notification to student
    if (studentUid) {
      try {
        await adminDb.collection('notifications').add({
          recipientId: studentUid,
          title: 'Mentoring Session Completed! 🎓',
          body: `Your session on "${session.topic}" with ${session.mentorName} is marked complete. +75 XP added to your leadership score!`,
          actionUrl: '/mentors/my-sessions',
          category: 'gamification',
          channels: ['in_app'],
          isRead: false,
          createdAt: nowISO,
        });
      } catch (e) {}
    }

    // 6. Send email to student
    if (session.studentEmail) {
      try {
        await sendEmail(
          session.studentEmail,
          `🎉 Mentorship Completed: +75 XP Earned!`,
          `<p>Hi ${session.studentName},</p><p>Congratulations on completing your mentoring session on <strong>"${session.topic}"</strong> with ${session.mentorName}!</p><p>You earned <strong>+75 XP</strong> toward your A.N.X leadership rank. Keep building and growing!</p>`
        );
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      message: 'Session marked as completed! +75 XP awarded to student.',
      data: {
        status: 'completed',
        xpAwarded: xpResult?.xpAwarded ?? 75,
      },
    });
  } catch (error: any) {
    console.error('[POST /api/v1/mentor/sessions/[id]/complete] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
