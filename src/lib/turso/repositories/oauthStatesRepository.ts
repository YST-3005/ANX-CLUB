import crypto from 'crypto';
import { db } from '@/lib/turso/client';

export interface ConsumedOAuthStateRow {
  state_hash: string;
  mentor_id: string;
  user_id: string;
  consumed_at: number;
  expires_at: number;
}

/**
 * Accurately detects SQLite / Turso UNIQUE and PRIMARY KEY constraint violations.
 * Differentiates genuine state replay attacks from generic constraint failures
 * (such as FOREIGN KEY, NOT NULL, CHECK) or network/database failures.
 */
export function isUniqueConstraintViolation(err: any): boolean {
  if (!err) return false;

  const code = String(err.code || err.rawCode || '').toUpperCase();
  const message = String(err.message || '').toLowerCase();

  // Explicitly reject non-unique constraint violations (foreign key, not null, check, trigger)
  if (
    code === 'SQLITE_CONSTRAINT_FOREIGNKEY' ||
    code === 'SQLITE_CONSTRAINT_NOTNULL' ||
    code === 'SQLITE_CONSTRAINT_CHECK' ||
    code === 'SQLITE_CONSTRAINT_TRIGGER' ||
    message.includes('foreign key constraint failed') ||
    message.includes('not null constraint failed') ||
    message.includes('check constraint failed') ||
    message.includes('cannot be null')
  ) {
    return false;
  }

  // Explicit check for unique / primary key extended error codes
  if (code === 'SQLITE_CONSTRAINT_UNIQUE' || code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
    return true;
  }

  // Check SQLite message text specifically indicating unique or primary key failure
  if (
    message.includes('unique constraint failed') ||
    message.includes('primary key must be unique') ||
    message.includes('primary key constraint failed')
  ) {
    return true;
  }

  // Generic SQLITE_CONSTRAINT without unique or primary key confirmation must NOT be treated as a replay
  return false;
}

export const oauthStatesRepository = {
  /**
   * Ensures the consumed_oauth_states table exists.
   * Throws if database execution fails. Does NOT swallow errors.
   */
  async ensureTable(): Promise<void> {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS consumed_oauth_states (
        state_hash TEXT PRIMARY KEY,
        mentor_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        consumed_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      );
    `);
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_consumed_states_exp ON consumed_oauth_states(expires_at);
    `);
  },

  /**
   * Cleans up expired states from the database.
   * Propagates errors instead of silently hiding critical failures.
   */
  async cleanupExpired(): Promise<number> {
    const now = Date.now();
    const res = await db.execute({
      sql: `DELETE FROM consumed_oauth_states WHERE expires_at < ?`,
      args: [now],
    });
    return Number(res.rowsAffected || 0);
  },

  /**
   * Atomically consumes an OAuth state token.
   * Returns true if successfully consumed.
   * Returns false ONLY on genuine duplicate/unique constraint violation (replay attack).
   * Propagates all other database errors (e.g. foreign-key, not-null, check, connection errors).
   */
  async consume(
    stateString: string,
    verifiedState: { mentorId: string; userId: string; exp: number }
  ): Promise<boolean> {
    // Ensure table exists; fails loudly if database is unreachable
    await this.ensureTable();

    // Compute a deterministic SHA-256 hash of the entire state token
    const stateHash = crypto.createHash('sha256').update(stateString).digest('hex');
    const now = Date.now();

    // Best-effort expired cleanup; logs warning without aborting valid consumption
    try {
      await db.execute({
        sql: `DELETE FROM consumed_oauth_states WHERE expires_at < ?`,
        args: [now],
      });
    } catch (cleanupErr: any) {
      console.warn(
        '[OAuthStatesRepository] Warning: Expired state cleanup failed:',
        cleanupErr?.message || cleanupErr
      );
    }

    try {
      await db.execute({
        sql: `
          INSERT INTO consumed_oauth_states (
            state_hash, mentor_id, user_id, consumed_at, expires_at
          ) VALUES (?, ?, ?, ?, ?)
        `,
        args: [stateHash, verifiedState.mentorId, verifiedState.userId, now, verifiedState.exp],
      });
      return true;
    } catch (err: any) {
      if (isUniqueConstraintViolation(err)) {
        console.warn('[OAuthStatesRepository] State token replay rejected. Hash:', stateHash);
        return false;
      }

      // Propagate all other database failures (foreign-key, not-null, check, connection error, etc.)
      console.error(
        '[OAuthStatesRepository] Unexpected database error during state consumption:',
        err?.message || err
      );
      throw err;
    }
  },

  /**
   * Checks whether a state hash was already consumed without inserting.
   */
  async isConsumed(stateString: string): Promise<boolean> {
    await this.ensureTable();
    const stateHash = crypto.createHash('sha256').update(stateString).digest('hex');
    const res = await db.execute({
      sql: `SELECT 1 FROM consumed_oauth_states WHERE state_hash = ? LIMIT 1`,
      args: [stateHash],
    });
    return (res.rows.length || 0) > 0;
  },
};
