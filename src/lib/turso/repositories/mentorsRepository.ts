import { db } from '@/lib/turso/client';
import { encryptToken, decryptToken } from '@/lib/security/encryption';

export interface MentorRow {
  id: string;
  user_id?: string | null;
  full_name: string;
  email: string;
  title: string;
  company?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  hourly_rate: number;
  rating: number;
  review_count: number;
  skills_json: string;
  is_available: number;
  is_premium_only: number;
  experience_years: number;
  version: number;
  created_at: number;
  updated_at: number;
}

export interface MentorProfileRow {
  id: string;
  headline?: string | null;
  languages_json: string;
  topics_json: string;
  linkedin_url?: string | null;
  github_url?: string | null;
  twitter_url?: string | null;
  google_refresh_token?: string | null;
  google_access_token?: string | null;
  google_token_expiry?: number | null;
  created_at: number;
  updated_at: number;
}

export interface AvailabilitySlot {
  id?: string;
  mentor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active?: number;
}

export interface MentorInvitationRow {
  id: string;
  mentor_id: string;
  user_id: string;
  email: string;
  invitation_link: string;
  status: string; // 'pending', 'accepted', 'expired'
  expires_at: number;
  created_at: number;
  updated_at: number;
}

let invitationsTableEnsured = false;
async function ensureInvitationsTable(): Promise<void> {
  if (invitationsTableEnsured) return;
  await db.execute(`
    CREATE TABLE IF NOT EXISTS mentor_invitations (
      id TEXT PRIMARY KEY,
      mentor_id TEXT NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      invitation_link TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_mentor_invitations_email ON mentor_invitations(email);
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_mentor_invitations_status ON mentor_invitations(status);
  `);
  invitationsTableEnsured = true;
}

export const mentorsRepository = {
  async list(options?: { skill?: string; search?: string; limit?: number; onlyAvailable?: boolean }): Promise<MentorRow[]> {
    let sql = `SELECT * FROM mentors WHERE 1=1`;
    const args: any[] = [];

    if (options?.onlyAvailable !== false) {
      sql += ` AND is_available = 1`;
    }

    if (options?.search) {
      const term = `%${options.search.toLowerCase()}%`;
      sql += ` AND (LOWER(full_name) LIKE ? OR LOWER(title) LIKE ? OR LOWER(COALESCE(company, '')) LIKE ?)`;
      args.push(term, term, term);
    }

    if (options?.skill && options.skill !== 'all') {
      sql += ` AND skills_json LIKE ?`;
      args.push(`%${options.skill}%`);
    }

    sql += ` ORDER BY rating DESC, review_count DESC`;

    const limit = Math.min(options?.limit || 50, 100);
    sql += ` LIMIT ?`;
    args.push(limit);

    const result = await db.execute({ sql, args });
    return result.rows as unknown as MentorRow[];
  },

  async getById(id: string): Promise<(MentorRow & { skills: string[] }) | null> {
    const result = await db.execute({
      sql: `SELECT * FROM mentors WHERE id = ? LIMIT 1`,
      args: [id],
    });
    if (!result.rows[0]) return null;
    const row = result.rows[0] as unknown as MentorRow;
    let skills: string[] = [];
    try {
      skills = JSON.parse(row.skills_json || '[]');
    } catch {
      skills = [];
    }
    return { ...row, skills };
  },

  async getByUserId(userId: string): Promise<MentorRow | null> {
    const result = await db.execute({
      sql: `SELECT * FROM mentors WHERE user_id = ? LIMIT 1`,
      args: [userId],
    });
    return (result.rows[0] as unknown as MentorRow) || null;
  },

  async getByEmail(email: string): Promise<MentorRow | null> {
    const result = await db.execute({
      sql: `SELECT * FROM mentors WHERE LOWER(email) = ? LIMIT 1`,
      args: [email.trim().toLowerCase()],
    });
    return (result.rows[0] as unknown as MentorRow) || null;
  },

  async upsert(mentor: Partial<MentorRow> & { id: string; full_name: string; email: string; title: string }): Promise<MentorRow> {
    const now = Date.now();
    await db.execute({
      sql: `
        INSERT INTO mentors (
          id, user_id, full_name, email, title, company, bio,
          avatar_url, hourly_rate, rating, review_count, skills_json,
          is_available, is_premium_only, experience_years, version, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, 1, ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
          user_id = COALESCE(excluded.user_id, mentors.user_id),
          full_name = excluded.full_name,
          email = excluded.email,
          title = excluded.title,
          company = COALESCE(excluded.company, mentors.company),
          bio = COALESCE(excluded.bio, mentors.bio),
          avatar_url = COALESCE(excluded.avatar_url, mentors.avatar_url),
          hourly_rate = excluded.hourly_rate,
          skills_json = excluded.skills_json,
          is_available = excluded.is_available,
          is_premium_only = excluded.is_premium_only,
          experience_years = excluded.experience_years,
          version = mentors.version + 1,
          updated_at = excluded.updated_at
      `,
      args: [
        mentor.id,
        mentor.user_id || null,
        mentor.full_name,
        mentor.email.toLowerCase().trim(),
        mentor.title,
        mentor.company || null,
        mentor.bio || null,
        mentor.avatar_url || null,
        mentor.hourly_rate || 0,
        mentor.rating !== undefined ? mentor.rating : 5.0,
        mentor.review_count || 0,
        mentor.skills_json || '[]',
        mentor.is_available !== undefined ? mentor.is_available : 1,
        mentor.is_premium_only !== undefined ? mentor.is_premium_only : 0,
        mentor.experience_years || 0,
        mentor.created_at || now,
        now,
      ],
    });

    const saved = await this.getById(mentor.id);
    return saved!;
  },

  async getProfile(mentorId: string): Promise<MentorProfileRow | null> {
    const result = await db.execute({
      sql: `SELECT * FROM mentor_profiles WHERE id = ? LIMIT 1`,
      args: [mentorId],
    });
    return (result.rows[0] as unknown as MentorProfileRow) || null;
  },

  async saveGoogleOAuthTokens(
    mentorId: string,
    tokens: { refreshToken?: string; accessToken?: string; expiryDate?: number }
  ): Promise<void> {
    const now = Date.now();
    // Encrypt both refresh token and access token before writing to database
    const encryptedRefreshToken = tokens.refreshToken ? encryptToken(tokens.refreshToken) : null;
    const encryptedAccessToken = tokens.accessToken ? encryptToken(tokens.accessToken) : null;

    await db.execute({
      sql: `
        INSERT INTO mentor_profiles (
          id, google_refresh_token, google_access_token, google_token_expiry, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          google_refresh_token = COALESCE(excluded.google_refresh_token, mentor_profiles.google_refresh_token),
          google_access_token = COALESCE(excluded.google_access_token, mentor_profiles.google_access_token),
          google_token_expiry = COALESCE(excluded.google_token_expiry, mentor_profiles.google_token_expiry),
          updated_at = excluded.updated_at
      `,
      args: [
        mentorId,
        encryptedRefreshToken,
        encryptedAccessToken,
        tokens.expiryDate || null,
        now,
        now,
      ],
    });
  },

  async clearGoogleOAuthTokens(mentorId: string): Promise<void> {
    const now = Date.now();
    await db.execute({
      sql: `
        UPDATE mentor_profiles
        SET google_refresh_token = NULL,
            google_access_token = NULL,
            google_token_expiry = NULL,
            updated_at = ?
        WHERE id = ?
      `,
      args: [now, mentorId],
    });
  },

  async isGoogleCalendarConnected(mentorId: string): Promise<boolean> {
    const result = await db.execute({
      sql: `SELECT google_refresh_token FROM mentor_profiles WHERE id = ? LIMIT 1`,
      args: [mentorId],
    });
    const token = result.rows[0]?.google_refresh_token;
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return false;
    }
    // Verify that the stored token can be legitimately decrypted with the active key
    const decrypted = decryptToken(token);
    return Boolean(decrypted && decrypted.trim().length > 0);
  },

  /**
   * Explicit secure migration utility for legacy plaintext tokens.
   * Finds any genuine plaintext tokens in mentor_profiles and encrypts them using AES-256-GCM.
   * - Preserves already encrypted tokens (starts with v1:).
   * - Does NOT treat malformed or corrupted encrypted tokens as plaintext (never re-encrypts).
   * - Uses optimistic concurrency to ensure tokens changed concurrently are never overwritten.
   */
  async migrateLegacyPlaintextTokens(): Promise<{ migratedCount: number; skippedCount: number; errors: number }> {
    const result = await db.execute(`
      SELECT id, google_refresh_token, google_access_token
      FROM mentor_profiles
      WHERE (google_refresh_token IS NOT NULL AND google_refresh_token != '')
         OR (google_access_token IS NOT NULL AND google_access_token != '')
    `);

    let migratedCount = 0;
    let skippedCount = 0;
    let errors = 0;
    const now = Date.now();

    // Helper: checks if token is already encrypted or an attempt at an encrypted format
    const isEncryptedOrMalformedEncrypted = (token: string): boolean => {
      // Any versioned prefix e.g. v1:, v2:, etc. indicates an encrypted payload, not plaintext
      if (/^v\d+:/i.test(token)) return true;
      // Or colon-delimited payload
      const parts = token.split(':');
      if (parts.length >= 3) return true;
      return false;
    };

    for (const row of result.rows) {
      const id = String(row.id);
      const rawRefresh = row.google_refresh_token ? String(row.google_refresh_token) : null;
      const rawAccess = row.google_access_token ? String(row.google_access_token) : null;

      let needsUpdate = false;
      let newEncryptedRefresh = rawRefresh;
      let newEncryptedAccess = rawAccess;

      try {
        if (rawRefresh) {
          if (!isEncryptedOrMalformedEncrypted(rawRefresh)) {
            newEncryptedRefresh = encryptToken(rawRefresh);
            needsUpdate = true;
          }
        }

        if (rawAccess) {
          if (!isEncryptedOrMalformedEncrypted(rawAccess)) {
            newEncryptedAccess = encryptToken(rawAccess);
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          // Optimistic concurrency control: only update if the tokens haven't changed since reading
          const updateRes = await db.execute({
            sql: `
              UPDATE mentor_profiles
              SET google_refresh_token = ?,
                  google_access_token = ?,
                  updated_at = ?
              WHERE id = ?
                AND (google_refresh_token IS ? OR google_refresh_token = ?)
                AND (google_access_token IS ? OR google_access_token = ?)
            `,
            args: [newEncryptedRefresh, newEncryptedAccess, now, id, rawRefresh, rawRefresh, rawAccess, rawAccess],
          });

          if (Number(updateRes.rowsAffected || 0) > 0) {
            migratedCount++;
          } else {
            console.warn(`[migrateLegacyPlaintextTokens] Tokens for mentor ${id} changed concurrently; update skipped.`);
            skippedCount++;
          }
        } else {
          // All tokens for this record were already encrypted or malformed encrypted: record skipped
          skippedCount++;
        }
      } catch (err: any) {
        console.error(`[migrateLegacyPlaintextTokens] Failed to migrate tokens for profile ${id}:`, err?.message || err);
        errors++;
      }
    }

    return { migratedCount, skippedCount, errors };
  },

  async getAvailability(mentorId: string): Promise<AvailabilitySlot[]> {
    const result = await db.execute({
      sql: `SELECT * FROM mentor_availability WHERE mentor_id = ? AND is_active = 1 ORDER BY day_of_week ASC, start_time ASC`,
      args: [mentorId],
    });
    return result.rows as unknown as AvailabilitySlot[];
  },

  async seedDefaultMentorsIfEmpty(): Promise<void> {
    const countRes = await db.execute(`SELECT COUNT(*) as count FROM mentors`);
    const count = Number(countRes.rows[0]?.count || 0);
    if (count > 0) return;

    const seedMentors = [
      {
        id: 'mentor_sarah',
        full_name: 'Sarah Jenkins',
        email: 'sarah.jenkins@google.com',
        title: 'Staff Software Engineer',
        company: 'Google',
        bio: '12+ years building distributed backend systems, Kubernetes orchestration, and mentoring 100+ engineers into FAANG.',
        avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
        hourly_rate: 0,
        rating: 4.95,
        review_count: 38,
        skills_json: JSON.stringify(['Go', 'Distributed Systems', 'System Design', 'Kubernetes']),
        is_available: 1,
        is_premium_only: 0,
        experience_years: 12,
      },
      {
        id: 'mentor_aravind',
        full_name: 'Aravind Krishnan',
        email: 'aravind@stripe.com',
        title: 'Principal Systems Architect',
        company: 'Stripe',
        bio: 'Core infrastructure lead at Stripe. Passionate about payment reliability, database isolation, and high-throughput architectures.',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
        hourly_rate: 199,
        rating: 4.98,
        review_count: 52,
        skills_json: JSON.stringify(['Rust', 'High Throughput', 'System Design', 'PostgreSQL', 'Turso']),
        is_available: 1,
        is_premium_only: 1,
        experience_years: 14,
      },
      {
        id: 'mentor_priya',
        full_name: 'Priya Sharma',
        email: 'priya.sharma@vercel.com',
        title: 'Engineering Director',
        company: 'Vercel',
        bio: 'Specialized in frontend performance, Edge runtimes, Next.js internal architecture, and technical interview preparation.',
        avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
        hourly_rate: 0,
        rating: 4.9,
        review_count: 29,
        skills_json: JSON.stringify(['React', 'Next.js', 'TypeScript', 'Web Performance']),
        is_available: 1,
        is_premium_only: 0,
        experience_years: 10,
      },
      {
        id: 'mentor_marcus',
        full_name: 'Marcus Vance',
        email: 'marcus@meta.com',
        title: 'Lead AI Infrastructure Engineer',
        company: 'Meta',
        bio: 'Leading LLM deployment pipelines and large-scale GPU training clusters. Happy to conduct mock system design and coding interviews.',
        avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
        hourly_rate: 149,
        rating: 4.88,
        review_count: 24,
        skills_json: JSON.stringify(['Python', 'PyTorch', 'Distributed Training', 'Machine Learning']),
        is_available: 1,
        is_premium_only: 1,
        experience_years: 9,
      },
    ];

    for (const m of seedMentors) {
      await this.upsert(m);
    }
  },

  async ensureInvitationsTable(): Promise<void> {
    return ensureInvitationsTable();
  },

  /**
   * Lists all mentors for admin management, joined with user account and invitation data.
   */
  async listAllForAdmin(): Promise<any[]> {
    await ensureInvitationsTable();
    const result = await db.execute(`
      SELECT 
        m.id,
        m.user_id,
        m.full_name,
        m.email,
        m.title,
        m.company,
        m.bio,
        m.avatar_url,
        m.hourly_rate,
        m.rating,
        m.review_count,
        m.skills_json,
        m.is_available,
        m.is_premium_only,
        m.experience_years,
        m.created_at,
        m.updated_at,
        u.role as user_role,
        u.membership_type as user_membership,
        p.google_refresh_token,
        inv.id as invitation_id,
        inv.status as invitation_status,
        inv.expires_at as invitation_expires_at,
        inv.invitation_link
      FROM mentors m
      LEFT JOIN users u ON m.user_id = u.id
      LEFT JOIN mentor_profiles p ON m.id = p.id
      LEFT JOIN mentor_invitations inv ON m.id = inv.mentor_id
      ORDER BY m.created_at DESC
    `);

    return result.rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      fullName: row.full_name,
      email: row.email,
      title: row.title,
      company: row.company,
      bio: row.bio,
      avatarUrl: row.avatar_url,
      hourlyRate: Number(row.hourly_rate || 0),
      rating: Number(row.rating || 5.0),
      reviewCount: Number(row.review_count || 0),
      skills: (() => {
        try {
          return JSON.parse(row.skills_json || '[]');
        } catch {
          return [];
        }
      })(),
      isAvailable: Boolean(row.is_available),
      isPremiumOnly: Boolean(row.is_premium_only),
      experienceYears: Number(row.experience_years || 0),
      calendarConnected: Boolean(row.google_refresh_token),
      userRole: row.user_role || (row.user_id ? 'Mentor' : 'Unlinked'),
      role: row.user_role || (row.user_id ? 'Mentor' : 'Unlinked'),
      invitationStatus: row.invitation_status || (row.invitation_id ? 'pending' : null),
      invitation: row.invitation_id
        ? {
            id: row.invitation_id,
            status: row.invitation_status,
            expiresAt: row.invitation_expires_at,
            link: row.invitation_link,
          }
        : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  /**
   * Updates mentor profile details.
   */
  async update(id: string, updates: Partial<MentorRow>): Promise<MentorRow | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const now = Date.now();
    await db.execute({
      sql: `
        UPDATE mentors
        SET full_name = COALESCE(?, full_name),
            title = COALESCE(?, title),
            company = COALESCE(?, company),
            bio = COALESCE(?, bio),
            avatar_url = COALESCE(?, avatar_url),
            hourly_rate = COALESCE(?, hourly_rate),
            skills_json = COALESCE(?, skills_json),
            is_available = COALESCE(?, is_available),
            is_premium_only = COALESCE(?, is_premium_only),
            experience_years = COALESCE(?, experience_years),
            version = version + 1,
            updated_at = ?
        WHERE id = ?
      `,
      args: [
        updates.full_name !== undefined ? updates.full_name : null,
        updates.title !== undefined ? updates.title : null,
        updates.company !== undefined ? updates.company : null,
        updates.bio !== undefined ? updates.bio : null,
        updates.avatar_url !== undefined ? updates.avatar_url : null,
        updates.hourly_rate !== undefined ? updates.hourly_rate : null,
        updates.skills_json !== undefined ? updates.skills_json : null,
        updates.is_available !== undefined ? updates.is_available : null,
        updates.is_premium_only !== undefined ? updates.is_premium_only : null,
        updates.experience_years !== undefined ? updates.experience_years : null,
        now,
        id,
      ],
    });

    return this.getById(id);
  },

  /**
   * Toggles active / available status for a mentor.
   */
  async toggleAvailability(id: string, isAvailable: boolean): Promise<boolean> {
    const now = Date.now();
    const result = await db.execute({
      sql: `
        UPDATE mentors
        SET is_available = ?,
            version = version + 1,
            updated_at = ?
        WHERE id = ?
      `,
      args: [isAvailable ? 1 : 0, now, id],
    });
    return (result.rowsAffected || 0) > 0;
  },

  /**
   * Deactivates or removes a mentor record safely.
   */
  async delete(id: string): Promise<boolean> {
    const now = Date.now();
    const result = await db.execute({
      sql: `
        UPDATE mentors
        SET is_available = 0,
            version = version + 1,
            updated_at = ?
        WHERE id = ?
      `,
      args: [now, id],
    });
    return (result.rowsAffected || 0) > 0;
  },

  /**
   * Creates or replaces an invitation for a mentor.
   */
  async createInvitation(data: {
    id?: string;
    mentor_id: string;
    user_id: string;
    email: string;
    invitation_link: string;
    expires_at: number;
  }): Promise<MentorInvitationRow> {
    await ensureInvitationsTable();
    const now = Date.now();
    const id = data.id || `inv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Upsert invitation by email or mentor_id
    await db.execute({
      sql: `
        INSERT INTO mentor_invitations (
          id, mentor_id, user_id, email, invitation_link, status, expires_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          invitation_link = excluded.invitation_link,
          status = 'pending',
          expires_at = excluded.expires_at,
          updated_at = excluded.updated_at
      `,
      args: [id, data.mentor_id, data.user_id, data.email.toLowerCase().trim(), data.invitation_link, data.expires_at, now, now],
    });

    return {
      id,
      mentor_id: data.mentor_id,
      user_id: data.user_id,
      email: data.email.toLowerCase().trim(),
      invitation_link: data.invitation_link,
      status: 'pending',
      expires_at: data.expires_at,
      created_at: now,
      updated_at: now,
    };
  },

  async getInvitation(id: string): Promise<MentorInvitationRow | null> {
    await ensureInvitationsTable();
    const result = await db.execute({
      sql: `SELECT * FROM mentor_invitations WHERE id = ? LIMIT 1`,
      args: [id],
    });
    return (result.rows[0] as unknown as MentorInvitationRow) || null;
  },

  async getInvitationByMentorId(mentorId: string): Promise<MentorInvitationRow | null> {
    await ensureInvitationsTable();
    const result = await db.execute({
      sql: `SELECT * FROM mentor_invitations WHERE mentor_id = ? ORDER BY created_at DESC LIMIT 1`,
      args: [mentorId],
    });
    return (result.rows[0] as unknown as MentorInvitationRow) || null;
  },

  async getInvitationByEmail(email: string): Promise<MentorInvitationRow | null> {
    await ensureInvitationsTable();
    const result = await db.execute({
      sql: `SELECT * FROM mentor_invitations WHERE LOWER(email) = ? ORDER BY created_at DESC LIMIT 1`,
      args: [email.toLowerCase().trim()],
    });
    return (result.rows[0] as unknown as MentorInvitationRow) || null;
  },

  async listInvitations(): Promise<MentorInvitationRow[]> {
    await ensureInvitationsTable();
    const result = await db.execute(`
      SELECT * FROM mentor_invitations ORDER BY created_at DESC
    `);
    return result.rows as unknown as MentorInvitationRow[];
  },

  async updateInvitationStatus(id: string, status: string): Promise<boolean> {
    await ensureInvitationsTable();
    const now = Date.now();
    const result = await db.execute({
      sql: `UPDATE mentor_invitations SET status = ?, updated_at = ? WHERE id = ?`,
      args: [status, now, id],
    });
    return (result.rowsAffected || 0) > 0;
  },

  /**
   * Returns aggregate count of total mentors and currently active mentors.
   */
  async getMentorStats(): Promise<{ totalMentors: number; activeMentors: number }> {
    try {
      const res = await db.execute(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN is_available = 1 THEN 1 ELSE 0 END) as active
        FROM mentors
      `);
      const row = res.rows[0];
      return {
        totalMentors: Number(row?.total || 0),
        activeMentors: Number(row?.active || 0),
      };
    } catch {
      return { totalMentors: 0, activeMentors: 0 };
    }
  },
};
