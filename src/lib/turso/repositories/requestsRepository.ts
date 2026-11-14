import { db } from '@/lib/turso/client';

export type MentorRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface MentorRequestRow {
  id: string;
  student_id: string;
  mentor_id: string;
  topic: string;
  message?: string | null;
  status: MentorRequestStatus;
  decline_reason?: string | null;
  is_paid: number;
  amount: number;
  payment_id?: string | null;
  version: number;
  created_at: number;
  updated_at: number;

  // Joined fields
  student_name?: string;
  student_email?: string;
  student_avatar?: string;
  mentor_name?: string;
  mentor_email?: string;
  mentor_title?: string;
  mentor_company?: string;
  mentor_avatar?: string;
}

export const requestsRepository = {
  async create(data: {
    student_id: string;
    mentor_id: string;
    topic: string;
    message?: string;
    is_paid?: boolean;
    amount?: number;
    payment_id?: string;
    student_name?: string;
    student_email?: string;
    proposed_duration?: number;
  }): Promise<MentorRequestRow> {
    const now = Date.now();
    const id = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Transaction to prevent duplicate active requests
    const tx = await db.transaction('write');
    try {
      // Check for active duplicate request
      const existing = await tx.execute({
        sql: `
          SELECT id FROM mentor_requests
          WHERE student_id = ? AND mentor_id = ? AND status IN ('pending', 'accepted')
          LIMIT 1
        `,
        args: [data.student_id, data.mentor_id],
      });

      if (existing.rows.length > 0) {
        await tx.rollback();
        throw new Error('You already have an active request pending or awaiting scheduling with this mentor.');
      }

      await tx.execute({
        sql: `
          INSERT INTO mentor_requests (
            id, student_id, mentor_id, topic, message,
            status, is_paid, amount, payment_id, version,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, 1, ?, ?)
        `,
        args: [
          id,
          data.student_id,
          data.mentor_id,
          data.topic,
          data.message || null,
          data.is_paid ? 1 : 0,
          data.amount || 0,
          data.payment_id || null,
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

  async getById(id: string): Promise<MentorRequestRow | null> {
    const result = await db.execute({
      sql: `
        SELECT 
          r.*,
          u.full_name AS student_name,
          u.email AS student_email,
          u.avatar_url AS student_avatar,
          m.full_name AS mentor_name,
          m.email AS mentor_email,
          m.title AS mentor_title,
          m.company AS mentor_company,
          m.avatar_url AS mentor_avatar
        FROM mentor_requests r
        JOIN users u ON r.student_id = u.id
        JOIN mentors m ON r.mentor_id = m.id
        WHERE r.id = ?
        LIMIT 1
      `,
      args: [id],
    });
    return (result.rows[0] as unknown as MentorRequestRow) || null;
  },

  async listByStudent(studentId: string): Promise<MentorRequestRow[]> {
    const result = await db.execute({
      sql: `
        SELECT 
          r.*,
          m.full_name AS mentor_name,
          m.email AS mentor_email,
          m.title AS mentor_title,
          m.company AS mentor_company,
          m.avatar_url AS mentor_avatar
        FROM mentor_requests r
        JOIN mentors m ON r.mentor_id = m.id
        WHERE r.student_id = ?
        ORDER BY r.created_at DESC
      `,
      args: [studentId],
    });
    return result.rows as unknown as MentorRequestRow[];
  },

  async listByMentor(mentorId: string, status?: MentorRequestStatus): Promise<MentorRequestRow[]> {
    let sql = `
      SELECT 
        r.*,
        u.full_name AS student_name,
        u.email AS student_email,
        u.avatar_url AS student_avatar
      FROM mentor_requests r
      JOIN users u ON r.student_id = u.id
      WHERE r.mentor_id = ?
    `;
    const args: any[] = [mentorId];

    if (status) {
      sql += ` AND r.status = ?`;
      args.push(status);
    }

    sql += ` ORDER BY r.created_at DESC`;

    const result = await db.execute({ sql, args });
    return result.rows as unknown as MentorRequestRow[];
  },

  async accept(id: string, mentorId: string): Promise<MentorRequestRow> {
    const now = Date.now();
    const result = await db.execute({
      sql: `
        UPDATE mentor_requests
        SET status = 'accepted',
            version = version + 1,
            updated_at = ?
        WHERE id = ? AND mentor_id = ? AND status = 'pending'
      `,
      args: [now, id, mentorId],
    });

    if (result.rowsAffected === 0) {
      throw new Error('Request not found, already processed, or unauthorized.');
    }

    const updated = await this.getById(id);
    return updated!;
  },

  async decline(id: string, mentorId: string, reason: string): Promise<MentorRequestRow> {
    const now = Date.now();
    const result = await db.execute({
      sql: `
        UPDATE mentor_requests
        SET status = 'declined',
            decline_reason = ?,
            version = version + 1,
            updated_at = ?
        WHERE id = ? AND mentor_id = ? AND status = 'pending'
      `,
      args: [reason, now, id, mentorId],
    });

    if (result.rowsAffected === 0) {
      throw new Error('Request not found, already processed, or unauthorized.');
    }

    const updated = await this.getById(id);
    return updated!;
  },

  async cancelByStudent(id: string, studentId: string): Promise<MentorRequestRow> {
    const now = Date.now();
    const result = await db.execute({
      sql: `
        UPDATE mentor_requests
        SET status = 'cancelled',
            version = version + 1,
            updated_at = ?
        WHERE id = ? AND student_id = ? AND status = 'pending'
      `,
      args: [now, id, studentId],
    });

    if (result.rowsAffected === 0) {
      throw new Error('Request cannot be cancelled. It may have already been accepted, declined, or does not exist.');
    }

    const updated = await this.getById(id);
    return updated!;
  },
};
