import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { sessionsRepository } from '@/lib/turso/repositories/sessionsRepository';
import { mentorsRepository } from '@/lib/turso/repositories/mentorsRepository';
import { updateGoogleCalendarMeeting } from '@/lib/google/calendar';
import { queuePushWebhook } from '@/lib/webhooks/dispatcher';

export const dynamic = 'force-dynamic';

function calculateEndTime(startTimeStr: string, durationMinutes: number): string {
  let hours = 10;
  let minutes = 0;
  const match = startTimeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (match) {
    hours = parseInt(match[1], 10);
    minutes = parseInt(match[2], 10);
    const ampm = match[3]?.toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
  }

  const totalMin = hours * 60 + minutes + durationMinutes;
  const endH = Math.floor(totalMin / 60) % 24;
  const endM = totalMin % 60;
  const period = endH >= 12 ? 'PM' : 'AM';
  const displayH = endH % 12 === 0 ? 12 : endH % 12;
  return `${displayH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')} ${period}`;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { scheduledDate, startTime, durationMinutes = 60, timeZone = 'Asia/Kolkata' } = body;

    if (!scheduledDate || !startTime) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: scheduledDate and startTime are mandatory.' },
        { status: 400 }
      );
    }

    const session = await sessionsRepository.getById(params.id);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found.' }, { status: 404 });
    }

    if (session.status === 'cancelled' || session.status === 'completed') {
      return NextResponse.json(
        { success: false, error: `Cannot reschedule a session that is already ${session.status}.` },
        { status: 400 }
      );
    }

    // Verify mentor ownership
    const mentor = await mentorsRepository.getByUserId(user.uid);

    if (!mentor || (mentor.id !== session.mentor_id && user.role.toLowerCase() !== 'admin')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only the assigned mentor can reschedule this session.' },
        { status: 403 }
      );
    }

    const endTime = calculateEndTime(startTime, durationMinutes);

    // Update Google Calendar event if it exists
    if (session.calendar_event_id && !session.calendar_event_id.startsWith('pending_')) {
      const mentorProfile = await mentorsRepository.getProfile(session.mentor_id);
      await updateGoogleCalendarMeeting({
        calendarEventId: session.calendar_event_id,
        topic: session.topic,
        scheduledDate,
        startTime,
        durationMinutes,
        timeZone,
        mentorId: session.mentor_id,
        mentorRefreshToken: mentorProfile?.google_refresh_token,
      });
    }

    // Update Turso database
    const updated = await sessionsRepository.reschedule({
      id: params.id,
      mentor_id: session.mentor_id,
      scheduled_date: scheduledDate,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: durationMinutes,
      performed_by: user.uid,
    });

    // Notify student
    queuePushWebhook({
      recipientId: session.student_id,
      entity: 'mentoring_session',
      entity_id: updated.id,
      summary: `Session Rescheduled by ${session.mentor_name || 'Mentor'}`,
      version: updated.version,
      updated_at: updated.updated_at,
      data: {
        sessionId: updated.id,
        scheduledDate,
        startTime,
        endTime,
        meetingLink: updated.meeting_link || '',
        actionUrl: '/dashboard',
        message: `Your mentoring session has been rescheduled to ${scheduledDate} at ${startTime}.`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Session rescheduled successfully.',
      session: updated,
    });
  } catch (error: any) {
    console.error(`[POST /api/v1/mentoring/sessions/${params.id}/reschedule] Error:`, error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to reschedule session.' },
      { status: 500 }
    );
  }
}
