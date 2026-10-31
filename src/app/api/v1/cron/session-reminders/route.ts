import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { sendEmail } from '@/lib/resend';

export const dynamic = 'force-dynamic';

/**
 * Scheduled Session Reminder Worker
 * Secured by CRON_SECRET header. Can be scheduled every 15-30 minutes via Vercel Cron or external runner.
 * Dispatches 24-hour and 1-hour reminders to both student and mentor idempotently.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Authorization check: Return 401 if CRON_SECRET is unset OR the header doesn't match
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization') || req.headers.get('x-cron-secret');

    if (!cronSecret) {
      return NextResponse.json({ error: 'Unauthorized: CRON_SECRET is not configured' }, { status: 401 });
    }

    const isAuthorized =
      authHeader === `Bearer ${cronSecret}` ||
      authHeader === cronSecret ||
      req.nextUrl.searchParams.get('secret') === cronSecret;

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized: Invalid CRON_SECRET' }, { status: 401 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: 'Database connection unavailable' }, { status: 503 });
    }

    const now = Date.now();
    const nowISO = new Date().toISOString();

    // 2. Fetch all upcoming scheduled sessions
    const sessionsSnap = await adminDb
      .collection('mentoringSessions')
      .where('status', 'in', ['scheduled', 'rescheduled'])
      .get();

    let reminders24hCount = 0;
    let reminders1hCount = 0;

    for (const doc of sessionsSnap.docs) {
      const session = doc.data();
      if (!session.startAtUTC) continue;

      const startTime = new Date(session.startAtUTC).getTime();
      const diffMs = startTime - now;
      const diffHours = diffMs / (1000 * 60 * 60);

      // --- 24-Hour Reminder Window (23h to 25h) ---
      if (diffHours >= 23 && diffHours <= 25 && !session.reminder24hSent) {
        // Send in-app notification to student
        if (session.studentId) {
          try {
            await adminDb.collection('notifications').add({
              recipientId: session.studentId,
              title: '⏰ Mentoring Session in 24 Hours',
              body: `Reminder: Your session on "${session.topic}" with ${session.mentorName} starts in approximately 24 hours.`,
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
            const meetHtml = session.meetLink
              ? `<p><strong>Google Meet Link:</strong> <a href="${session.meetLink}">${session.meetLink}</a></p>`
              : '<p>Google Meet link will be available in your portal.</p>';

            await sendEmail(
              session.studentEmail,
              `⏰ Reminder: Mentoring Session in 24h with ${session.mentorName}`,
              `<p>Hi ${session.studentName},</p><p>This is a quick reminder that your mentoring session on <strong>"${session.topic}"</strong> with <strong>${session.mentorName}</strong> is scheduled in 24 hours.</p>${meetHtml}`
            );
          } catch (e) {}
        }

        // Mark 24h reminder sent idempotently
        await doc.ref.update({
          reminder24hSent: true,
          updatedAt: nowISO,
        });

        reminders24hCount++;
      }

      // --- 1-Hour Reminder Window (45m to 75m) ---
      const diffMinutes = diffMs / (1000 * 60);
      if (diffMinutes >= 45 && diffMinutes <= 75 && !session.reminder1hSent) {
        // Send urgent in-app notification to student
        if (session.studentId) {
          try {
            await adminDb.collection('notifications').add({
              recipientId: session.studentId,
              title: '🚀 Mentoring Session in 1 Hour!',
              body: `Your session on "${session.topic}" with ${session.mentorName} starts in 1 hour. Get ready!`,
              actionUrl: '/mentors/my-sessions',
              category: 'mentoring',
              channels: ['in_app'],
              isRead: false,
              createdAt: nowISO,
            });
          } catch (e) {}
        }

        // Send urgent in-app notification to mentor
        if (session.mentorId) {
          try {
            await adminDb.collection('notifications').add({
              recipientId: session.mentorId,
              title: '🚀 Mentoring Session in 1 Hour!',
              body: `Your upcoming session with ${session.studentName} on "${session.topic}" starts in 1 hour.`,
              actionUrl: '/mentor-dashboard',
              category: 'mentoring',
              channels: ['in_app'],
              isRead: false,
              createdAt: nowISO,
            });
          } catch (e) {}
        }

        // Send email to student with confirmed Meet link
        if (session.studentEmail) {
          try {
            const meetHtml = session.meetLink
              ? `<p><strong>Google Meet Link:</strong> <a href="${session.meetLink}">${session.meetLink}</a></p>`
              : '<p>Please check your <a href="https://anx.club/mentors/my-sessions">My Sessions</a> dashboard for conference details.</p>';

            await sendEmail(
              session.studentEmail,
              `🚀 Starting in 1 Hour: Mentoring with ${session.mentorName}`,
              `<p>Hi ${session.studentName},</p><p>Your mentoring session on <strong>"${session.topic}"</strong> starts in 1 hour.</p>${meetHtml}`
            );
          } catch (e) {}
        }

        // Mark 1h reminder sent idempotently
        await doc.ref.update({
          reminder1hSent: true,
          updatedAt: nowISO,
        });

        reminders1hCount++;
      }
    }

    return NextResponse.json({
      success: true,
      processedSessions: sessionsSnap.size,
      reminders24hSent: reminders24hCount,
      reminders1hSent: reminders1hCount,
      timestamp: nowISO,
    });
  } catch (error: any) {
    console.error('[GET /api/v1/cron/session-reminders] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
