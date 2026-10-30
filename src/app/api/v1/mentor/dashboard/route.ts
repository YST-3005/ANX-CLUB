import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireMentorAuth } from '@/lib/mentoring-auth';
import { MentorRequest, MentoringSession, MentorProfile } from '@/types/mentoring';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireMentorAuth(request);
    if (authResult.error) return authResult.error;

    const { user, mentorDocId } = authResult;
    const userId = user.uid;
    const userEmail = user.email;

    // 1. Fetch or initialize mentor profile
    let mentorProfile: MentorProfile;
    const mentorDocSnap = await adminDb.collection('mentors').doc(mentorDocId).get();
    
    if (mentorDocSnap.exists) {
      const d = mentorDocSnap.data() || {};
      mentorProfile = {
        id: mentorDocSnap.id,
        uid: d.uid || userId,
        name: d.name || user.fullName,
        role: d.role || 'Technical Mentor',
        company: d.company || 'Industry Partner',
        bio: d.bio || 'Experienced engineer mentoring student builders.',
        skills: Array.isArray(d.skills) ? d.skills : ['Full-Stack', 'System Design'],
        topics: Array.isArray(d.topics) ? d.topics : ['Code Review', 'Career Prep'],
        hourlyRate: Number(d.hourlyRate ?? d.rate ?? 0),
        rating: Number(d.rating ?? 5.0),
        totalReviews: Number(d.totalReviews ?? 0),
        sessionsCompleted: Number(d.sessionsCompleted ?? 0),
        timezone: d.timezone || 'UTC',
        availableDays: d.availableDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        availableHours: d.availableHours || { start: '09:00', end: '18:00' },
        googleCalendarConnected: Boolean(d.googleCalendarConnected),
        googleCalendarNeedsReconnect: Boolean(d.googleCalendarNeedsReconnect),
        googleCalendarEmail: d.googleCalendarEmail || undefined,
        ownerEmail: d.ownerEmail || userEmail,
      };
    } else {
      mentorProfile = {
        id: mentorDocId,
        uid: userId,
        name: user.fullName,
        role: 'Technical Mentor',
        company: 'Industry Partner',
        bio: 'Experienced engineer mentoring student builders.',
        skills: ['Full-Stack', 'System Design'],
        topics: ['System Architecture', 'Career Prep'],
        hourlyRate: 0,
        rating: 5.0,
        totalReviews: 0,
        sessionsCompleted: 0,
        timezone: 'UTC',
        availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        availableHours: { start: '09:00', end: '18:00' },
        googleCalendarConnected: false,
        googleCalendarNeedsReconnect: false,
        ownerEmail: userEmail,
      };
    }

    // 2. Query mentor's requests strictly assigned to this mentor (enforcing server isolation)
    const requestsMap = new Map<string, MentorRequest>();
    const reqQueries = [
      adminDb.collection('mentorRequests').where('mentorId', '==', userId).get(),
      adminDb.collection('mentorRequests').where('mentorId', '==', mentorDocId).get(),
    ];
    if (userEmail) {
      reqQueries.push(adminDb.collection('mentorRequests').where('mentorEmail', '==', userEmail).get());
    }

    const reqSnaps = await Promise.all(reqQueries);
    reqSnaps.forEach(snap => {
      snap.forEach(doc => {
        const d = doc.data();
        requestsMap.set(doc.id, {
          id: doc.id,
          studentId: d.studentId || d.memberId || d.userId || '',
          studentName: d.studentName || d.memberName || 'Student Member',
          studentEmail: d.studentEmail || d.memberEmail || '',
          mentorId: d.mentorId || mentorDocId,
          mentorName: d.mentorName || mentorProfile.name,
          mentorEmail: d.mentorEmail || userEmail,
          topic: d.topic || d.reason || 'Mentorship Request',
          message: d.message || '',
          preferredDate: d.preferredDate || '',
          preferredTime: d.preferredTime || '',
          preferredTimes: d.preferredTimes || [],
          status: d.status || 'pending',
          declineReason: d.declineReason || undefined,
          sessionId: d.sessionId || undefined,
          createdAt: d.createdAt || '',
          updatedAt: d.updatedAt || '',
        });
      });
    });

    // 3. Query mentor's scheduled sessions from 'mentoringSessions'
    const sessionsMap = new Map<string, MentoringSession>();
    const sessionQueries = [
      adminDb.collection('mentoringSessions').where('mentorId', '==', userId).get(),
      adminDb.collection('mentoringSessions').where('mentorId', '==', mentorDocId).get(),
    ];
    if (userEmail) {
      sessionQueries.push(adminDb.collection('mentoringSessions').where('mentorEmail', '==', userEmail).get());
    }

    const sessionSnaps = await Promise.all(sessionQueries);
    sessionSnaps.forEach(snap => {
      snap.forEach(doc => {
        const d = doc.data();
        // Meet link revealed ONLY if conferenceStatus === 'confirmed'
        const meetLink = d.conferenceStatus === 'confirmed' && d.meetLink ? d.meetLink : null;

        sessionsMap.set(doc.id, {
          id: doc.id,
          requestId: d.requestId || '',
          mentorId: d.mentorId || mentorDocId,
          mentorName: d.mentorName || mentorProfile.name,
          mentorEmail: d.mentorEmail || userEmail,
          studentId: d.studentId || d.memberId || '',
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
          cancelReason: d.cancelReason || undefined,
          rescheduleReason: d.rescheduleReason || undefined,
          history: d.history || [],
          createdAt: d.createdAt || '',
          updatedAt: d.updatedAt || '',
        });
      });
    });

    const allRequests = Array.from(requestsMap.values());
    const allSessions = Array.from(sessionsMap.values());

    // Requests queue: pending and accepted_awaiting_scheduling
    const pendingRequests = allRequests.filter(
      r => r.status === 'pending' || r.status === 'accepted_awaiting_scheduling'
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Upcoming sessions: scheduled
    const upcomingSessions = allSessions.filter(
      s => s.status === 'scheduled'
    ).sort((a, b) => new Date(a.startAtUTC).getTime() - new Date(b.startAtUTC).getTime());

    // Completed & Cancelled history
    const completedSessions = allSessions.filter(s => s.status === 'completed');
    const pastSessions = allSessions.filter(s => s.status === 'completed' || s.status === 'cancelled')
      .sort((a, b) => new Date(b.startAtUTC || b.createdAt).getTime() - new Date(a.startAtUTC || a.createdAt).getTime());

    // Unique students count
    const studentIds = new Set<string>();
    allSessions.forEach(s => { if (s.studentId) studentIds.add(s.studentId); });
    allRequests.forEach(r => { if (r.studentId) studentIds.add(r.studentId); });

    // Next upcoming session spotlight (closest to now)
    const now = new Date().getTime();
    const todayNextSession = upcomingSessions.find(s => new Date(s.startAtUTC).getTime() >= now - 3600000) || upcomingSessions[0] || null;

    const stats = {
      pendingRequestsCount: pendingRequests.length,
      upcomingSessionsCount: upcomingSessions.length,
      completedSessionsCount: completedSessions.length,
      totalStudentsCount: studentIds.size,
      rating: mentorProfile.rating,
      hourlyRate: mentorProfile.hourlyRate,
    };

    return NextResponse.json({
      success: true,
      data: {
        mentorProfile,
        stats,
        todayNextSession,
        requests: pendingRequests,
        upcomingSessions,
        historySessions: pastSessions,
      },
    });
  } catch (error: any) {
    console.error('[GET /api/v1/mentor/dashboard] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
