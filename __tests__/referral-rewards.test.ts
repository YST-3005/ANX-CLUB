import { db } from '../src/lib/turso/client';
import { usersRepository } from '../src/lib/turso/repositories/usersRepository';
import { referralsRepository } from '../src/lib/turso/repositories/referralsRepository';
import { POST as referralProcessPost } from '../src/app/api/referrals/process/route';

// Mock Firebase Admin modules for API route auth
jest.mock('@/lib/firebase/admin', () => {
  return {
    adminAuth: {
      verifyIdToken: jest.fn(),
    },
    adminDb: {
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn(),
          set: jest.fn(),
          update: jest.fn(),
        })),
      })),
    },
  };
});

import { adminAuth } from '@/lib/firebase/admin';

describe('Referral Reward Claim Idempotency & Concurrency', () => {
  const ts = Date.now();
  const testUserA = `ref_user_a_${ts}`;
  const testUserB = `ref_user_b_${ts}`;
  const testMentorUser = `ref_mentor_u_${ts}`;
  const testExistingPremiumUser = `ref_prem_u_${ts}`;
  const codeA = `REF_A_${ts}`;
  const codeB = `REF_B_${ts}`;
  const codeMentor = `REF_M_${ts}`;
  const codePrem = `REF_P_${ts}`;

  beforeAll(async () => {
    await referralsRepository.ensureTable();

    // 1. Create User A (starts free, referral code REF_A)
    await usersRepository.create({
      id: testUserA,
      email: `user_a_${ts}@anxclub.com`,
      full_name: 'Referral User A',
      role: 'Member',
      referral_code: codeA,
      membership_type: 'free',
    });

    // 2. Create User B (for concurrency test)
    await usersRepository.create({
      id: testUserB,
      email: `user_b_${ts}@anxclub.com`,
      full_name: 'Referral User B',
      role: 'Member',
      referral_code: codeB,
      membership_type: 'free',
    });

    // 3. Create Mentor User (tests role preservation)
    await usersRepository.create({
      id: testMentorUser,
      email: `mentor_${ts}@anxclub.com`,
      full_name: 'Mentor Referral User',
      role: 'Mentor',
      referral_code: codeMentor,
      membership_type: 'free',
    });

    // 4. Create User with existing active premium (tests anti-downgrade extension)
    const existingExpiry = Date.now() + 20 * 24 * 60 * 60 * 1000; // 20 days remaining
    await usersRepository.create({
      id: testExistingPremiumUser,
      email: `prem_${ts}@anxclub.com`,
      full_name: 'Existing Premium User',
      role: 'Member',
      referral_code: codePrem,
      membership_type: 'premium',
      membership_expiry: existingExpiry,
    });
  });

  afterAll(async () => {
    try {
      await db.execute({
        sql: `DELETE FROM referral_reward_claims WHERE user_id IN (?, ?, ?, ?)`,
        args: [testUserA, testUserB, testMentorUser, testExistingPremiumUser],
      });
      await db.execute({
        sql: `DELETE FROM users WHERE id IN (?, ?, ?, ?) OR referred_by IN (?, ?, ?, ?)`,
        args: [testUserA, testUserB, testMentorUser, testExistingPremiumUser, codeA, codeB, codeMentor, codePrem],
      });
    } catch {
      // ignore cleanup errors
    }
  });

  describe('1. Insufficient Referrals Requirement (< 3)', () => {
    it('rejects reward claim when user has 0 referrals', async () => {
      const result = await referralsRepository.claimReferralReward(testUserA, '3_referrals');

      expect(result.success).toBe(true);
      expect(result.rewardGranted).toBe(false);
      expect(result.alreadyClaimed).toBe(false);
      expect(result.referralCount).toBe(0);
      expect(result.message).toContain('3 referrals needed');

      // Membership must remain free
      const user = await usersRepository.getById(testUserA);
      expect(user?.membership_type).toBe('free');
    });

    it('rejects reward claim when user has 2 referrals (insufficient)', async () => {
      // Add 2 referee users
      await usersRepository.create({
        id: `referee_1_${ts}`,
        email: `referee_1_${ts}@anx.com`,
        full_name: 'Referee One',
        role: 'Member',
        referred_by: codeA,
      });
      await usersRepository.create({
        id: `referee_2_${ts}`,
        email: `referee_2_${ts}@anx.com`,
        full_name: 'Referee Two',
        role: 'Member',
        referred_by: codeA,
      });

      const result = await referralsRepository.claimReferralReward(testUserA, '3_referrals');

      expect(result.success).toBe(true);
      expect(result.rewardGranted).toBe(false);
      expect(result.alreadyClaimed).toBe(false);
      expect(result.referralCount).toBe(2);
      expect(result.message).toContain('3 referrals needed');

      const user = await usersRepository.getById(testUserA);
      expect(user?.membership_type).toBe('free');
    });
  });

  describe('2. Successful Reward Claim (>= 3 confirmed referrals)', () => {
    it('grants 30-day premium reward when 3rd referral is confirmed', async () => {
      // Add 3rd referee user
      await usersRepository.create({
        id: `referee_3_${ts}`,
        email: `referee_3_${ts}@anx.com`,
        full_name: 'Referee Three',
        role: 'Member',
        referred_by: codeA,
      });

      const before = Date.now();
      const result = await referralsRepository.claimReferralReward(testUserA, '3_referrals');

      expect(result.success).toBe(true);
      expect(result.rewardGranted).toBe(true);
      expect(result.alreadyClaimed).toBe(false);
      expect(result.referralCount).toBe(3);
      expect(result.message).toContain('Congratulations! 1 Month Premium reward granted');

      // Verify user updated to premium
      const user = await usersRepository.getById(testUserA);
      expect(user?.membership_type).toBe('premium');
      expect(user?.membership_expiry).toBeGreaterThan(before + 29 * 24 * 60 * 60 * 1000);

      // Verify claim recorded in ledger
      const claim = await referralsRepository.getClaim(testUserA, '3_referrals');
      expect(claim).not.toBeNull();
      expect(claim?.milestone).toBe('3_referrals');
      expect(claim?.reward_type).toBe('premium_30_days');
      expect(claim?.granted_days).toBe(30);
    });
  });

  describe('3. Repeated Requests & Idempotency', () => {
    it('does NOT grant reward repeatedly or extend membership on subsequent calls', async () => {
      const userBefore = await usersRepository.getById(testUserA);
      const originalExpiry = userBefore?.membership_expiry;
      expect(originalExpiry).toBeDefined();

      // Second call
      const result2 = await referralsRepository.claimReferralReward(testUserA, '3_referrals');
      expect(result2.success).toBe(true);
      expect(result2.rewardGranted).toBe(false);
      expect(result2.alreadyClaimed).toBe(true);
      expect(result2.message).toContain('already been claimed');

      // Third call
      const result3 = await referralsRepository.claimReferralReward(testUserA, '3_referrals');
      expect(result3.rewardGranted).toBe(false);
      expect(result3.alreadyClaimed).toBe(true);

      // Verify membership expiry is identical and NOT repeatedly extended
      const userAfter = await usersRepository.getById(testUserA);
      expect(userAfter?.membership_expiry).toBe(originalExpiry);

      // Verify exactly 1 claim in database
      const claimsRes = await db.execute({
        sql: `SELECT COUNT(*) as count FROM referral_reward_claims WHERE user_id = ? AND milestone = ?`,
        args: [testUserA, '3_referrals'],
      });
      expect(Number(claimsRes.rows[0]?.count)).toBe(1);
    });
  });

  describe('4. Safe Handling of Concurrent Requests', () => {
    it('serializes concurrent claims and grants reward exactly once', async () => {
      // Add 3 referrals for User B
      for (let i = 1; i <= 3; i++) {
        await usersRepository.create({
          id: `referee_b_${i}_${ts}`,
          email: `referee_b_${i}_${ts}@anx.com`,
          full_name: `Referee B ${i}`,
          role: 'Member',
          referred_by: codeB,
        });
      }

      // Fire 5 concurrent claim requests
      const promises = [
        referralsRepository.claimReferralReward(testUserB, '3_referrals'),
        referralsRepository.claimReferralReward(testUserB, '3_referrals'),
        referralsRepository.claimReferralReward(testUserB, '3_referrals'),
        referralsRepository.claimReferralReward(testUserB, '3_referrals'),
        referralsRepository.claimReferralReward(testUserB, '3_referrals'),
      ];

      const results = await Promise.all(promises);

      // Exactly ONE request must grant the reward
      const grantedCount = results.filter((r) => r.rewardGranted === true).length;
      const alreadyClaimedCount = results.filter((r) => r.alreadyClaimed === true).length;

      expect(grantedCount).toBe(1);
      expect(alreadyClaimedCount).toBe(4);

      // Verify exactly ONE ledger record in the database
      const claimsRes = await db.execute({
        sql: `SELECT COUNT(*) as count FROM referral_reward_claims WHERE user_id = ? AND milestone = ?`,
        args: [testUserB, '3_referrals'],
      });
      expect(Number(claimsRes.rows[0]?.count)).toBe(1);

      // Verify membership expiry is extended by exactly 30 days (not 150 days)
      const userB = await usersRepository.getById(testUserB);
      expect(userB?.membership_type).toBe('premium');
      const maxExpectedExpiry = Date.now() + 31 * 24 * 60 * 60 * 1000;
      expect(userB?.membership_expiry).toBeLessThan(maxExpectedExpiry);
    }, 15000);
  });

  describe('5. Role Preservation & Anti-Downgrade Logic', () => {
    it('preserves Mentor role when claiming referral reward', async () => {
      // Add 3 referrals for mentor
      for (let i = 1; i <= 3; i++) {
        await usersRepository.create({
          id: `referee_m_${i}_${ts}`,
          email: `referee_m_${i}_${ts}@anx.com`,
          full_name: `Referee M ${i}`,
          role: 'Member',
          referred_by: codeMentor,
        });
      }

      const res = await referralsRepository.claimReferralReward(testMentorUser, '3_referrals');
      expect(res.rewardGranted).toBe(true);

      const mentorUser = await usersRepository.getById(testMentorUser);
      // Role MUST remain Mentor!
      expect(mentorUser?.role).toBe('Mentor');
      expect(mentorUser?.membership_type).toBe('premium');
    });

    it('extends existing active premium expiry rather than shortening it', async () => {
      const userBefore = await usersRepository.getById(testExistingPremiumUser);
      const originalExpiry = userBefore?.membership_expiry as number;

      // Add 3 referrals for user with existing premium
      for (let i = 1; i <= 3; i++) {
        await usersRepository.create({
          id: `referee_p_${i}_${ts}`,
          email: `referee_p_${i}_${ts}@anx.com`,
          full_name: `Referee P ${i}`,
          role: 'Member',
          referred_by: codePrem,
        });
      }

      const res = await referralsRepository.claimReferralReward(testExistingPremiumUser, '3_referrals');
      expect(res.rewardGranted).toBe(true);

      const userAfter = await usersRepository.getById(testExistingPremiumUser);
      // Expiry must be extended from originalExpiry by 30 days
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      expect(userAfter?.membership_expiry).toBe(originalExpiry + thirtyDaysMs);
    });
  });

  describe('6. POST /api/referrals/process Route Integration', () => {
    it('returns 401 when no auth token provided', async () => {
      const req = new Request('http://localhost:3000/api/referrals/process', {
        method: 'POST',
      });
      const res = await referralProcessPost(req);
      expect(res.status).toBe(401);
    });

    it('returns 200 with alreadyClaimed=true for User A via HTTP route', async () => {
      (adminAuth.verifyIdToken as jest.Mock).mockResolvedValueOnce({
        uid: testUserA,
        email: `user_a_${ts}@anxclub.com`,
      });

      const req = new Request('http://localhost:3000/api/referrals/process', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const res = await referralProcessPost(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.success).toBe(true);
      expect(data.userId).toBe(testUserA);
      expect(data.referralCount).toBe(3);
      expect(data.rewardGranted).toBe(false);
      expect(data.alreadyClaimed).toBe(true);
      expect(data.message).toContain('already been claimed');
    });
  });
});
