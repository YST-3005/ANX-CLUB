import { MentorBooking } from '@/modules/module2/types/dashboard';
import { getBookingsByUserId } from '@/modules/module2/data';
import { sessionsRepository } from '@/lib/turso/repositories/sessionsRepository';

export async function getMentorBookings(
  userId: string,
  mock = false,
  fail = false
): Promise<MentorBooking[]> {
  if (fail) {
    throw new Error('Simulated failure in Mentor Booking Service');
  }

  if (!mock) {
    try {
      const sessions = await sessionsRepository.listByStudent(userId);
      if (sessions.length > 0) {
        return sessions.map((s) => ({
          id: s.id,
          mentorName: s.mentor_name || 'Mentor',
          dateTime: `${s.scheduled_date} ${s.start_time}`,
          topic: s.topic,
          status: s.status,
        }));
      }
    } catch (err) {
      console.warn('[bookingService] Turso sessions query fallback:', err);
    }
  }

  // Fallback / Mock data from Data Layer
  return getBookingsByUserId(userId);
}
