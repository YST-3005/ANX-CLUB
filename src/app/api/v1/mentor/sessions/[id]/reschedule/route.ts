import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifySessionAccess } from '@/lib/mentoring-auth';
import { sendEmail } from '@/lib/resend';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await verifySessionAccess(req, params.id, { allowStudent: false, allowMentor: true });
    if (access.error) return access.error;

    const { user, session } = access;

    if (session.status !== 'scheduled' && session.status !== 'rescheduled') {
      return NextResponse.json(
        { success: false, error: `Cannot reschedule session with status "${session.status}".` },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { date, time, reason } = body;

    if (!date || !time) {
      return NextResponse.json(
        { success: false, error: 'Both new date (YYYY-MM-DD) and time (HH:mm) are required.' },
        { status: 400 }
      );
    }

    const scheduledDateTime = new Date(`${date}T${time.length === 5 ? time + ':00' : time}`);
    if (isNaN(scheduledDateTime.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid date or time format provided.' },
        { status: 400 }
      );
    }

    const now = new Date();
    if (scheduledDateTime.getTime() <= now.getTime()) {
      return NextResponse.json(
        { success: false, error: 'Cannot reschedule to a past date or time.' },
        { status: 400 }
      );
    }

    const duration = session.durationMin || 45;
    const newStartAtUTC = scheduledDateTime.toISOString();

    // Check mentor conflict (excluding current session)
    const existingSessionsSnap = await adminDb
      .collection('mentoringSessions')
      .where('mentorId', '==', user.uid)
      .where('status', '==', 'scheduled')
      .get();

    let hasConflict = false;
    existingSessionsSnap.forEach(doc => {
      if (doc.id === params.id) return; // skip self
      const s = doc.data();
      if (!s.startAtUTC) return;

      const existingStart = new Date(s.startAtUTC).getTime();
      const existingEnd = existingStart + Number(s.durationMin || 45) * 60000;
      const newStart = scheduledDateTime.getTime();
      const newEnd = newStart + duration * 60000;

      if (Math.max(existingStart, newStart) < Math.min(existingEnd, newEnd)) {
        hasConflict = true;
      }
    });

    if (hasConflict) {
      return NextResponse.json(
        { success: false, error: 'Schedule conflict: You have another session booked during this window.' },
        { status: 409 }
      );
    }

    const nowISO = new Date().toISOString();
    const updatedHistory = [
      ...(session.history || []),
      {
        action: 'rescheduled',
        performedBy: user.uid,
        performedByRole: 'mentor' as const,
        timestamp: nowISO,
        notes: reason || `Rescheduled from ${session.startAtUTC} to ${newStartAtUTC}`,
      },
    ];

    await adminDb.collection('mentoringSessions').doc(params.id).update({
      startAtUTC: newStartAtUTC,
      rescheduleReason: reason || 'Rescheduled by mentor',
      status: 'rescheduled',
      updatedAt: nowISO,
      history: updatedHistory,
    });

    // Notify student in-app
    if (session.studentId) {
      try {
        await adminDb.collection('notifications').add({
          recipientId: session.studentId,
          title: 'Session Rescheduled',
          body: `${session.mentorName} rescheduled your session on "${session.topic}" to ${date} at ${time}.`,
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
          `🗓️ Mentoring Session Rescheduled by ${session.mentorName}`,
          `<p>Hi ${session.studentName},</p><p>${session.mentorName} has rescheduled your session on <strong>"${session.topic}"</strong> to <strong>${date} at ${time}</strong>.</p><p>Check your <a href="https://anx.club/mentors/my-sessions">My Sessions</a> dashboard for updated details.</p>`
        );
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      message: 'Session rescheduled successfully!',
      data: { startAtUTC: newStartAtUTC },
    });
  } catch (error: any) {
    console.error('[PATCH /api/v1/mentor/sessions/[id]/reschedule] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
