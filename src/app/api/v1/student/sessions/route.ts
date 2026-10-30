import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireStudentAuth } from '@/lib/mentoring-auth';
import { MentorRequest, MentoringSession } from '@/types/mentoring';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireStudentAuth(req);
    if (authResult.error) return authResult.error;
    const { user } = authResult;
    const userId = user.uid;

    // 1. Query student's requests
    const requestsMap = new Map<string, MentorRequest>();
    const reqQueries = [
      adminDb.collection('mentorRequests').where('studentId', '==', userId).get(),
      adminDb.collection('mentorRequests').where('memberId', '==', userId).get(),
    ];

    const reqSnaps = await Promise.all(reqQueries);
    reqSnaps.forEach(snap => {
      snap.forEach(doc => {
        const d = doc.data();
        requestsMap.set(doc.id, {
          id: doc.id,
          studentId: d.studentId || d.memberId || userId,
          studentName: d.studentName || d.memberName || 'Student',
          studentEmail: d.studentEmail || d.memberEmail || '',
          mentorId: d.mentorId || '',
          mentorName: d.mentorName || 'Mentor',
          mentorEmail: d.mentorEmail || '',
          topic: d.topic || d.reason || 'Mentorship Session',
          message: d.message || '',
          preferredDate: d.preferredDate || '',
          preferredTime: d.preferredTime || '',
          preferredTimes: d.preferredTimes || [],
          status: d.status || 'pending',
          declineReason: d.declineReason || '',
          sessionId: d.sessionId || undefined,
          createdAt: d.createdAt || '',
          updatedAt: d.updatedAt || '',
        });
      });
    });

    // 2. Query student's sessions
    const sessionsMap = new Map<string, MentoringSession>();
    const sessionQueries = [
      adminDb.collection('mentoringSessions').where('studentId', '==', userId).get(),
      adminDb.collection('mentoringSessions').where('memberId', '==', userId).get(),
    ];

    const sessionSnaps = await Promise.all(sessionQueries);
    sessionSnaps.forEach(snap => {
      snap.forEach(doc => {
        const d = doc.data();
        // The meetLink is revealed ONLY when conferenceStatus === 'confirmed'
        const meetLink = d.conferenceStatus === 'confirmed' && d.meetLink ? d.meetLink : null;

        sessionsMap.set(doc.id, {
          id: doc.id,
          requestId: d.requestId || '',
          mentorId: d.mentorId || '',
          mentorName: d.mentorName || 'Mentor',
          mentorEmail: d.mentorEmail || '',
          studentId: d.studentId || d.memberId || userId,
          studentName: d.studentName || d.memberName || 'Student',
          studentEmail: d.studentEmail || d.memberEmail || '',
          topic: d.topic || 'Mentorship Session',
          startAtUTC: d.startAtUTC || '',
          durationMin: d.durationMin || 45,
          status: d.status || 'scheduled',
          googleEventId: d.googleEventId || null,
          meetLink,
          conferenceStatus: d.conferenceStatus || 'pending',
          syncStatus: d.syncStatus || 'pending',
          syncError: d.syncError || null,
          cancelReason: d.cancelReason || '',
          rescheduleReason: d.rescheduleReason || '',
          history: d.history || [],
          createdAt: d.createdAt || '',
          updatedAt: d.updatedAt || '',
        });
      });
    });

    const allRequests = Array.from(requestsMap.values());
    const allSessions = Array.from(sessionsMap.values());

    // Filter into 3 distinct tabs:
    // Tab 1: Requests (in review or awaiting scheduling)
    const requestsTab = allRequests
      .filter(r => r.status === 'pending' || r.status === 'accepted_awaiting_scheduling')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Tab 2: Upcoming (confirmed scheduled sessions)
    const upcomingTab = allSessions
      .filter(s => s.status === 'scheduled')
      .sort((a, b) => new Date(a.startAtUTC).getTime() - new Date(b.startAtUTC).getTime());

    // Tab 3: History (completed sessions, cancelled sessions, declined requests, cancelled requests)
    const completedOrCancelledSessions = allSessions.filter(
      s => s.status === 'completed' || s.status === 'cancelled'
    );
    const declinedOrCancelledRequests = allRequests.filter(
      r => (r.status === 'declined' || r.status === 'cancelled') && (!r.sessionId || !sessionsMap.has(r.sessionId))
    );

    const historyTab = [
      ...completedOrCancelledSessions.map(s => ({
        ...s,
        itemType: 'session' as const,
        recordDate: s.startAtUTC || s.updatedAt || s.createdAt,
      })),
      ...declinedOrCancelledRequests.map(r => ({
        ...r,
        itemType: 'request' as const,
        recordDate: r.updatedAt || r.createdAt,
      })),
    ].sort((a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime());

    return NextResponse.json({
      success: true,
      data: {
        requests: requestsTab,
        upcoming: upcomingTab,
        history: historyTab,
        counts: {
          requests: requestsTab.length,
          upcoming: upcomingTab.length,
          history: historyTab.length,
        },
      },
    });
  } catch (error: any) {
    console.error('[GET /api/v1/student/sessions] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
