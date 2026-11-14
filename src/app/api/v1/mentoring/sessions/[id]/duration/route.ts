import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { sessionsRepository } from '@/lib/turso/repositories/sessionsRepository';
import { mentorsRepository } from '@/lib/turso/repositories/mentorsRepository';
import { updateGoogleCalendarMeeting } from '@/lib/google/calendar';

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

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { durationMinutes } = body;

    if (!durationMinutes || Number(durationMinutes) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid durationMinutes is required.' },
        { status: 400 }
      );
    }

    const session = await sessionsRepository.getById(params.id);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found.' }, { status: 404 });
    }

    let mentor = await mentorsRepository.getByUserId(user.uid);
    if (!mentor && user.email) {
      mentor = await mentorsRepository.getByEmail(user.email);
    }

    if (!mentor || (mentor.id !== session.mentor_id && user.role.toLowerCase() !== 'admin')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only the assigned mentor can update session duration.' },
        { status: 403 }
      );
    }

    const end_time = calculateEndTime(session.start_time, Number(durationMinutes));

    // Update Google Calendar event
    if (session.calendar_event_id && !session.calendar_event_id.startsWith('pending_')) {
      const mentorProfile = await mentorsRepository.getProfile(session.mentor_id);
      await updateGoogleCalendarMeeting({
        calendarEventId: session.calendar_event_id,
        scheduledDate: session.scheduled_date,
        startTime: session.start_time,
        durationMinutes: Number(durationMinutes),
        mentorRefreshToken: mentorProfile?.google_refresh_token,
      });
    }

    const updated = await sessionsRepository.updateDuration({
      id: params.id,
      mentor_id: session.mentor_id,
      duration_minutes: Number(durationMinutes),
      end_time,
      performed_by: user.uid,
    });

    return NextResponse.json({
      success: true,
      message: 'Session duration updated successfully.',
      session: updated,
    });
  } catch (error: any) {
    console.error(`[PATCH /api/v1/mentoring/sessions/${params.id}/duration] Error:`, error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update session duration.' },
      { status: 500 }
    );
  }
}
