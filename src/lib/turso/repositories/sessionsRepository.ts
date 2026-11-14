import { db } from '@/lib/turso/client';
import { usersRepository } from './usersRepository';

export type MentoringSessionStatus =
  | 'pending_conference'
  | 'confirmed'
  | 'rescheduled'
  | 'cancelled'
  | 'completed';

export interface MentoringSessionRow {
  id: string;
  request_id: string;
  student_id: string;
  mentor_id: string;
  topic: string;
  description?: string | null;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  time_zone: string;
  status: MentoringSessionStatus;
  calendar_event_id?: string | null;
  meeting_link?: string | null;
  cancellation_reason?: string | null;
  cancelled_by?: string | null;
  version: number;
  created_at: number;
  updated_at: number;

  // Joined details
  student_name?: string;
  student_email?: string;
  student_avatar?: string;
  mentor_name?: string;
  mentor_email?: string;
  mentor_title?: string;
  mentor_company?: string;
  mentor_avatar?: string;
}

export interface SessionHistoryRow {
  id: string;
  session_id: string;
  action: string;
  performed_by: string;
  details_json: string;
  reason?: string;
  created_at: number;
}

export const sessionsRepository = {
  async schedule(data: any): Promise<MentoringSessionRow> {
    return this.create(data);
  },

  async create(data: {
    request_id: string;
    student_id: string;
    mentor_id: string;
    topic: string;
    description?: string;
    scheduled_date: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    time_zone?: string;
    status?: MentoringSessionStatus;
    calendar_event_id?: string;
    meeting_link?: string;
    performed_by: string;
  }): Promise<MentoringSessionRow> {
    const now = Date.now();
    const id = `ses_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const tx = await db.transaction('write');
    try {
      // 1. Ensure request hasn't already been scheduled
      const existing = await tx.execute({
        sql: `SELECT id FROM mentoring_sessions WHERE request_id = ? LIMIT 1`,
        args: [data.request_id],
      });

      if (existing.rows.length > 0) {
        await tx.rollback();
        throw new Error('A session has already been scheduled for this request.');
      }

      // 2. Insert session
      await tx.execute({
        sql: `
          INSERT INTO mentoring_sessions (
            id, request_id, student_id, mentor_id, topic, description,
            scheduled_date, start_time, end_time, duration_minutes, time_zone,
            status, calendar_event_id, meeting_link, version,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        `,
        args: [
          id,
          data.request_id,
          data.student_id,
          data.mentor_id,
          data.topic,
          data.description || null,
          data.scheduled_date,
          data.start_time,
          data.end_time,
          data.duration_minutes,
          data.time_zone || 'Asia/Kolkata',
          data.status || 'confirmed',
          data.calendar_event_id || null,
          data.meeting_link || null,
          now,
          now,
        ],
      });

      // 3. Insert initial history entry
      const histId = `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await tx.execute({
        sql: `
          INSERT INTO mentoring_session_history (
            id, session_id, action, performed_by, details_json, created_at
          ) VALUES (?, ?, 'scheduled', ?, ?, ?)
        `,
        args: [
          histId,
          id,
          data.performed_by,
          JSON.stringify({
            scheduled_date: data.scheduled_date,
            start_time: data.start_time,
            end_time: data.end_time,
            duration_minutes: data.duration_minutes,
            calendar_event_id: data.calendar_event_id || null,
            meeting_link: data.meeting_link || null,
          }),
          now,
        ],
      });

      // Also mirror to legacy mentor_bookings table for backward compatibility
      const legacyId = `mb_${id}`;
      const mentorRes = await tx.execute({
        sql: `SELECT full_name FROM mentors WHERE id = ? LIMIT 1`,
        args: [data.mentor_id],
      });
      const userRes = await tx.execute({
        sql: `SELECT full_name, email FROM users WHERE id = ? LIMIT 1`,
        args: [data.student_id],
      });
      const mentorName = String(mentorRes.rows[0]?.full_name || 'Mentor');
      const studentName = String(userRes.rows[0]?.full_name || 'Student');
      const studentEmail = String(userRes.rows[0]?.email || 'student@example.com');

      await tx.execute({
        sql: `
          INSERT OR REPLACE INTO mentor_bookings (
            id, mentor_id, mentor_name, member_id, member_name, member_email,
            topic, scheduled_date, scheduled_time, meeting_link, status,
            version, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Approved', 1, ?, ?)
        `,
        args: [
          legacyId,
          data.mentor_id,
          mentorName,
          data.student_id,
          studentName,
          studentEmail,
          data.topic,
          data.scheduled_date,
          `${data.start_time} - ${data.end_time}`,
          data.meeting_link || null,
          now,
          now,
        ],
      });

      await tx.commit();
    } catch (err) {
      await tx.rollback().catch(() => {});
      throw err;
    }

    const created = await this.getById(id);
    return created!;
  },

  async getById(id: string): Promise<MentoringSessionRow | null> {
    const result = await db.execute({
      sql: `
        SELECT 
          s.*,
          u.full_name AS student_name,
          u.email AS student_email,
          u.avatar_url AS student_avatar,
          m.full_name AS mentor_name,
          m.email AS mentor_email,
          m.title AS mentor_title,
          m.company AS mentor_company,
          m.avatar_url AS mentor_avatar
        FROM mentoring_sessions s
        JOIN users u ON s.student_id = u.id
        JOIN mentors m ON s.mentor_id = m.id
        WHERE s.id = ?
        LIMIT 1
      `,
      args: [id],
    });
    return (result.rows[0] as unknown as MentoringSessionRow) || null;
  },

  async getByRequestId(requestId: string): Promise<MentoringSessionRow | null> {
    const result = await db.execute({
      sql: `
        SELECT 
          s.*,
          u.full_name AS student_name,
          u.email AS student_email,
          u.avatar_url AS student_avatar,
          m.full_name AS mentor_name,
          m.email AS mentor_email,
          m.title AS mentor_title,
          m.company AS mentor_company,
          m.avatar_url AS mentor_avatar
        FROM mentoring_sessions s
        JOIN users u ON s.student_id = u.id
        JOIN mentors m ON s.mentor_id = m.id
        WHERE s.request_id = ?
        LIMIT 1
      `,
      args: [requestId],
    });
    return (result.rows[0] as unknown as MentoringSessionRow) || null;
  },

  async listByStudent(studentId: string, status?: string): Promise<MentoringSessionRow[]> {
    let sql = `
      SELECT 
        s.*,
        m.full_name AS mentor_name,
        m.email AS mentor_email,
        m.title AS mentor_title,
        m.company AS mentor_company,
        m.avatar_url AS mentor_avatar
      FROM mentoring_sessions s
      JOIN mentors m ON s.mentor_id = m.id
      WHERE s.student_id = ?
    `;
    const args: any[] = [studentId];

    if (status) {
      sql += ` AND s.status = ?`;
      args.push(status);
    }

    sql += ` ORDER BY s.scheduled_date ASC, s.start_time ASC`;

    const result = await db.execute({ sql, args });
    return result.rows as unknown as MentoringSessionRow[];
  },

  async listByMentor(mentorId: string, status?: string): Promise<MentoringSessionRow[]> {
    let sql = `
      SELECT 
        s.*,
        u.full_name AS student_name,
        u.email AS student_email,
        u.avatar_url AS student_avatar
      FROM mentoring_sessions s
      JOIN users u ON s.student_id = u.id
      WHERE s.mentor_id = ?
    `;
    const args: any[] = [mentorId];

    if (status) {
      sql += ` AND s.status = ?`;
      args.push(status);
    }

    sql += ` ORDER BY s.scheduled_date ASC, s.start_time ASC`;

    const result = await db.execute({ sql, args });
    return result.rows as unknown as MentoringSessionRow[];
  },

  async reschedule(data: {
    id: string;
    mentor_id: string;
    scheduled_date: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    calendar_event_id?: string;
    meeting_link?: string;
    reason?: string;
    performed_by: string;
  }): Promise<MentoringSessionRow> {
    const now = Date.now();
    const tx = await db.transaction('write');
    try {
      const updateRes = await tx.execute({
        sql: `
          UPDATE mentoring_sessions
          SET scheduled_date = ?,
              start_time = ?,
              end_time = ?,
              duration_minutes = ?,
              status = 'confirmed',
              calendar_event_id = COALESCE(?, calendar_event_id),
              meeting_link = COALESCE(?, meeting_link),
              version = version + 1,
              updated_at = ?
          WHERE id = ? AND mentor_id = ? AND status != 'cancelled'
        `,
        args: [
          data.scheduled_date,
          data.start_time,
          data.end_time,
          data.duration_minutes || 45,
          data.calendar_event_id || null,
          data.meeting_link || null,
          now,
          data.id,
          data.mentor_id,
        ],
      });

      if (updateRes.rowsAffected === 0) {
        await tx.rollback();
        throw new Error('Session not found, already cancelled, or unauthorized.');
      }

      const histId = `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await tx.execute({
        sql: `
          INSERT INTO mentoring_session_history (
            id, session_id, action, performed_by, details_json, created_at
          ) VALUES (?, ?, 'rescheduled', ?, ?, ?)
        `,
        args: [
          histId,
          data.id,
          data.performed_by,
          JSON.stringify({
            reason: data.reason || 'Session rescheduled',
            scheduled_date: data.scheduled_date,
            start_time: data.start_time,
            end_time: data.end_time,
            duration_minutes: data.duration_minutes || 45,
          }),
          now,
        ],
      });

      await tx.commit();
    } catch (err) {
      await tx.rollback().catch(() => {});
      throw err;
    }

    const updated = await this.getById(data.id);
    return updated!;
  },

  async updateDuration(
    dataOrId:
      | string
      | {
          id: string;
          mentor_id: string;
          duration_minutes: number;
          end_time: string;
          performed_by: string;
        },
    durationArg?: number,
    performedByArg?: string
  ): Promise<MentoringSessionRow> {
    let data: {
      id: string;
      mentor_id: string;
      duration_minutes: number;
      end_time: string;
      performed_by: string;
    };

    if (typeof dataOrId === 'string') {
      const existing = await this.getById(dataOrId);
      if (!existing) throw new Error('Session not found');
      const duration = durationArg || 45;
      const [h, m] = (existing.start_time || '10:00').split(':').map(Number);
      const total = h * 60 + m + duration;
      const end_time = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
      data = {
        id: dataOrId,
        mentor_id: existing.mentor_id,
        duration_minutes: duration,
        end_time,
        performed_by: performedByArg || existing.mentor_id,
      };
    } else {
      data = dataOrId;
    }

    const now = Date.now();
    const tx = await db.transaction('write');
    try {
      const updateRes = await tx.execute({
        sql: `
          UPDATE mentoring_sessions
          SET duration_minutes = ?,
              end_time = ?,
              version = version + 1,
              updated_at = ?
          WHERE id = ? AND mentor_id = ? AND status != 'cancelled'
        `,
        args: [data.duration_minutes, data.end_time, now, data.id, data.mentor_id],
      });

      if (updateRes.rowsAffected === 0) {
        await tx.rollback();
        throw new Error('Session not found, already cancelled, or unauthorized.');
      }

      const histId = `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await tx.execute({
        sql: `
          INSERT INTO mentoring_session_history (
            id, session_id, action, performed_by, details_json, created_at
          ) VALUES (?, ?, 'duration_updated', ?, ?, ?)
        `,
        args: [
          histId,
          data.id,
          data.performed_by,
          JSON.stringify({ duration_minutes: data.duration_minutes, end_time: data.end_time }),
          now,
        ],
      });

      await tx.commit();
    } catch (err) {
      await tx.rollback().catch(() => {});
      throw err;
    }

    const updated = await this.getById(data.id);
    return updated!;
  },

  async cancel(data: {
    id: string;
    actor_id: string;
    reason: string;
    is_mentor: boolean;
  }): Promise<MentoringSessionRow> {
    const now = Date.now();
    const tx = await db.transaction('write');
    try {
      // Allow student to cancel their session OR mentor to cancel their session
      const condition = data.is_mentor ? 'mentor_id = ?' : 'student_id = ?';
      const updateRes = await tx.execute({
        sql: `
          UPDATE mentoring_sessions
          SET status = 'cancelled',
              cancellation_reason = ?,
              cancelled_by = ?,
              version = version + 1,
              updated_at = ?
          WHERE id = ? AND ${condition} AND status != 'cancelled'
        `,
        args: [data.reason, data.actor_id, now, data.id, data.actor_id],
      });

      if (updateRes.rowsAffected === 0) {
        await tx.rollback();
        throw new Error('Session not found, already cancelled, or unauthorized.');
      }

      const histId = `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await tx.execute({
        sql: `
          INSERT INTO mentoring_session_history (
            id, session_id, action, performed_by, details_json, created_at
          ) VALUES (?, ?, 'cancelled', ?, ?, ?)
        `,
        args: [
          histId,
          data.id,
          data.actor_id,
          JSON.stringify({ reason: data.reason, cancelled_by: data.actor_id }),
          now,
        ],
      });

      // Record tombstone for delta sync
      await tx.execute({
        sql: `INSERT INTO sync_tombstones (entity_type, entity_id, deleted_at) VALUES ('mentoring_sessions', ?, ?)`,
        args: [data.id, now],
      });

      await tx.commit();
    } catch (err) {
      await tx.rollback().catch(() => {});
      throw err;
    }

    const updated = await this.getById(data.id);
    return updated!;
  },

  async complete(id: string, mentor_id: string, performed_by: string): Promise<{ session: MentoringSessionRow; newlyCompleted: boolean }> {
    const existing = await this.getById(id);
    if (!existing || existing.mentor_id !== mentor_id) {
      throw new Error('Session not found or unauthorized.');
    }
    if (existing.status === 'completed') {
      return { session: existing, newlyCompleted: false };
    }
    if (existing.status === 'cancelled') {
      throw new Error('Cannot complete a cancelled session.');
    }

    const now = Date.now();
    const tx = await db.transaction('write');
    try {
      const updateRes = await tx.execute({
        sql: `
          UPDATE mentoring_sessions
          SET status = 'completed',
              version = version + 1,
              updated_at = ?
          WHERE id = ? AND mentor_id = ? AND status != 'cancelled' AND status != 'completed'
        `,
        args: [now, id, mentor_id],
      });

      if (updateRes.rowsAffected === 0) {
        await tx.rollback();
        const current = await this.getById(id);
        return { session: current!, newlyCompleted: false };
      }

      const histId = `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await tx.execute({
        sql: `
          INSERT INTO mentoring_session_history (
            id, session_id, action, performed_by, details_json, created_at
          ) VALUES (?, ?, 'completed', ?, ?, ?)
        `,
        args: [histId, id, performed_by, JSON.stringify({ completed_at: now }), now],
      });

      await tx.commit();
    } catch (err) {
      await tx.rollback().catch(() => {});
      throw err;
    }

    const updated = await this.getById(id);
    return { session: updated!, newlyCompleted: true };
  },

  async getHistory(sessionId: string): Promise<any[]> {
    const result = await db.execute({
      sql: `SELECT * FROM mentoring_session_history WHERE session_id = ? ORDER BY created_at ASC`,
      args: [sessionId],
    });
    return result.rows.map((row: any) => {
      let details: any = {};
      try {
        details = JSON.parse(row.details_json || '{}');
      } catch {
        details = {};
      }
      return {
        ...row,
        reason: details.reason || null,
        ...details,
      };
    });
  },

  async scheduleSession(data: {
    request_id: string;
    mentor_id: string;
    student_id: string;
    scheduled_at?: string;
    scheduled_date?: string;
    start_time?: string;
    end_time?: string;
    duration_minutes: number;
    meeting_link?: string;
    google_calendar_event_id?: string;
    calendar_event_id?: string;
    topic?: string;
    description?: string;
    performed_by?: string;
  }): Promise<MentoringSessionRow & { scheduled_at: string }> {
    let dateStr = data.scheduled_date || '';
    let startStr = data.start_time || '';
    if (data.scheduled_at) {
      const parts = data.scheduled_at.split('T');
      dateStr = parts[0];
      startStr = parts[1] ? parts[1].substring(0, 5) : '10:00';
    }
    const duration = data.duration_minutes || 45;
    let endStr = data.end_time || '';
    if (!endStr && startStr) {
      const [h, m] = startStr.split(':').map(Number);
      const total = h * 60 + m + duration;
      endStr = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    }

    // Check for overlapping session for this mentor
    const conflict = await db.execute({
      sql: `
        SELECT id FROM mentoring_sessions
        WHERE mentor_id = ? AND scheduled_date = ? AND status IN ('confirmed', 'rescheduled')
          AND NOT (end_time <= ? OR start_time >= ?)
        LIMIT 1
      `,
      args: [data.mentor_id, dateStr, startStr, endStr],
    });
    if (conflict.rows.length > 0) {
      throw new Error('This time slot overlaps with an existing confirmed session for this mentor.');
    }

    // Retrieve topic from request if omitted
    let sessionTopic = data.topic;
    if (!sessionTopic) {
      const reqRes = await db.execute({
        sql: `SELECT topic FROM mentor_requests WHERE id = ? LIMIT 1`,
        args: [data.request_id],
      });
      sessionTopic = String(reqRes.rows[0]?.topic || '1-on-1 Mentorship');
    }

    const created = await this.create({
      request_id: data.request_id,
      student_id: data.student_id,
      mentor_id: data.mentor_id,
      topic: sessionTopic,
      description: data.description,
      scheduled_date: dateStr,
      start_time: startStr,
      end_time: endStr,
      duration_minutes: duration,
      calendar_event_id: data.calendar_event_id || data.google_calendar_event_id,
      meeting_link: data.meeting_link,
      performed_by: data.performed_by || data.mentor_id,
    });

    // Mark request as scheduled
    await db.execute({
      sql: `UPDATE mentor_requests SET status = 'scheduled', version = version + 1, updated_at = ? WHERE id = ?`,
      args: [Date.now(), data.request_id],
    });

    return {
      ...created,
      scheduled_at: `${dateStr}T${startStr}:00Z`,
    };
  },

  async rescheduleSession(
    sessionId: string,
    newScheduledAt: string,
    performedBy: string,
    reason?: string
  ): Promise<MentoringSessionRow & { scheduled_at: string }> {
    const [dateStr, timeWithZ] = newScheduledAt.split('T');
    const startStr = timeWithZ ? timeWithZ.substring(0, 5) : '10:00';
    const existing = await this.getById(sessionId);
    const duration = existing?.duration_minutes || 45;
    const [h, m] = startStr.split(':').map(Number);
    const total = h * 60 + m + duration;
    const endStr = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;

    const updated = await this.reschedule({
      id: sessionId,
      mentor_id: existing?.mentor_id || performedBy,
      scheduled_date: dateStr,
      start_time: startStr,
      end_time: endStr,
      duration_minutes: duration,
      reason: reason || 'Session rescheduled',
      performed_by: performedBy,
    });

    return {
      ...updated,
      scheduled_at: `${dateStr}T${startStr}:00Z`,
    };
  },

  async completeSession(
    id: string,
    mentorUserId: string,
    notes?: string
  ): Promise<MentoringSessionRow & { notes?: string | null }> {
    const session = await this.getById(id);
    if (!session) throw new Error('Session not found');

    const { session: updatedSession, newlyCompleted } = await this.complete(id, session.mentor_id, mentorUserId);
    const now = Date.now();

    if (newlyCompleted) {
      // Award +75 XP to student strictly once
      await usersRepository.addXp(session.student_id, 75);
      await db.execute({
        sql: `INSERT INTO xp_ledger (id, user_id, action_type, xp_value, source_ref_id, reason, created_at)
              VALUES (?, ?, 'mentoring_session_completed', 75, ?, 'Completed mentoring session', ?)
              ON CONFLICT(user_id, action_type, source_ref_id) DO NOTHING`,
        args: [`xp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, session.student_id, id, now],
      });
    }

    return {
      ...updatedSession,
      notes: notes || null,
    };
  },

  async getSessionHistory(sessionId: string): Promise<SessionHistoryRow[]> {
    return this.getHistory(sessionId);
  },

  async cancelSession(id: string, actorId: string, reason: string, isMentor = true): Promise<MentoringSessionRow> {
    return this.cancel({ id, actor_id: actorId, reason, is_mentor: isMentor });
  },
};
