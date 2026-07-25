import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/modules/module2/services/userService';
import { getMembership } from '@/modules/module2/services/membershipService';
import { getUpcomingEvents, getRegisteredEvents } from '@/modules/module2/services/eventService';
import { getMentorBookings } from '@/modules/module2/services/bookingService';
import { getAnnouncements } from '@/modules/module2/services/announcementService';
import { getProjects } from '@/modules/module2/services/projectService';
import { DashboardResponse } from '@/modules/module2/types/dashboard';
import { getRecommendationsByUserId, getUserByIdOrEmail } from '@/modules/module2/data';
import { adminDb as db } from '@/lib/firebase/admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mock = searchParams.get('mock') === 'true';
    const failParam = searchParams.get('fail') || '';
    const failList = failParam.split(',').map(s => s.trim().toLowerCase());

    // Security Gate: In production/Firestore mode, reject insecure query param inputs.
    // We require the x-user-id header (which would be provided by a verified gateway/middleware).
    let userId = '';
    if (db && !mock) {
      userId = req.headers.get('x-user-id') || '';
      if (!userId) {
        return NextResponse.json(
          { error: 'Unauthorized: Missing x-user-id header' },
          { status: 401 }
        );
      }
    } else {
      userId = searchParams.get('userId') || req.headers.get('x-user-id') || 'default_user_123';
    }

    // Identity Resolution: Resolve email address to the unique UID if email is passed.
    let resolvedUid = userId;
    if (resolvedUid.includes('@')) {
      if (db && !mock) {
        try {
          const userQuery = await db.collection('users')
            .where('email', '==', resolvedUid.trim().toLowerCase())
            .limit(1)
            .get();
          if (!userQuery.empty) {
            resolvedUid = userQuery.docs[0].id;
          }
        } catch (err) {
          console.error('Error resolving email to UID in Firestore:', err);
        }
      } else {
        const record = getUserByIdOrEmail(resolvedUid);
        if (record) {
          resolvedUid = record.id;
        }
      }
    }

    const trace: {
      service: string;
      status: 'fulfilled' | 'rejected';
      durationMs: number;
      error?: string;
    }[] = [];

    const instrument = async <T>(
      serviceName: string,
      promiseCall: Promise<T>
    ): Promise<T> => {
      const start = performance.now();
      try {
        const val = await promiseCall;
        const end = performance.now();
        trace.push({
          service: serviceName,
          status: 'fulfilled',
          durationMs: parseFloat((end - start).toFixed(2))
        });
        return val;
      } catch (err: unknown) {
        const end = performance.now();
        const errMsg = err instanceof Error ? err.message : String(err);
        trace.push({
          service: serviceName,
          status: 'rejected',
          durationMs: parseFloat((end - start).toFixed(2)),
          error: errMsg
        });
        throw err;
      }
    };

    // Named promises to prevent brittle array index mapping
    const userPromise = instrument('userService', getUser(resolvedUid, mock, failList.includes('user') || failList.includes('users')));
    const membershipPromise = instrument('membershipService', getMembership(resolvedUid, mock, failList.includes('membership') || failList.includes('memberships')));
    const upcomingEventsPromise = instrument('upcomingEventsService', getUpcomingEvents(mock, failList.includes('upcomingevents') || failList.includes('events')));
    const registeredEventsPromise = instrument('registeredEventsService', getRegisteredEvents(resolvedUid, mock, failList.includes('registeredevents') || failList.includes('events')));
    const mentorBookingsPromise = instrument('mentorBookingsService', getMentorBookings(resolvedUid, mock, failList.includes('mentorbookings') || failList.includes('bookings')));
    const announcementsPromise = instrument('announcementService', getAnnouncements(resolvedUid, mock, failList.includes('announcements')));
    const projectsPromise = instrument('projectService', getProjects(resolvedUid, mock, failList.includes('projects')));

    const [
      userRes,
      membershipRes,
      upcomingEventsRes,
      registeredEventsRes,
      mentorBookingsRes,
      announcementsRes,
      projectsRes
    ] = await Promise.allSettled([
      userPromise,
      membershipPromise,
      upcomingEventsPromise,
      registeredEventsPromise,
      mentorBookingsPromise,
      announcementsPromise,
      projectsPromise
    ]);

    const getObjectValue = <T>(res: PromiseSettledResult<unknown>): T => {
      if (res.status === 'fulfilled' && res.value && typeof res.value === 'object' && !Array.isArray(res.value)) {
        return res.value as T;
      }
      return {} as T;
    };

    const getArrayValue = <T>(res: PromiseSettledResult<unknown>): T[] => {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        return res.value as T[];
      }
      return [];
    };

    // Construct response matching strict contract
    const response: DashboardResponse = {
      user: getObjectValue(userRes),
      membership: getObjectValue(membershipRes),
      upcomingEvents: getArrayValue(upcomingEventsRes),
      registeredEvents: getArrayValue(registeredEventsRes),
      mentorBookings: getArrayValue(mentorBookingsRes),
      announcements: getArrayValue(announcementsRes),
      recommendations: getRecommendationsByUserId(resolvedUid),
      projects: getArrayValue(projectsRes),
      meta: {
        version: 'v1',
        timestamp: new Date().toISOString(),
        trace
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Fatal aggregator API error:', error);
    return NextResponse.json({
      user: {},
      membership: {},
      upcomingEvents: [],
      registeredEvents: [],
      mentorBookings: [],
      announcements: [],
      recommendations: [],
      projects: [],
      meta: {
        version: 'v1',
        timestamp: new Date().toISOString(),
        trace: []
      }
    });
  }
}
export const dynamic = 'force-dynamic';
