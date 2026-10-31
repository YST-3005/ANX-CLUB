import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifySessionAccess } from '@/lib/mentoring-auth';
import { createGoogleCalendarEvent } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await verifySessionAccess(req, params.id, { allowStudent: false, allowMentor: true });
    if (access.error) return access.error;

    const { user, session } = access;

    if (session.status === 'completed' || session.status === 'cancelled') {
      return NextResponse.json(
        { success: false, error: `Cannot sync Google Meet for a ${session.status} session.` },
        { status: 400 }
      );
    }

    const googleResult = await createGoogleCalendarEvent({
      sessionId: session.id,
      googleEventId: session.googleEventId || undefined,
      mentorUid: user.uid,
      mentorEmail: session.mentorEmail || user.email,
      studentEmail: session.studentEmail,
      studentName: session.studentName,
      mentorName: session.mentorName || user.fullName,
      topic: session.topic,
      notes: session.description,
      startAtUTC: session.startAtUTC,
      durationMin: session.durationMin,
    });

    const nowISO = new Date().toISOString();
    const historyEntry = {
      action: googleResult.success ? 'google_sync_succeeded' : 'google_sync_retry_failed',
      performedBy: user.uid,
      performedByRole: 'mentor' as const,
      timestamp: nowISO,
      notes: googleResult.success
        ? `Google Meet confirmed: ${googleResult.meetLink}`
        : `Google sync failed: ${googleResult.syncError || 'Unknown error'}`,
    };

    const updateData: any = {
      conferenceStatus: googleResult.conferenceStatus,
      syncStatus: googleResult.syncStatus,
      syncError: googleResult.syncError || null,
      updatedAt: nowISO,
      history: [...(session.history || []), historyEntry],
    };

    if (googleResult.googleEventId) {
      updateData.googleEventId = googleResult.googleEventId;
    }
    if (googleResult.meetLink) {
      updateData.meetLink = googleResult.meetLink;
    }

    await adminDb.collection('mentoringSessions').doc(params.id).update(updateData);

    return NextResponse.json({
      success: googleResult.success,
      message: googleResult.success
        ? 'Google Meet generated and synced successfully!'
        : (googleResult.syncError || 'Google sync failed. Please check your Google Calendar connection.'),
      data: {
        ...session,
        ...updateData,
      },
    });
  } catch (error: any) {
    console.error('[POST /api/v1/mentor/sessions/[id]/retry-google] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to retry Google sync' },
      { status: 500 }
    );
  }
}
