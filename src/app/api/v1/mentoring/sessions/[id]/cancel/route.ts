import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { sessionsRepository } from '@/lib/turso/repositories/sessionsRepository';
import { mentorsRepository } from '@/lib/turso/repositories/mentorsRepository';
import { deleteGoogleCalendarMeeting } from '@/lib/google/calendar';
import { queuePushWebhook } from '@/lib/webhooks/dispatcher';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const reason = body.reason || 'Session cancelled by participant';

    const session = await sessionsRepository.getById(params.id);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found.' }, { status: 404 });
    }

    if (session.status === 'cancelled') {
      return NextResponse.json({ success: false, error: 'Session is already cancelled.' }, { status: 400 });
    }

    const mentor = await mentorsRepository.getByUserId(user.uid);

    const isStudent = session.student_id === user.uid;
    const isMentor = mentor && session.mentor_id === mentor.id;
    const isAdmin = user.role.toLowerCase() === 'admin';

    if (!isStudent && !isMentor && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You are not a participant in this mentoring session.' },
        { status: 403 }
      );
    }

    // Delete Google Calendar event if it exists
    if (session.calendar_event_id && !session.calendar_event_id.startsWith('pending_')) {
      const mentorProfile = await mentorsRepository.getProfile(session.mentor_id);
      await deleteGoogleCalendarMeeting(
        session.calendar_event_id,
        mentorProfile?.google_refresh_token,
        session.mentor_id
      ).catch(() => {});
    }

    // Cancel in Turso (and record tombstone)
    const cancelled = await sessionsRepository.cancel({
      id: params.id,
      actor_id: user.uid,
      reason,
      is_mentor: Boolean(isMentor),
    });

    // Notify the other party
    const recipientId = isStudent ? session.mentor_id : session.student_id;
    const actorName = isStudent ? (session.student_name || 'Student') : (session.mentor_name || 'Mentor');

    queuePushWebhook({
      recipientId,
      entity: 'mentoring_session',
      entity_id: cancelled.id,
      summary: `Mentoring Session Cancelled: ${session.topic}`,
      version: cancelled.version,
      updated_at: cancelled.updated_at,
      data: {
        sessionId: cancelled.id,
        status: 'cancelled',
        reason,
        actionUrl: '/dashboard',
        message: `Mentoring session on ${session.scheduled_date} was cancelled by ${actorName}. Reason: ${reason}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Mentoring session cancelled successfully.',
      session: cancelled,
    });
  } catch (error: any) {
    console.error(`[POST /api/v1/mentoring/sessions/${params.id}/cancel] Error:`, error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to cancel session.' },
      { status: 500 }
    );
  }
}
