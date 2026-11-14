import { PlatformEvent } from '@/modules/module2/types/dashboard';
import { getUpcomingEventsList, getRegisteredEventsByUserId } from '@/modules/module2/data';
import { eventsRepository } from '@/lib/turso/repositories/eventsRepository';

export async function getUpcomingEvents(
  mock = false,
  fail = false
): Promise<PlatformEvent[]> {
  if (fail) {
    throw new Error('Simulated failure in Upcoming Events Service');
  }

  if (!mock) {
    try {
      await eventsRepository.seedDefaultEventsIfEmpty().catch(() => {});
      const events = await eventsRepository.listUpcoming(10);
      if (events.length > 0) {
        return events.map((e) => ({
          id: e.id,
          title: e.title,
          date: e.date,
          location: e.venue || (e.is_online ? 'Online Live Stream' : 'Campus Hall A'),
          description: e.description || '',
        }));
      }
    } catch (err) {
      console.warn('[eventService] Turso upcoming events fallback:', err);
    }
  }

  // Fallback / Mock data from Data Layer
  return getUpcomingEventsList();
}

export async function getRegisteredEvents(
  userId: string,
  mock = false,
  fail = false
): Promise<PlatformEvent[]> {
  if (fail) {
    throw new Error('Simulated failure in Registered Events Service');
  }

  if (!mock) {
    try {
      const registrations = await eventsRepository.getUserRegistrations(userId);
      if (registrations.length > 0) {
        return registrations.map((r) => ({
          id: r.event_id,
          title: r.event_title || 'Registered Event',
          date: r.event_date || '',
          location: r.event_venue || (r.is_online ? 'Online' : 'Campus'),
          description: '',
          registeredAt: new Date(r.created_at).toISOString(),
        }));
      }
    } catch (err) {
      console.warn('[eventService] Turso registered events fallback:', err);
    }
  }

  // Fallback / Mock data from Data Layer
  return getRegisteredEventsByUserId(userId);
}
