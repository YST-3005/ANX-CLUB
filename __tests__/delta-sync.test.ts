import { db } from '../src/lib/turso/client';
import { syncRepository } from '../src/lib/turso/repositories/syncRepository';
import { usersRepository } from '../src/lib/turso/repositories/usersRepository';
import { eventsRepository } from '../src/lib/turso/repositories/eventsRepository';
import { requestsRepository } from '../src/lib/turso/repositories/requestsRepository';

describe('Delta Synchronization & Tombstones Engine', () => {
  const ts = Date.now();
  const studentA = `sync_student_a_${ts}`;
  const studentB = `sync_student_b_${ts}`;
  const mentorId = `sync_mentor_${ts}`;
  const eventId = `sync_event_${ts}`;

  beforeAll(async () => {
    await usersRepository.create({ id: studentA, email: `a_${ts}@anx.com`, full_name: 'Student A' });
    await usersRepository.create({ id: studentB, email: `b_${ts}@anx.com`, full_name: 'Student B' });

    await db.execute({
      sql: `INSERT INTO mentors (id, user_id, full_name, email, title, company, bio, skills_json, created_at, updated_at)
            VALUES (?, ?, 'Sync Mentor', 'mentor@anx.com', 'Edge Dev', 'Turso', 'Bio', '[]', ?, ?)`,
      args: [mentorId, studentA, ts, ts],
    });

    await eventsRepository.upsert({
      id: eventId,
      title: 'Delta Sync Deep Dive',
      description: 'Understanding cursor sync',
      date: String(ts + 50000),
      category: 'Tech Talk',
      capacity: 50,
      seats_booked: 0,
      venue: 'Online',
      price: 0,
      is_published: 1,
      is_active: 1,
    });
  });

  afterAll(async () => {
    try {
      await db.execute({ sql: `DELETE FROM events WHERE id = ?`, args: [eventId] });
      await db.execute({ sql: `DELETE FROM mentors WHERE id = ?`, args: [mentorId] });
      await db.execute({ sql: `DELETE FROM users WHERE id IN (?, ?)`, args: [studentA, studentB] });
      await db.execute({ sql: `DELETE FROM sync_tombstones WHERE entity_id = ?`, args: [eventId] });
    } catch (e) {
      // ignore
    }
  });

  it('fetches delta updates created since a given cursor timestamp', async () => {
    const delta = await syncRepository.getDelta(0, studentA);
    expect(delta.cursor).toBeGreaterThan(0);
    expect(Array.isArray(delta.events)).toBe(true);

    const foundEvent = delta.events.find(e => e.id === eventId);
    expect(foundEvent).toBeDefined();
    expect(foundEvent?.title).toBe('Delta Sync Deep Dive');
  });

  it('enforces tenant data isolation during delta synchronization', async () => {
    // Student A creates a request
    const reqA = await requestsRepository.create({
      student_id: studentA,
      mentor_id: mentorId,
      student_name: 'Student A',
      student_email: `a_${ts}@anx.com`,
      topic: 'Private Guidance for Student A',
      message: 'Confidential topic',
    });

    // Student B requests sync
    const deltaB = await syncRepository.getDelta(0, studentB);
    const hasReqA = deltaB.mentor_requests.some(r => r.id === reqA.id);
    expect(hasReqA).toBe(false); // Student B MUST NOT see Student A's request

    // Student A requests sync
    const deltaA = await syncRepository.getDelta(0, studentA);
    const foundReqA = deltaA.mentor_requests.find(r => r.id === reqA.id);
    expect(foundReqA).toBeDefined();
    expect(foundReqA?.topic).toBe('Private Guidance for Student A');

    // Cleanup
    await db.execute({ sql: `DELETE FROM mentor_requests WHERE id = ?`, args: [reqA.id] });
  });

  it('records and returns tombstones when entities are deleted', async () => {
    const deletionTime = Date.now();
    await db.execute({
      sql: `INSERT INTO sync_tombstones (entity_type, entity_id, deleted_at) VALUES (?, ?, ?)`,
      args: ['events', eventId, deletionTime],
    });

    const delta = await syncRepository.getDelta(deletionTime - 1000, studentA);
    expect(delta.tombstones.length).toBeGreaterThan(0);

    const tomb = delta.tombstones.find(t => t.entity_id === eventId);
    expect(tomb).toBeDefined();
    expect(tomb?.entity_type).toBe('events');
  });
});
