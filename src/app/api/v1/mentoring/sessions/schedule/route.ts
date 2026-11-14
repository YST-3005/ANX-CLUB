import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { requestsRepository } from '@/lib/turso/repositories/requestsRepository';
import { mentorsRepository } from '@/lib/turso/repositories/mentorsRepository';
import { sessionsRepository } from '@/lib/turso/repositories/sessionsRepository';
import { usersRepository } from '@/lib/turso/repositories/usersRepository';
import { createGoogleMeetConference } from '@/lib/google/calendar';
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

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { requestId, scheduledDate, startTime, durationMinutes = 60, timeZone = 'Asia/Kolkata' } = body;

    if (!requestId || !scheduledDate || !startTime) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: requestId, scheduledDate, and startTime are required.' },
        { status: 400 }
      );
    }

    // 1. Fetch and validate request
    const reqData = await requestsRepository.getById(requestId);
    if (!reqData) {
      return NextResponse.json({ success: false, error: 'Mentoring request not found.' }, { status: 404 });
    }

    if (reqData.status !== 'accepted') {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot schedule session: Request status is '${reqData.status}'. Mentor must accept the request before scheduling.`,
        },
        { status: 400 }
      );
    }

    // 2. Verify mentor authorization strictly via user_id
    const mentor = await mentorsRepository.getByUserId(user.uid);

    if (!mentor || mentor.id !== reqData.mentor_id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only the assigned mentor can schedule this session.' },
        { status: 403 }
      );
    }

    // 3. Prevent past date scheduling
    const today = new Date().toISOString().split('T')[0];
    if (scheduledDate < today) {
      return NextResponse.json(
        { success: false, error: 'Cannot schedule session in the past. Please select an upcoming date.' },
        { status: 400 }
      );
    }

    const student = await usersRepository.getById(reqData.student_id);
    const endTime = calculateEndTime(startTime, durationMinutes);

    // 4. Retrieve mentor profile (with securely stored Google OAuth refresh token if configured)
    const mentorProfile = await mentorsRepository.getProfile(reqData.mentor_id);

    // 5. Create real Google Calendar Event & Request Google Meet Conference
    const calendarResult = await createGoogleMeetConference({
      sessionId: `req_${reqData.id}`,
      topic: reqData.topic,
      description: reqData.message || undefined,
      scheduledDate,
      startTime,
      durationMinutes,
      timeZone,
      studentEmail: student?.email || reqData.student_email || 'student@example.com',
      studentName: student?.full_name || reqData.student_name || 'Student',
      mentorEmail: mentor.email,
      mentorName: mentor.full_name,
      mentorId: reqData.mentor_id,
      mentorRefreshToken: mentorProfile?.google_refresh_token,
    });

    const sessionStatus = calendarResult.meetingLink ? 'confirmed' : 'pending_conference';

    // 6. Persist authoritative session in Turso
    const session = await sessionsRepository.create({
      request_id: reqData.id,
      student_id: reqData.student_id,
      mentor_id: reqData.mentor_id,
      topic: reqData.topic,
      description: reqData.message || undefined,
      scheduled_date: scheduledDate,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: durationMinutes,
      time_zone: timeZone,
      status: sessionStatus,
      calendar_event_id: calendarResult.calendarEventId,
      meeting_link: calendarResult.meetingLink || undefined,
      performed_by: user.uid,
    });

    // 7. Dispatch push webhook to student
    queuePushWebhook({
      recipientId: reqData.student_id,
      entity: 'mentoring_session',
      entity_id: session.id,
      summary: `Mentoring Session Scheduled: ${scheduledDate} (${startTime})`,
      version: session.version,
      updated_at: session.updated_at,
      data: {
        sessionId: session.id,
        scheduledDate,
        startTime,
        endTime,
        meetingLink: session.meeting_link || '',
        status: session.status,
        actionUrl: '/dashboard',
        message: `Your mentoring session with ${mentor.full_name} has been scheduled for ${scheduledDate} at ${startTime}.`,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: session.meeting_link
          ? 'Session scheduled and Google Meet conference confirmed.'
          : 'Session scheduled. Google Meet conference is pending credential configuration.',
        session,
        conferenceStatus: calendarResult.conferenceStatus,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[POST /api/v1/mentoring/sessions/schedule] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to schedule mentoring session.' },
      { status: 500 }
    );
  }
}
