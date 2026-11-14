import { db } from '@/lib/turso/client';

export interface DeltaSyncResult {
  server_timestamp: number;
  cursor: number;
  has_more: boolean;
  events: any[];
  registrations: any[];
  mentor_requests: any[];
  mentoring_sessions: any[];
  tombstones: { entity_type: string; entity_id: string; deleted_at: number }[];
  changes: {
    events: any[];
    registrations: any[];
    mentor_requests: any[];
    mentoring_sessions: any[];
    tombstones: { entity_type: string; entity_id: string; deleted_at: number }[];
  };
}

export const syncRepository = {
  async getDelta(lastUpdatedAt: number, userId: string, limit = 250): Promise<DeltaSyncResult> {
    const serverTimestamp = Date.now();
    const safeLimit = Math.min(Math.max(limit, 1), 500);

    // 1. Fetch updated events
    const eventsQuery = await db.execute({
      sql: `SELECT * FROM events WHERE updated_at > ? ORDER BY updated_at ASC LIMIT ?`,
      args: [lastUpdatedAt, safeLimit],
    });

    // 2. Fetch updated registrations for this specific user (strict tenant isolation)
    const regQuery = await db.execute({
      sql: `SELECT * FROM event_registrations WHERE user_id = ? AND updated_at > ? ORDER BY updated_at ASC LIMIT ?`,
      args: [userId, lastUpdatedAt, safeLimit],
    });

    // 3. Fetch updated mentor requests for this user (as student or mentor)
    const requestsQuery = await db.execute({
      sql: `
        SELECT r.*, m.full_name AS mentor_name, u.full_name AS student_name
        FROM mentor_requests r
        JOIN mentors m ON r.mentor_id = m.id
        JOIN users u ON r.student_id = u.id
        WHERE (r.student_id = ? OR m.user_id = ?) AND r.updated_at > ?
        ORDER BY r.updated_at ASC
        LIMIT ?
      `,
      args: [userId, userId, lastUpdatedAt, safeLimit],
    });

    // 4. Fetch updated mentoring sessions for this user (as student or mentor)
    const sessionsQuery = await db.execute({
      sql: `
        SELECT s.*, m.full_name AS mentor_name, u.full_name AS student_name
        FROM mentoring_sessions s
        JOIN mentors m ON s.mentor_id = m.id
        JOIN users u ON s.student_id = u.id
        WHERE (s.student_id = ? OR m.user_id = ?) AND s.updated_at > ?
        ORDER BY s.updated_at ASC
        LIMIT ?
      `,
      args: [userId, userId, lastUpdatedAt, safeLimit],
    });

    // 5. Fetch tombstones
    const tombstonesQuery = await db.execute({
      sql: `SELECT entity_type, entity_id, deleted_at FROM sync_tombstones WHERE deleted_at > ? ORDER BY deleted_at ASC LIMIT ?`,
      args: [lastUpdatedAt, safeLimit],
    });

    const hasMore =
      eventsQuery.rows.length === safeLimit ||
      regQuery.rows.length === safeLimit ||
      requestsQuery.rows.length === safeLimit ||
      sessionsQuery.rows.length === safeLimit;

    const tombstones = tombstonesQuery.rows as unknown as { entity_type: string; entity_id: string; deleted_at: number }[];
    const events = eventsQuery.rows as any[];
    const registrations = regQuery.rows as any[];
    const mentor_requests = requestsQuery.rows as any[];
    const mentoring_sessions = sessionsQuery.rows as any[];

    return {
      server_timestamp: serverTimestamp,
      cursor: serverTimestamp,
      has_more: hasMore,
      events,
      registrations,
      mentor_requests,
      mentoring_sessions,
      tombstones,
      changes: {
        events,
        registrations,
        mentor_requests,
        mentoring_sessions,
        tombstones,
      },
    } as any;
  },

  async recordTombstone(entityType: string, entityId: string): Promise<void> {
    const now = Date.now();
    await db.execute({
      sql: `INSERT INTO sync_tombstones (entity_type, entity_id, deleted_at) VALUES (?, ?, ?)`,
      args: [entityType, entityId, now],
    });
  },
};
