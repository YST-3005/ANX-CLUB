import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifySessionAccess } from '@/lib/mentoring-auth';
import { patchGoogleCalendarEvent } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await verifySessionAccess(req, params.id, { allowStudent: false, allowMentor: true });
    if (access.error) return access.error;

    const { user, session } = access;

    const body = await req.json().catch(() => ({}));
    const duration = Number(body.durationMin);

    if (isNaN(duration) || duration < 15 || duration > 120) {
      return NextResponse.json(
        { success: false, error: 'Duration must be between 15 and 120 minutes.' },
        { status: 400 }
      );
    }

    const nowISO = new Date().toISOString();

    // Patch existing Google Calendar event if present
    if (session.googleEventId && session.startAtUTC) {
      await patchGoogleCalendarEvent(user.uid, session.googleEventId, session.startAtUTC, duration);
    }

    const updatedHistory = [
      ...(session.history || []),
      {
        action: 'duration_updated',
        performedBy: user.uid,
        performedByRole: 'mentor' as const,
        timestamp: nowISO,
        notes: `Duration updated from ${session.durationMin}m to ${duration}m`,
      },
    ];

    await adminDb.collection('mentoringSessions').doc(params.id).update({
      durationMin: duration,
      updatedAt: nowISO,
      history: updatedHistory,
    });

    // Notify student in-app
    if (session.studentId) {
      try {
        await adminDb.collection('notifications').add({
          recipientId: session.studentId,
          title: 'Session Duration Updated',
          body: `${session.mentorName} updated the duration for your session on "${session.topic}" to ${duration} minutes.`,
          actionUrl: '/mentors/my-sessions',
          category: 'mentoring',
          channels: ['in_app'],
          isRead: false,
          createdAt: nowISO,
        });
      } catch (e) {
        console.warn('Failed to send duration notification to student:', e);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Duration updated to ${duration} minutes.`,
      data: { durationMin: duration },
    });
  } catch (error: any) {
    console.error('[PATCH /api/v1/mentor/sessions/[id]/duration] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
