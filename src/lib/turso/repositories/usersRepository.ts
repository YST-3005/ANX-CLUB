import { db } from '@/lib/turso/client';

export interface UserRow {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string | null;
  role: string;
  membership_type: string;
  membership_expiry?: number | null;
  college_id?: string | null;
  college_name?: string | null;
  graduation_year?: string | null;
  xp_total: number;
  leadership_stage: string;
  avatar_url?: string | null;
  bio?: string | null;
  referral_code?: string | null;
  referred_by?: string | null;
  version: number;
  created_at: number;
  updated_at: number;
}

export const usersRepository = {
  async getById(id: string): Promise<UserRow | null> {
    const result = await db.execute({
      sql: `SELECT * FROM users WHERE id = ? LIMIT 1`,
      args: [id],
    });
    return (result.rows[0] as unknown as UserRow) || null;
  },

  async getByEmail(email: string): Promise<UserRow | null> {
    const cleanEmail = email.trim().toLowerCase();
    const result = await db.execute({
      sql: `SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1`,
      args: [cleanEmail],
    });
    return (result.rows[0] as unknown as UserRow) || null;
  },

  async upsert(user: Partial<UserRow> & { id: string; email: string; full_name: string }): Promise<UserRow> {
    const now = Date.now();
    await db.execute({
      sql: `
        INSERT INTO users (
          id, email, full_name, phone_number, role, membership_type,
          membership_expiry, college_id, college_name, graduation_year,
          xp_total, leadership_stage, avatar_url, bio, referral_code,
          referred_by, version, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, COALESCE(?, 'Member'), COALESCE(?, 'free'),
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, 1, ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
          email = excluded.email,
          full_name = excluded.full_name,
          phone_number = COALESCE(excluded.phone_number, users.phone_number),
          role = CASE
            -- Preserve Admin or Mentor role from being downgraded by ordinary profile updates
            WHEN users.role IN ('Admin', 'Mentor') AND (excluded.role IS NULL OR excluded.role = 'Member') THEN users.role
            WHEN excluded.role IS NOT NULL THEN excluded.role
            ELSE users.role
          END,
          membership_type = CASE
            -- Preserve active premium membership from being unintentionally downgraded to free
            WHEN users.membership_type = 'premium' AND (excluded.membership_type IS NULL OR excluded.membership_type = 'free') AND (users.membership_expiry IS NULL OR users.membership_expiry > ?) THEN users.membership_type
            WHEN excluded.membership_type IS NOT NULL THEN excluded.membership_type
            ELSE users.membership_type
          END,
          membership_expiry = COALESCE(excluded.membership_expiry, users.membership_expiry),
          college_id = COALESCE(excluded.college_id, users.college_id),
          college_name = COALESCE(excluded.college_name, users.college_name),
          graduation_year = COALESCE(excluded.graduation_year, users.graduation_year),
          avatar_url = COALESCE(excluded.avatar_url, users.avatar_url),
          bio = COALESCE(excluded.bio, users.bio),
          version = users.version + 1,
          updated_at = excluded.updated_at
      `,
      args: [
        user.id,
        user.email.toLowerCase().trim(),
        user.full_name,
        user.phone_number || null,
        user.role || null,
        user.membership_type || null,
        user.membership_expiry || null,
        user.college_id || null,
        user.college_name || null,
        user.graduation_year || null,
        user.xp_total || 0,
        user.leadership_stage || 'Member',
        user.avatar_url || null,
        user.bio || null,
        user.referral_code || null,
        user.referred_by || null,
        user.created_at || now,
        now,
        now, // bound for membership_expiry comparison
      ],
    });

    const saved = await this.getById(user.id);
    return saved!;
  },

  /**
   * Idempotently provisions a verified Firebase user in Turso as an ordinary Member.
   * If the user already exists, preserves their existing role, membership, and XP completely intact.
   */
  async provisionMember(data: { id: string; email: string; full_name?: string }): Promise<UserRow> {
    const existing = await this.getById(data.id);
    if (existing) {
      return existing;
    }

    const now = Date.now();
    const cleanEmail = data.email.toLowerCase().trim();
    const fullName = data.full_name?.trim() || cleanEmail.split('@')[0] || 'Member';

    await db.execute({
      sql: `
        INSERT INTO users (
          id, email, full_name, role, membership_type, xp_total,
          leadership_stage, version, created_at, updated_at
        ) VALUES (?, ?, ?, 'Member', 'free', 0, 'Member', 1, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          updated_at = users.updated_at
      `,
      args: [data.id, cleanEmail, fullName, now, now],
    });

    const user = await this.getById(data.id);
    return user!;
  },

  async create(user: Partial<UserRow> & { id: string; email: string; full_name: string }): Promise<UserRow> {
    return this.upsert(user);
  },

  async updateRole(id: string, role: string, membershipType?: string): Promise<boolean> {
    const now = Date.now();
    const result = await db.execute({
      sql: `
        UPDATE users
        SET role = ?,
            membership_type = COALESCE(?, membership_type),
            version = version + 1,
            updated_at = ?
        WHERE id = ?
      `,
      args: [role, membershipType || null, now, id],
    });
    return result.rowsAffected > 0;
  },

  async updateMembership(id: string, membershipType: string, membershipExpiry?: number | null): Promise<boolean> {
    const now = Date.now();
    const result = await db.execute({
      sql: `
        UPDATE users
        SET membership_type = ?,
            membership_expiry = ?,
            version = version + 1,
            updated_at = ?
        WHERE id = ?
      `,
      args: [membershipType, membershipExpiry !== undefined ? membershipExpiry : null, now, id],
    });
    return result.rowsAffected > 0;
  },

  async updateXp(id: string, xpIncrement: number): Promise<number> {
    const now = Date.now();
    await db.execute({
      sql: `
        UPDATE users
        SET xp_total = xp_total + ?,
            version = version + 1,
            updated_at = ?
        WHERE id = ?
      `,
      args: [xpIncrement, now, id],
    });
    const user = await this.getById(id);
    return user?.xp_total || 0;
  },

  async addXp(id: string, xpIncrement: number): Promise<number> {
    return this.updateXp(id, xpIncrement);
  },

  async listAll(limit = 100): Promise<UserRow[]> {
    const result = await db.execute({
      sql: `SELECT * FROM users ORDER BY created_at DESC LIMIT ?`,
      args: [limit],
    });
    return result.rows as unknown as UserRow[];
  },
};
