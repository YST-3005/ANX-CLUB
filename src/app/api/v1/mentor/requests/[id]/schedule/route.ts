import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyRequestAccess } from '@/lib/mentoring-auth';
import { sendEmail } from '@/lib/resend';
import { MentoringSession } from '@/types/mentoring';
import { createGoogleCalendarEvent } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await verifyRequestAccess(req, params.id, { allowStudent: false, allowMentor: true });
    if (access.error) return access.error;

    const { user, request } = access;

    if (request.status !== 'accepted_awaiting_scheduling' && request.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Cannot schedule session for request with status "${request.status}".` },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { date, time, durationMin = 45 } = body;

    if (!date || !time) {
      return NextResponse.json(
        { success: false, error: 'Both date (YYYY-MM-DD) and time (HH:mm) are required.' },
        { status: 400 }
      );
    }

    // 1. Duration validation: min 15m, max 120m
    const duration = Number(durationMin);
    if (isNaN(duration) || duration < 15 || duration > 120) {
      return NextResponse.json(
        { success: false, error: 'Session duration must be between 15 and 120 minutes.' },
        { status: 400 }
      );
    }

    // 2. Parse and validate UTC timestamp
    // Combine date and time (assumed user/mentor's current timezone or ISO)
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
        { success: false, error: 'Cannot schedule sessions in the past. Please choose an upcoming time.' },
        { status: 400 }
      );
    }

    const startAtUTC = scheduledDateTime.toISOString();
    const endAtUTC = new Date(scheduledDateTime.getTime() + duration * 60000).toISOString();

    // 3. Mentor Overlap Check: Ensure mentor has no conflicting session at this time
    const existingSessionsSnap = await adminDb
      .collection('mentoringSessions')
      .where('mentorId', '==', user.uid)
      .where('status', '==', 'scheduled')
      .get();

    let hasConflict = false;
    let conflictDetails = '';

    existingSessionsSnap.forEach(doc => {
      const s = doc.data();
      if (!s.startAtUTC) return;
      const existingStart = new Date(s.startAtUTC).getTime();
      const existingDuration = Number(s.durationMin || 45);
      const existingEnd = existingStart + existingDuration * 60000;

      const newStart = scheduledDateTime.getTime();
      const newEnd = newStart + duration * 60000;

      // Overlap condition: max(start1, start2) < min(end1, end2)
      if (Math.max(existingStart, newStart) < Math.min(existingEnd, newEnd)) {
        hasConflict = true;
        conflictDetails = `Conflicting session already scheduled for ${new Date(s.startAtUTC).toLocaleString()}`;
      }
    });

    if (hasConflict) {
      return NextResponse.json(
        { success: false, error: `Mentor schedule conflict: You already have another session booked during this window (${conflictDetails}). Please select a different time slot.` },
        { status: 409 }
      );
    }

    // 4. Create single-source-of-truth session in 'mentoringSessions'
    const nowISO = new Date().toISOString();
    const sessionRef = adminDb.collection('mentoringSessions').doc();
    const sessionId = sessionRef.id;

    // 4. Attempt Google Calendar & Meet generation
    const googleResult = await createGoogleCalendarEvent({
      sessionId,
      mentorUid: user.uid,
      mentorEmail: request.mentorEmail || user.email,
      studentEmail: request.studentEmail || request.memberEmail || '',
      studentName: request.studentName || request.memberName || 'Student',
      mentorName: request.mentorName || user.fullName,
      topic: request.topic,
      notes: request.message || '',
      startAtUTC,
      durationMin: duration,
    });

    const initialHistory = [
      {
        action: 'scheduled',
        performedBy: user.uid,
        performedByRole: 'mentor' as const,
        timestamp: nowISO,
        notes: `Scheduled for ${startAtUTC} (${duration} min)`,
      },
    ];

    if (googleResult.googleEventId) {
      initialHistory.push({
        action: googleResult.success ? 'google_sync_succeeded' : 'google_sync_failed',
        performedBy: user.uid,
        performedByRole: 'mentor' as const,
        timestamp: nowISO,
        notes: googleResult.success
          ? `Google Meet confirmed: ${googleResult.meetLink}`
          : `Google sync note: ${googleResult.syncError || 'Conference pending'}`,
      });
    }

    const sessionData: MentoringSession = {
      id: sessionId,
      requestId: params.id,
      mentorId: user.uid,
      mentorName: request.mentorName || user.fullName,
      mentorEmail: request.mentorEmail || user.email,
      studentId: request.studentId || request.memberId || request.userId || '',
      studentName: request.studentName || request.memberName || 'Student Member',
      studentEmail: request.studentEmail || request.memberEmail || '',
      topic: request.topic,
      description: request.message || '',
      startAtUTC,
      durationMin: duration,
      status: 'scheduled',
      googleEventId: googleResult.googleEventId || null,
      meetLink: googleResult.meetLink || null, // STRICT: No fake links! Remains null unless verified by Google API
      conferenceStatus: googleResult.conferenceStatus,
      syncStatus: googleResult.syncStatus,
      syncError: googleResult.syncError || null,
      history: initialHistory,
      createdAt: nowISO,
      updatedAt: nowISO,
      // Compatibility aliases
      memberId: request.studentId || request.memberId || request.userId || '',
      userId: request.studentId || request.memberId || request.userId || '',
    };

    await sessionRef.set(sessionData);

    // 5. Update originating request
    const updatedRequestHistory = [
      ...(request.history || []),
      {
        action: 'scheduled',
        performedBy: user.uid,
        performedByRole: 'mentor' as const,
        timestamp: nowISO,
        notes: `Session scheduled for ${startAtUTC}`,
      },
    ];

    await adminDb.collection('mentorRequests').doc(params.id).update({
      status: 'scheduled',
      sessionId,
      updatedAt: nowISO,
      history: updatedRequestHistory,
    });

    // 6. Notify student in-app
    const studentUid = request.studentId || request.memberId;
    if (studentUid) {
      try {
        await adminDb.collection('notifications').add({
          recipientId: studentUid,
          title: 'Mentoring Session Scheduled!',
          body: `${request.mentorName} scheduled your session on "${request.topic}" for ${date} at ${time} (${duration} min).`,
          actionUrl: '/mentors/my-sessions',
          category: 'mentoring',
          channels: ['in_app'],
          isRead: false,
          createdAt: nowISO,
        });
      } catch (e) {
        console.warn('Notification error:', e);
      }
    }

    // 7. Send confirmation email to student
    const studentEmail = request.studentEmail || request.memberEmail;
    if (studentEmail) {
      try {
        const meetText = googleResult.meetLink
          ? `<p><strong>Google Meet Link:</strong> <a href="${googleResult.meetLink}">${googleResult.meetLink}</a></p>`
          : `<p>Your meeting link will be visible in your <a href="https://anx.club/mentors/my-sessions">My Sessions</a> dashboard once Google Calendar sync completes.</p>`;

        await sendEmail(
          studentEmail,
          `🗓️ Mentoring Session Scheduled with ${request.mentorName}`,
          `<p>Hi ${request.studentName || 'Student'},</p><p>Your mentoring session with <strong>${request.mentorName}</strong> has been scheduled!</p><p><strong>Topic:</strong> ${request.topic}<br/><strong>Date & Time:</strong> ${date} at ${time}<br/><strong>Duration:</strong> ${duration} minutes</p>${meetText}`
        );
      } catch (e) {
        console.warn('Email warning:', e);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Session scheduled successfully!',
      data: sessionData,
    });
  } catch (error: any) {
    console.error('[POST /api/v1/mentor/requests/[id]/schedule] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
