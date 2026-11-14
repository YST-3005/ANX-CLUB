import { db } from '@/lib/turso/client';
import { randomUUID } from 'crypto';

export interface ReferralRewardClaimRow {
  id: string;
  user_id: string;
  milestone: string;
  referral_count: number;
  reward_type: string;
  granted_days: number;
  claimed_at: number;
}

export interface ClaimRewardResult {
  success: boolean;
  rewardGranted: boolean;
  alreadyClaimed: boolean;
  referralCount: number;
  message: string;
  newExpiry?: number;
}

let tableEnsured = false;
async function ensureReferralClaimsTable(): Promise<void> {
  if (tableEnsured) return;
  await db.execute(`
    CREATE TABLE IF NOT EXISTS referral_reward_claims (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      milestone TEXT NOT NULL,
      referral_count INTEGER NOT NULL,
      reward_type TEXT NOT NULL,
      granted_days INTEGER NOT NULL DEFAULT 30,
      claimed_at INTEGER NOT NULL,
      UNIQUE(user_id, milestone)
    );
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_referral_claims_user ON referral_reward_claims(user_id);
  `);
  tableEnsured = true;
}

export const referralsRepository = {
  /**
   * Helper to ensure table existence across testing and local runtimes.
   */
  async ensureTable(): Promise<void> {
    return ensureReferralClaimsTable();
  },

  /**
   * Counts verified referrals for a given user.
   */
  async getReferralCount(userId: string): Promise<number> {
    const res = await db.execute({
      sql: `
        SELECT COUNT(*) as count FROM users
        WHERE referred_by = (SELECT referral_code FROM users WHERE id = ?)
      `,
      args: [userId],
    });
    return Number(res.rows[0]?.count || 0);
  },

  /**
   * Retrieves an existing reward claim for a user and milestone, if any.
   */
  async getClaim(userId: string, milestone: string): Promise<ReferralRewardClaimRow | null> {
    await ensureReferralClaimsTable();
    const res = await db.execute({
      sql: `SELECT * FROM referral_reward_claims WHERE user_id = ? AND milestone = ? LIMIT 1`,
      args: [userId, milestone],
    });
    return (res.rows[0] as unknown as ReferralRewardClaimRow) || null;
  },

  /**
   * Atomically claims a referral reward milestone within a database transaction.
   * Ensures idempotency:
   * 1. Checks if milestone is already claimed (both fast-path and inside transaction).
   * 2. Checks if verified referral count satisfies requirement (>= 3 for '3_referrals').
   * 3. Inserts into referral_reward_claims table (protected by UNIQUE(user_id, milestone)).
   * 4. Extends premium membership by 30 days while preserving existing membership and anti-downgrade logic.
   * Concurrent requests for the same user & milestone are safely serialized, retried on database busy lock,
   * or gracefully rejected by the unique constraint.
   */
  async claimReferralReward(
    userId: string,
    milestone: string = '3_referrals',
    maxRetries = 8
  ): Promise<ClaimRewardResult> {
    await ensureReferralClaimsTable();

    // Fast-path read check: if already claimed, return immediately
    const existingClaim = await this.getClaim(userId, milestone);
    if (existingClaim) {
      const count = await this.getReferralCount(userId);
      return {
        success: true,
        rewardGranted: false,
        alreadyClaimed: true,
        referralCount: count,
        message: 'Referral reward has already been claimed for this milestone.',
      };
    }

    try {
      const tx = await db.transaction('write');
      try {
        // 1. Fetch current user data inside the transaction
        const userRes = await tx.execute({
          sql: `SELECT id, role, membership_type, membership_expiry, referral_code FROM users WHERE id = ? LIMIT 1`,
          args: [userId],
        });
        const user = userRes.rows[0];
        if (!user) {
          await tx.rollback();
          throw new Error('User not found.');
        }

        // 2. Check if already claimed for this milestone inside transaction
        const existingClaimRes = await tx.execute({
          sql: `SELECT id FROM referral_reward_claims WHERE user_id = ? AND milestone = ? LIMIT 1`,
          args: [userId, milestone],
        });
        if (existingClaimRes.rows.length > 0) {
          const countRes = await tx.execute({
            sql: `SELECT COUNT(*) as count FROM users WHERE referred_by = ?`,
            args: [(user.referral_code as string) || ''],
          });
          const currentCount = Number(countRes.rows[0]?.count || 0);

          await tx.rollback();
          return {
            success: true,
            rewardGranted: false,
            alreadyClaimed: true,
            referralCount: currentCount,
            message: 'Referral reward has already been claimed for this milestone.',
          };
        }

        // 3. Count confirmed referrals
        const referralCode = user.referral_code as string | null;
        let confirmedCount = 0;
        if (referralCode) {
          const countRes = await tx.execute({
            sql: `SELECT COUNT(*) as count FROM users WHERE referred_by = ?`,
            args: [referralCode],
          });
          confirmedCount = Number(countRes.rows[0]?.count || 0);
        }

        // Eligibility rule: 3 confirmed referrals needed
        const requiredCount = 3;
        if (confirmedCount < requiredCount) {
          await tx.rollback();
          return {
            success: true,
            rewardGranted: false,
            alreadyClaimed: false,
            referralCount: confirmedCount,
            message: `You have ${confirmedCount} confirmed referral(s). ${requiredCount} referrals needed for 1 month free.`,
          };
        }

        // 4. Calculate new membership expiry
        // If user is currently active premium, extend by 30 days from current expiry. Otherwise, from now.
        const now = Date.now();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        const currentExpiry = typeof user.membership_expiry === 'number' ? user.membership_expiry : 0;
        const baseExpiry =
          user.membership_type === 'premium' && currentExpiry > now ? currentExpiry : now;
        const newExpiry = baseExpiry + thirtyDaysMs;

        // 5. Update user membership (preserves existing role: Admin, Mentor, etc.)
        await tx.execute({
          sql: `
            UPDATE users
            SET membership_type = 'premium',
                membership_expiry = ?,
                version = version + 1,
                updated_at = ?
            WHERE id = ?
          `,
          args: [newExpiry, now, userId],
        });

        // 6. Record the claim in referral_reward_claims ledger (UNIQUE constraint enforces milestone idempotency)
        const claimId = randomUUID();
        await tx.execute({
          sql: `
            INSERT INTO referral_reward_claims (
              id, user_id, milestone, referral_count, reward_type, granted_days, claimed_at
            ) VALUES (?, ?, ?, ?, 'premium_30_days', 30, ?)
          `,
          args: [claimId, userId, milestone, confirmedCount, now],
        });

        await tx.commit();

        return {
          success: true,
          rewardGranted: true,
          alreadyClaimed: false,
          referralCount: confirmedCount,
          message: 'Congratulations! 1 Month Premium reward granted based on 3+ confirmed referrals.',
          newExpiry,
        };
      } catch (innerErr: any) {
        try {
          await tx.rollback();
        } catch {
          // Rollback may already have occurred
        }
        throw innerErr;
      }
    } catch (err: any) {
      const errMsg = (err?.message || '').toLowerCase();

      // Check if error is unique constraint violation on referral_reward_claims (concurrent race)
      if (
        errMsg.includes('unique constraint') ||
        errMsg.includes('sqlite_constraint') ||
        errMsg.includes('constraint failed')
      ) {
        const count = await this.getReferralCount(userId).catch(() => 3);
        return {
          success: true,
          rewardGranted: false,
          alreadyClaimed: true,
          referralCount: count,
          message: 'Referral reward has already been claimed for this milestone.',
        };
      }

      // Check if SQLite is busy / locked due to concurrency and retry with jitter
      const isBusy = errMsg.includes('sqlite_busy') || errMsg.includes('database is locked');
      if (isBusy && maxRetries > 0) {
        const delay = Math.floor(Math.random() * 25) + 20; // 20-45ms
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.claimReferralReward(userId, milestone, maxRetries - 1);
      }

      throw err;
    }
  },
};
