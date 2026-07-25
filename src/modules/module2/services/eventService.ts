import { adminDb as db } from '@/lib/firebase/admin';
import { PlatformEvent } from '@/modules/module2/types/dashboard';
import { getUpcomingEventsList, getRegisteredEventsByUserId } from '@/modules/module2/data';
import * as admin from 'firebase-admin';

export async function getUpcomingEvents(
  mock = false,
  fail = false
): Promise<PlatformEvent[]> {
  if (fail) {
    throw new Error('Simulated failure in Upcoming Events Service');
  }

  if (db && !mock) {
    try {
      const snapshot = await db.collection('events')
        .where('date', '>=', new Date().toISOString())
        .orderBy('date', 'asc')
        .limit(10)
        .get();
      
      const events: PlatformEvent[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        events.push({
          id: doc.id,
          title: data.title || '',
          date: data.date || '',
          location: data.location || '',
          description: data.description || '',
        });
      });
      return events;
    } catch (error) {
      console.error('Error fetching upcoming events from Firestore:', error);
      return [];
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

  if (db && !mock) {
    try {
      const snapshot = await db.collection('eventRegistrations')
        .where('userId', '==', userId)
        .get();

      if (snapshot.empty) {
        return [];
      }

      const registrations = snapshot.docs.map(doc => doc.data());
      const eventIdToRegAt = new Map<string, string>();
      for (const reg of registrations) {
        if (reg.eventId) {
          eventIdToRegAt.set(reg.eventId, reg.registeredAt || '');
        }
      }

      const eventIds = Array.from(eventIdToRegAt.keys()).slice(0, 30); // Cap at Firestore 'in' limit of 30
      if (eventIds.length === 0) {
        return [];
      }

      const eventsSnapshot = await db.collection('events')
        .where(admin.firestore.FieldPath.documentId(), 'in', eventIds)
        .get();

      const events: PlatformEvent[] = [];
      eventsSnapshot.forEach(doc => {
        const eventData = doc.data();
        events.push({
          id: doc.id,
          title: eventData.title || '',
          date: eventData.date || '',
          location: eventData.location || '',
          description: eventData.description || '',
          registeredAt: eventIdToRegAt.get(doc.id) || '',
        });
      });

      return events;
    } catch (error) {
      console.error('Error fetching registered events from Firestore:', error);
      return [];
    }
  }

  // Fallback / Mock data from Data Layer
  return getRegisteredEventsByUserId(userId);
}
