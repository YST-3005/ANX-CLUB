import { db } from '@/lib/turso/client';

export interface EventRow {
  id: string;
  title: string;
  description?: string | null;
  date: string;
  time?: string | null;
  duration_minutes: number;
  venue?: string | null;
  is_online: number;
  meeting_link?: string | null;
  category: string;
  event_type: string;
  price: number;
  premium_price: number;
  capacity: number;
  seats_booked: number;
  registration_deadline?: string | null;
  poster_url?: string | null;
  speaker?: string | null;
  speaker_bio?: string | null;
  speaker_image?: string | null;
  status: string;
  is_published: number;
  is_active: number;
  cancellation_reason?: string | null;
  college_id?: string | null;
  college_name?: string | null;
  organizer_id: string;
  version: number;
  created_at: number;
  updated_at: number;
}

export interface EventRegistrationRow {
  id: string;
  event_id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string | null;
  college?: string | null;
  team_name?: string | null;
  team_members?: string | null;
  payment_status: string;
  payment_id?: string | null;
  order_id?: string | null;
  amount: number;
  ticket_id?: string | null;
  status: string;
  version: number;
  created_at: number;
  updated_at: number;

  // Joined event details
  event_title?: string;
  event_date?: string;
  event_time?: string;
  event_venue?: string;
  is_online?: number;
  meeting_link?: string;
}

export const eventsRepository = {
  async listUpcoming(limit = 20): Promise<EventRow[]> {
    const today = new Date().toISOString().split('T')[0];
    const result = await db.execute({
      sql: `
        SELECT * FROM events
        WHERE date >= ? AND is_published = 1 AND is_active = 1 AND status = 'Published'
        ORDER BY date ASC, time ASC
        LIMIT ?
      `,
      args: [today, limit],
    });
    return result.rows as unknown as EventRow[];
  },

  async getById(id: string): Promise<EventRow | null> {
    const result = await db.execute({
      sql: `SELECT * FROM events WHERE id = ? LIMIT 1`,
      args: [id],
    });
    return (result.rows[0] as unknown as EventRow) || null;
  },

  async upsert(event: Partial<EventRow> & { id: string; title: string; date: string; category: string }): Promise<EventRow> {
    const now = Date.now();
    await db.execute({
      sql: `
        INSERT INTO events (
          id, title, description, date, time, duration_minutes, venue,
          is_online, meeting_link, category, event_type, price, premium_price,
          capacity, seats_booked, registration_deadline, poster_url, speaker,
          speaker_bio, speaker_image, status, is_published, is_active,
          organizer_id, version, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, 1, ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          description = excluded.description,
          date = excluded.date,
          time = excluded.time,
          venue = excluded.venue,
          is_online = excluded.is_online,
          meeting_link = excluded.meeting_link,
          category = excluded.category,
          event_type = excluded.event_type,
          price = excluded.price,
          premium_price = excluded.premium_price,
          capacity = excluded.capacity,
          poster_url = excluded.poster_url,
          speaker = excluded.speaker,
          speaker_bio = excluded.speaker_bio,
          status = excluded.status,
          is_published = excluded.is_published,
          is_active = excluded.is_active,
          version = events.version + 1,
          updated_at = excluded.updated_at
      `,
      args: [
        event.id,
        event.title,
        event.description || null,
        event.date,
        event.time || null,
        event.duration_minutes || 60,
        event.venue || null,
        event.is_online ? 1 : 0,
        event.meeting_link || null,
        event.category,
        event.event_type || 'free',
        event.price || 0,
        event.premium_price || 0,
        event.capacity || 100,
        event.seats_booked || 0,
        event.registration_deadline || null,
        event.poster_url || null,
        event.speaker || null,
        event.speaker_bio || null,
        event.speaker_image || null,
        event.status || 'Published',
        event.is_published !== undefined ? event.is_published : 1,
        event.is_active !== undefined ? event.is_active : 1,
        event.organizer_id || 'system',
        event.created_at || now,
        now,
      ],
    });

    const saved = await this.getById(event.id);
    return saved!;
  },

  async registerUser(
    dataOrEventId:
      | string
      | {
          eventId: string;
          userId: string;
          name: string;
          email: string;
          phone?: string;
          college?: string;
          teamName?: string;
          teamMembers?: string;
          paymentStatus?: string;
          paymentId?: string;
          orderId?: string;
          amount?: number;
        },
    userIdArg?: string,
    emailArg?: string,
    nameArg?: string
  ): Promise<{ registrationId: string; ticketId: string; status?: string }> {
    const data =
      typeof dataOrEventId === 'string'
        ? {
            eventId: dataOrEventId,
            userId: userIdArg!,
            email: emailArg!,
            name: nameArg || 'User',
          }
        : dataOrEventId;

    const regId = `${data.eventId}_${data.userId}`;
    const ticketId = `ANX-TCK-${Date.now().toString().slice(-6)}`;
    const now = Date.now();

    const tx = await db.transaction('write');
    try {
      // 0. Check duplicate registration first
      const existing = await tx.execute({
        sql: `SELECT id FROM event_registrations WHERE event_id = ? AND user_id = ? LIMIT 1`,
        args: [data.eventId, data.userId],
      });
      if (existing.rows.length > 0) {
        await tx.rollback();
        throw new Error('Already registered for this event.');
      }

      // 1. Check event capacity and increment seats atomically
      const updateResult = await tx.execute({
        sql: `
          UPDATE events
          SET seats_booked = seats_booked + 1,
              version = version + 1,
              updated_at = ?
          WHERE id = ? AND is_active = 1 AND status = 'Published' AND seats_booked < capacity
        `,
        args: [now, data.eventId],
      });

      if (updateResult.rowsAffected === 0) {
        await tx.rollback();
        throw new Error('Event is fully booked, cancelled, or unavailable.');
      }

      // 2. Insert registration with unique constraint
      await tx.execute({
        sql: `
          INSERT INTO event_registrations (
            id, event_id, user_id, name, email, phone, college,
            team_name, team_members, payment_status, payment_id, order_id,
            amount, ticket_id, status, version, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 1, ?, ?)
        `,
        args: [
          regId,
          data.eventId,
          data.userId,
          data.name,
          data.email,
          data.phone || null,
          data.college || null,
          data.teamName || null,
          data.teamMembers || null,
          data.paymentStatus || 'free',
          data.paymentId || null,
          data.orderId || null,
          data.amount || 0,
          ticketId,
          now,
          now,
        ],
      });

      await tx.commit();
      return { registrationId: regId, ticketId, status: 'confirmed' };
    } catch (err: any) {
      await tx.rollback().catch(() => {});
      if (err.message?.includes('UNIQUE')) {
        throw new Error('You are already registered for this event.');
      }
      throw err;
    }
  },

  async getUserRegistrations(userId: string): Promise<EventRegistrationRow[]> {
    const result = await db.execute({
      sql: `
        SELECT 
          r.*,
          e.title AS event_title,
          e.date AS event_date,
          e.time AS event_time,
          e.venue AS event_venue,
          e.is_online AS is_online,
          e.meeting_link AS meeting_link
        FROM event_registrations r
        JOIN events e ON r.event_id = e.id
        WHERE r.user_id = ?
        ORDER BY e.date ASC, e.time ASC
      `,
      args: [userId],
    });
    return result.rows as unknown as EventRegistrationRow[];
  },

  async getEventRegistrations(eventId: string): Promise<EventRegistrationRow[]> {
    const result = await db.execute({
      sql: `SELECT * FROM event_registrations WHERE event_id = ? ORDER BY registered_at DESC`,
      args: [eventId],
    });
    return result.rows as unknown as EventRegistrationRow[];
  },

  async isUserRegistered(eventId: string, userId: string): Promise<boolean> {
    const result = await db.execute({
      sql: `SELECT id FROM event_registrations WHERE event_id = ? AND user_id = ? LIMIT 1`,
      args: [eventId, userId],
    });
    return result.rows.length > 0;
  },

  async seedDefaultEventsIfEmpty(): Promise<void> {
    const countRes = await db.execute(`SELECT COUNT(*) as count FROM events`);
    const count = Number(countRes.rows[0]?.count || 0);
    if (count > 0) return;

    const seedEvents = [
      {
        id: 'evt_system_design_masterclass',
        title: 'High-Scale Distributed Systems Masterclass',
        description: 'Hands-on architectural deep dive with staff engineers covering sharding, distributed consensus (Raft), and edge caching.',
        date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
        time: '06:00 PM - 08:00 PM',
        duration_minutes: 120,
        venue: 'Live Google Meet Stream',
        is_online: 1,
        meeting_link: 'https://meet.google.com/live-stream-anx',
        category: 'workshop',
        event_type: 'free',
        price: 0,
        premium_price: 0,
        capacity: 250,
        seats_booked: 48,
        speaker: 'Sarah Jenkins (Google)',
        speaker_bio: 'Staff SWE at Google, Distributed Infrastructure.',
        status: 'Published',
        is_published: 1,
        is_active: 1,
        organizer_id: 'org_anx',
      },
      {
        id: 'evt_ai_hackathon_2026',
        title: 'ANX Autonomous Agents Hackathon 2026',
        description: 'Build edge-first AI tools and autonomous coding workflows. ₹1,00,000 in prizes and fast-track interviews with hiring partners.',
        date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
        time: '10:00 AM - 06:00 PM',
        duration_minutes: 480,
        venue: 'ANX Innovation Hub & Virtual Hybrid',
        is_online: 1,
        category: 'hackathon',
        event_type: 'free',
        price: 0,
        premium_price: 0,
        capacity: 500,
        seats_booked: 142,
        speaker: 'Aravind Krishnan (Stripe)',
        speaker_bio: 'Principal Architect at Stripe.',
        status: 'Published',
        is_published: 1,
        is_active: 1,
        organizer_id: 'org_anx',
      },
      {
        id: 'evt_faang_interview_prep',
        title: 'Cracking the FAANG Technical Interview: Live Mock',
        description: 'Real-time mock interviews with feedback on algorithmic efficiency, communication, and system design tradeoffs.',
        date: new Date(Date.now() + 86400000 * 12).toISOString().split('T')[0],
        time: '05:00 PM - 07:00 PM',
        duration_minutes: 120,
        venue: 'Virtual Hall A',
        is_online: 1,
        category: 'webinar',
        event_type: 'premium',
        price: 99,
        premium_price: 0,
        capacity: 100,
        seats_booked: 18,
        speaker: 'Priya Sharma (Vercel)',
        speaker_bio: 'Engineering Director at Vercel.',
        status: 'Published',
        is_published: 1,
        is_active: 1,
        organizer_id: 'org_anx',
      },
    ];

    for (const ev of seedEvents) {
      await this.upsert(ev);
    }
  },
};
