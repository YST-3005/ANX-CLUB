import { adminDb, logFirestoreFallback } from '@/lib/firebase/admin';
const db = adminDb;
import { MentorBooking } from '@/modules/module2/types/dashboard';
import { getBookingsByUserId } from '@/modules/module2/data';

export async function getMentorBookings(
  userId: string,
  mock = false,
  fail = false
): Promise<MentorBooking[]> {
  if (fail) {
    throw new Error('Simulated failure in Mentor Booking Service');
  }

  if (mock) {
    return getBookingsByUserId(userId);
  }

  if (db) {
    try {
      const bookings: MentorBooking[] = [];
      const sessionIds = new Set<string>();

      // 1. First priority: Real scheduled mentoring sessions from 'mentoringSessions'
      const sessionsQueries = [
        db.collection('mentoringSessions').where('studentId', '==', userId).get(),
        db.collection('mentoringSessions').where('memberId', '==', userId).get(),
      ];

      const sessionSnapshots = await Promise.all(sessionsQueries);
      for (const snap of sessionSnapshots) {
        snap.forEach(doc => {
          if (sessionIds.has(doc.id)) return;
          sessionIds.add(doc.id);

          const data = doc.data();
          // Meet link is valid ONLY when conferenceStatus is confirmed
          const confirmedMeetLink = data.conferenceStatus === 'confirmed' && data.meetLink ? data.meetLink : '';

          bookings.push({
            id: doc.id,
            mentorName: data.mentorName || 'Mentor',
            dateTime: data.startAtUTC || '',
            topic: data.topic || 'Mentorship Session',
            status: data.status || 'scheduled',
            meetingLink: confirmedMeetLink,
            conferenceStatus: data.conferenceStatus || 'pending',
            syncStatus: data.syncStatus || 'pending',
            durationMin: data.durationMin || 45,
            startAtUTC: data.startAtUTC || '',
            isSession: true,
          } as any);
        });
      }

      // 2. Query mentor requests from 'mentorRequests'
      const requestQueries = [
        db.collection('mentorRequests').where('studentId', '==', userId).get(),
        db.collection('mentorRequests').where('memberId', '==', userId).get(),
      ];

      const requestSnapshots = await Promise.all(requestQueries);
      for (const snap of requestSnapshots) {
        snap.forEach(doc => {
          const data = doc.data();
          // If this request already generated a session we listed above, skip
          if (data.sessionId && sessionIds.has(data.sessionId)) {
            return;
          }

          const dateTimeStr = data.preferredDate
            ? `${data.preferredDate} ${data.preferredTime || ''}`.trim()
            : (data.createdAt || '');

          bookings.push({
            id: doc.id,
            mentorName: data.mentorName || 'Mentor',
            dateTime: dateTimeStr,
            topic: data.topic || data.reason || 'Mentorship Request',
            status: data.status || 'pending',
            meetingLink: '', // Requests never have confirmed meet links until scheduled
            preferredDate: data.preferredDate || '',
            preferredTime: data.preferredTime || '',
            declineReason: data.declineReason || '',
            isRequest: true,
          } as any);
        });
      }

      // Sort by date / start time
      bookings.sort((a: any, b: any) => {
        const timeA = new Date(a.dateTime || a.startAtUTC || 0).getTime();
        const timeB = new Date(b.dateTime || b.startAtUTC || 0).getTime();
        return timeB - timeA;
      });

      return bookings;
    } catch (error) {
      logFirestoreFallback('Mentor bookings service', error);
      return [];
    }
  }

  return [];
}
