import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireStudentAuth } from '@/lib/mentoring-auth';
import { MentoringRequestStatus, MentoringSessionStatus } from '@/types/mentoring';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireStudentAuth(req);
    if (authResult.error) return authResult.error;
    const { user } = authResult;
    const userId = user.uid;

    // 1. Fetch live user profile
    let userData: any = {};
    try {
      const userDoc = await adminDb.collection('users').doc(userId).get();
      if (userDoc.exists) {
        userData = userDoc.data() || {};
      }
    } catch (e) {
      console.warn('[student/dashboard] Could not fetch user doc:', e);
    }
    const xpTotal = userData.xpTotal || 0;
    const leadershipStage = userData.leadershipStage || (xpTotal > 3000 ? 'Legendary' : xpTotal > 2000 ? 'Master' : xpTotal > 1000 ? 'Elite' : xpTotal > 500 ? 'Rising Star' : 'Member');

    // 2. Query registered events
    let registeredEvents: any[] = [];
    try {
      const regSnap = await adminDb.collection('eventRegistrations')
        .where('userId', '==', userId)
        .get();

      if (!regSnap.empty) {
        const eventIds = regSnap.docs.map(doc => doc.data().eventId).filter(Boolean);
        if (eventIds.length > 0) {
          const eventsPromises = eventIds.slice(0, 10).map(eventId =>
            adminDb.collection('events').doc(eventId).get()
          );
          const eventSnaps = await Promise.all(eventsPromises);
          registeredEvents = eventSnaps.filter(s => s.exists).map(s => ({
            id: s.id,
            title: s.data()?.title || 'Event',
            date: s.data()?.date || '',
            location: s.data()?.location || s.data()?.venue || 'Online',
            description: s.data()?.description || '',
          }));
        }
      }
    } catch (e) {
      console.warn('[student/dashboard] Error fetching eventRegistrations:', e);
    }

    // 3. Query all upcoming public events
    let upcomingEvents: any[] = [];
    try {
      const todayISO = new Date().toISOString().split('T')[0];
      const eventsSnap = await adminDb.collection('events')
        .where('date', '>=', todayISO)
        .orderBy('date', 'asc')
        .limit(6)
        .get();

      upcomingEvents = eventsSnap.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title || 'Upcoming Event',
        date: doc.data().date || '',
        location: doc.data().location || doc.data().venue || 'Online',
        description: doc.data().description || '',
        eventType: doc.data().eventType || 'workshop',
      }));
    } catch (e) {
      // Fallback query if composite index is pending
      try {
        const eventsSnap = await adminDb.collection('events').limit(6).get();
        upcomingEvents = eventsSnap.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title || 'Upcoming Event',
          date: doc.data().date || '',
          location: doc.data().location || doc.data().venue || 'Online',
          description: doc.data().description || '',
          eventType: doc.data().eventType || 'workshop',
        }));
      } catch (err) {}
    }

    // 4. Query Announcements
    let announcements: any[] = [];
    try {
      const annSnap = await adminDb.collection('announcements')
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();
      announcements = annSnap.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title || '',
        content: doc.data().content || '',
        createdAt: doc.data().createdAt || '',
        category: doc.data().category || 'General',
      }));
    } catch (e) {
      try {
        const annSnap = await adminDb.collection('announcements').limit(5).get();
        announcements = annSnap.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title || '',
          content: doc.data().content || '',
          createdAt: doc.data().createdAt || '',
          category: doc.data().category || 'General',
        }));
      } catch (err) {}
    }

    // 5. Query Mentoring Requests (Student scoped)
    const requestsMap = new Map<string, any>();
    try {
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
            mentorId: d.mentorId || '',
            mentorName: d.mentorName || 'Mentor',
            topic: d.topic || d.reason || 'Mentorship Request',
            message: d.message || '',
            preferredDate: d.preferredDate || '',
            preferredTime: d.preferredTime || '',
            status: d.status || 'pending',
            declineReason: d.declineReason || '',
            sessionId: d.sessionId || null,
            createdAt: d.createdAt || '',
          });
        });
      });
    } catch (e) {
      console.warn('[student/dashboard] Error fetching requests:', e);
    }
    const studentRequests = Array.from(requestsMap.values());

    // 6. Query Mentoring Sessions (Single source of truth for scheduled meetings)
    const sessionsMap = new Map<string, any>();
    try {
      const sessionQueries = [
        adminDb.collection('mentoringSessions').where('studentId', '==', userId).get(),
        adminDb.collection('mentoringSessions').where('memberId', '==', userId).get(),
      ];
      const sessSnaps = await Promise.all(sessionQueries);
      sessSnaps.forEach(snap => {
        snap.forEach(doc => {
          const d = doc.data();
          sessionsMap.set(doc.id, {
            id: doc.id,
            requestId: d.requestId || '',
            mentorId: d.mentorId || '',
            mentorName: d.mentorName || 'Mentor',
            mentorEmail: d.mentorEmail || '',
            topic: d.topic || 'Mentorship Session',
            startAtUTC: d.startAtUTC || '',
            durationMin: d.durationMin || 45,
            status: d.status || 'scheduled',
            googleEventId: d.googleEventId || null,
            meetLink: d.conferenceStatus === 'confirmed' && d.meetLink ? d.meetLink : null,
            conferenceStatus: d.conferenceStatus || 'pending',
            syncStatus: d.syncStatus || 'pending',
            syncError: d.syncError || null,
            cancelReason: d.cancelReason || '',
            createdAt: d.createdAt || '',
          });
        });
      });
    } catch (e) {
      console.warn('[student/dashboard] Error fetching sessions:', e);
    }
    const studentSessions = Array.from(sessionsMap.values());

    // 7. Projects / Ideas submitted
    let projectsCount = 0;
    try {
      const ideasSnap = await adminDb.collection('ideas').where('submitterId', '==', userId).get();
      const projSnap = await adminDb.collection('projects').where('members', 'array-contains', userId).get();
      projectsCount = ideasSnap.size + projSnap.size;
    } catch (e) {}

    // 8. Community posts count
    let communityPostsCount = 0;
    try {
      const commSnap = await adminDb.collection('communityTopics').where('authorId', '==', userId).get();
      communityPostsCount = commSnap.size;
    } catch (e) {}

    // 9. Recent Activity Feed (xpLedger + requests + sessions)
    const activityList: any[] = [];
    try {
      const xpSnap = await adminDb.collection('xpLedger')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(8)
        .get();

      xpSnap.forEach(doc => {
        const d = doc.data();
        activityList.push({
          id: doc.id,
          source: 'xp',
          actionType: d.actionType || 'xp',
          title: d.reason || 'XP Earned',
          xpValue: d.xpValue || 0,
          timestamp: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt || new Date().toISOString(),
        });
      });
    } catch (e) {}

    // Include recent session/request updates in activity
    studentRequests.slice(0, 3).forEach(r => {
      activityList.push({
        id: `req_${r.id}`,
        source: 'request',
        actionType: 'mentor',
        title: `Requested mentoring on "${r.topic}" (${r.status})`,
        xpValue: 0,
        timestamp: r.createdAt || new Date().toISOString(),
      });
    });

    studentSessions.slice(0, 3).forEach(s => {
      activityList.push({
        id: `sess_${s.id}`,
        source: 'session',
        actionType: 'mentor',
        title: `Session with ${s.mentorName}: ${s.status}`,
        xpValue: s.status === 'completed' ? 75 : 0,
        timestamp: s.startAtUTC || s.createdAt || new Date().toISOString(),
      });
    });

    // Sort combined activity descending
    activityList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // 10. Learning progress
    let learningProgress = null;
    try {
      const roadSnap = await adminDb.collection('roadmapProgress')
        .where('userId', '==', userId)
        .limit(1)
        .get();
      if (!roadSnap.empty) {
        learningProgress = { id: roadSnap.docs[0].id, ...roadSnap.docs[0].data() };
      }
    } catch (e) {}

    // 11. Badges earned
    let earnedBadges: any[] = [];
    try {
      const badgeSnap = await adminDb.collection('userBadges').where('userId', '==', userId).get();
      if (!badgeSnap.empty) {
        earnedBadges = badgeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } else if (Array.isArray(userData.recentBadges) && userData.recentBadges.length > 0) {
        earnedBadges = userData.recentBadges;
      }
    } catch (e) {}

    // 12. Certificates earned
    let earnedCertificates: any[] = [];
    try {
      const certSnaps = await Promise.all([
        adminDb.collection('certificates').where('recipientId', '==', userId).get(),
        adminDb.collection('certificates').where('userId', '==', userId).get(),
      ]);
      const certMap = new Map<string, any>();
      certSnaps.forEach(snap => {
        snap.forEach(doc => {
          const d = doc.data();
          certMap.set(doc.id, {
            id: doc.id,
            title: d.title || d.eventName || 'Certificate of Completion',
            recipientName: d.recipientName || userData.fullName || 'Member',
            issueDate: d.issueDate || d.createdAt || '',
            verificationCode: d.verificationCode || doc.id,
            certificateUrl: d.certificateUrl || d.pdfUrl || null,
          });
        });
      });
      earnedCertificates = Array.from(certMap.values());
    } catch (e) {}

    // Breakdown of mentoring requests by status
    const requestStatusBreakdown = {
      pending: studentRequests.filter(r => r.status === 'pending').length,
      accepted_awaiting_scheduling: studentRequests.filter(r => r.status === 'accepted_awaiting_scheduling').length,
      declined: studentRequests.filter(r => r.status === 'declined').length,
      scheduled: studentRequests.filter(r => r.status === 'scheduled').length,
      cancelled: studentRequests.filter(r => r.status === 'cancelled').length,
    };

    const upcomingSessions = studentSessions
      .filter(s => s.status === 'scheduled')
      .sort((a, b) => new Date(a.startAtUTC).getTime() - new Date(b.startAtUTC).getTime());

    return NextResponse.json({
      success: true,
      data: {
        user: {
          uid: userId,
          fullName: userData.fullName || user.fullName,
          email: userData.email || user.email,
          role: user.role,
          membershipType: userData.membershipType || 'Free',
          xpTotal,
          leadershipStage,
          earnedBadges,
          earnedCertificates,
        },
        stats: {
          eventsRegisteredCount: registeredEvents.length,
          upcomingSessionsCount: upcomingSessions.length,
          mentoringRequestsCount: studentRequests.length,
          requestStatusBreakdown,
          projectsCount,
          communityPostsCount,
          certificatesCount: earnedCertificates.length,
          xpTotal,
          leadershipStage,
        },
        upcomingEvents,
        registeredEvents,
        announcements,
        myMentoring: {
          requests: studentRequests,
          upcomingSessions,
          allSessions: studentSessions,
        },
        recentActivity: activityList.slice(0, 8),
        learningProgress,
      },
    });
  } catch (error: any) {
    console.error('[GET /api/v1/student/dashboard] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
