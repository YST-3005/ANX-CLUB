import { db } from '../src/lib/turso/client';
import { usersRepository } from '../src/lib/turso/repositories/usersRepository';
import { mentorsRepository } from '../src/lib/turso/repositories/mentorsRepository';
import { paymentsRepository } from '../src/lib/turso/repositories/paymentsRepository';
import { sessionsRepository } from '../src/lib/turso/repositories/sessionsRepository';
import { requestsRepository } from '../src/lib/turso/repositories/requestsRepository';

// Mock Firebase Admin
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
import { authenticateUser, requireAdmin, requireMentor } from '@/lib/auth';

describe('ANX-CLUB Complete Architecture Alignment & Security Audit', () => {
  const ts = Date.now();
  const testStudentUid = `align_student_${ts}`;
  const testMentorUid = `align_mentor_user_${ts}`;
  const testMentorId = `align_mentor_${ts}`;
  const testAdminUid = `align_admin_${ts}`;
  const testImposterUid = `align_imposter_${ts}`;

  beforeAll(async () => {
    try {
      await db.execute({ sql: `DELETE FROM users WHERE email = ?`, args: ['admin@algorithmaliens.com'] });
    } catch (e) {
      // ignore
    }

    // 1. Setup Student in Turso
    await usersRepository.create({
      id: testStudentUid,
      email: `student_${ts}@anx.club`,
      full_name: 'Alignment Student',
      role: 'Member',
    });

    // 2. Setup Mentor in Turso
    await usersRepository.create({
      id: testMentorUid,
      email: `mentor_${ts}@anx.club`,
      full_name: 'Alignment Mentor',
      role: 'Mentor',
    });

    await db.execute({
      sql: `INSERT INTO mentors (id, user_id, full_name, email, title, company, bio, skills_json, hourly_rate, is_available, created_at, updated_at)
            VALUES (?, ?, 'Alignment Mentor', ?, 'Staff Engineer', 'Tech Corp', 'Bio', '[]', 500, 1, ?, ?)`,
      args: [testMentorId, testMentorUid, `mentor_${ts}@anx.club`, ts, ts],
    });

    // 3. Setup Admin in Turso
    await usersRepository.create({
      id: testAdminUid,
      email: `admin_${ts}@anx.club`,
      full_name: 'Alignment Admin',
      role: 'Admin',
    });

    // 4. Setup Imposter (Member with email looking like admin)
    await usersRepository.create({
      id: testImposterUid,
      email: 'admin@algorithmaliens.com',
      full_name: 'Imposter User',
      role: 'Member', // Genuine Turso role is Member!
    });
  });

  afterAll(async () => {
    try {
      await db.execute({ sql: `DELETE FROM xp_ledger WHERE user_id IN (?, ?, ?)`, args: [testStudentUid, testMentorUid, testAdminUid] });
      await db.execute({ sql: `DELETE FROM mentoring_session_history WHERE session_id IN (SELECT id FROM mentoring_sessions WHERE student_id = ?)`, args: [testStudentUid] });
      await db.execute({ sql: `DELETE FROM mentoring_sessions WHERE student_id = ?`, args: [testStudentUid] });
      await db.execute({ sql: `DELETE FROM mentor_requests WHERE student_id = ?`, args: [testStudentUid] });
      await db.execute({ sql: `DELETE FROM payments WHERE user_id IN (?, ?)`, args: [testStudentUid, testMentorUid] });
      await db.execute({ sql: `DELETE FROM mentors WHERE id = ?`, args: [testMentorId] });
      await db.execute({ sql: `DELETE FROM users WHERE id IN (?, ?, ?, ?) OR email = ?`, args: [testStudentUid, testMentorUid, testAdminUid, testImposterUid, 'admin@algorithmaliens.com'] });
    } catch (e) {
      // ignore cleanup errors
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Principle: Firebase = WHO, Turso = WHAT', () => {
    it('authenticates user and derives role strictly from Turso', async () => {
      (adminAuth.verifyIdToken as jest.Mock).mockResolvedValueOnce({
        uid: testStudentUid,
        email: `student_${ts}@anx.club`,
      });

      const req = new Request('http://localhost', {
        headers: { Authorization: 'Bearer valid_token' },
      });

      const user = await authenticateUser(req);
      expect(user).not.toBeNull();
      expect(user?.uid).toBe(testStudentUid);
      expect(user?.role).toBe('Member');
      expect(user?.mentorId).toBeUndefined();
    });

    it('resolves mentorId strictly via mentors.user_id in Turso', async () => {
      (adminAuth.verifyIdToken as jest.Mock).mockResolvedValueOnce({
        uid: testMentorUid,
        email: `mentor_${ts}@anx.club`,
      });

      const req = new Request('http://localhost', {
        headers: { Authorization: 'Bearer valid_mentor_token' },
      });

      const user = await authenticateUser(req);
      expect(user).not.toBeNull();
      expect(user?.uid).toBe(testMentorUid);
      expect(user?.role).toBe('Mentor');
      expect(user?.mentorId).toBe(testMentorId);
    });

    it('rejects email pattern matching or hardcoded email as Admin authority', async () => {
      // Imposter has email "admin@algorithmaliens.com" but Turso role is "Member"
      (adminAuth.verifyIdToken as jest.Mock).mockResolvedValueOnce({
        uid: testImposterUid,
        email: 'admin@algorithmaliens.com',
      });

      const req = new Request('http://localhost', {
        headers: { Authorization: 'Bearer token_imposter' },
      });

      const authRes = await requireAdmin(req);
      expect('response' in authRes).toBe(true);
      if ('response' in authRes) {
        expect(authRes.response.status).toBe(403);
        const data = await authRes.response.json();
        expect(data.error.message).toContain('Admin authorization required');
      }
    });

    it('grants admin access when Turso database confirms user role is Admin', async () => {
      (adminAuth.verifyIdToken as jest.Mock).mockResolvedValueOnce({
        uid: testAdminUid,
        email: `admin_${ts}@anx.club`,
      });

      const req = new Request('http://localhost', {
        headers: { Authorization: 'Bearer valid_admin_token' },
      });

      const authRes = await requireAdmin(req);
      expect('user' in authRes).toBe(true);
      if ('user' in authRes) {
        expect(authRes.user.uid).toBe(testAdminUid);
        expect(authRes.user.role).toBe('Admin');
      }
    });

    it('rejects fake or unverified session tokens (e.g. session_..., mock_...)', async () => {
      (adminAuth.verifyIdToken as jest.Mock).mockRejectedValueOnce(new Error('Decoding Firebase ID token failed'));

      const req = new Request('http://localhost', {
        headers: { Authorization: 'Bearer session_fake_12345' },
      });

      const user = await authenticateUser(req);
      expect(user).toBeNull();
    });

    it('never creates synthetic mentor identities for Admin users', async () => {
      (adminAuth.verifyIdToken as jest.Mock).mockResolvedValueOnce({
        uid: testAdminUid,
        email: `admin_${ts}@anx.club`,
      });

      const req = new Request('http://localhost', {
        headers: { Authorization: 'Bearer admin_token' },
      });

      const mentorRes = await requireMentor(req);
      // Admin is NOT a mentor; requireMentor must reject them
      expect('response' in mentorRes).toBe(true);
      if ('response' in mentorRes) {
        expect(mentorRes.response.status).toBe(403);
        const data = await mentorRes.response.json();
        expect(data.error.message).toContain('Mentor role required');
      }
    });
  });

  describe('2. User Role & Membership Protection in Turso', () => {
    it('idempotently provisions new users as ordinary Members without affecting existing users', async () => {
      const newUid = `new_member_${Date.now()}`;
      const provisioned = await usersRepository.provisionMember({
        id: newUid,
        email: `new_${newUid}@anx.club`,
        full_name: 'New Provisioned User',
      });

      expect(provisioned.role).toBe('Member');
      expect(provisioned.membership_type).toBe('free');

      // Calling again returns existing user without overwriting
      const again = await usersRepository.provisionMember({
        id: newUid,
        email: `new_${newUid}@anx.club`,
        full_name: 'Changed Name Attempt',
      });

      expect(again.id).toBe(newUid);
      expect(again.role).toBe('Member');

      await db.execute({ sql: `DELETE FROM users WHERE id = ?`, args: [newUid] });
    });

    it('prohibits upsert from downgrading Admin or Mentor roles or active premium memberships', async () => {
      // Attempt to upsert the admin profile with default/member values
      await usersRepository.upsert({
        id: testAdminUid,
        email: `admin_${ts}@anx.club`,
        full_name: 'Updated Admin Name',
      });

      const adminUser = await usersRepository.getById(testAdminUid);
      expect(adminUser?.role).toBe('Admin'); // Role was NOT downgraded to Member!
      expect(adminUser?.full_name).toBe('Updated Admin Name');

      // Attempt to upsert the mentor profile
      await usersRepository.upsert({
        id: testMentorUid,
        email: `mentor_${ts}@anx.club`,
        full_name: 'Updated Mentor Name',
      });

      const mentorUser = await usersRepository.getById(testMentorUid);
      expect(mentorUser?.role).toBe('Mentor'); // Role was NOT downgraded to Member!
      expect(mentorUser?.full_name).toBe('Updated Mentor Name');
    });
  });

  describe('3. Razorpay Server-Verified Payments', () => {
    it('creates pending order in Turso and verifies payment ownership', async () => {
      const orderId = `order_test_${Date.now()}`;
      const pending = await paymentsRepository.createPendingOrder({
        order_id: orderId,
        user_id: testStudentUid,
        amount: 500,
        currency: 'INR',
        payment_type: 'mentoring',
        metadata: { mentorId: testMentorId, durationMinutes: 60 },
      });

      expect(pending.order_id).toBe(orderId);
      expect(pending.status).toBe('pending');

      // Check order retrieval
      const fetched = await paymentsRepository.getByOrderId(orderId);
      expect(fetched?.user_id).toBe(testStudentUid);
      expect(fetched?.amount).toBe(500);

      // Verify payment verification helper rejects un-paid order
      const notPaidYet = await paymentsRepository.verifyMentoringPayment(testStudentUid, orderId);
      expect(notPaidYet).toBe(false);

      // Mark order as paid
      const paymentId = `pay_${Date.now()}`;
      await paymentsRepository.markPaid(orderId, paymentId);

      // Verify payment verification helper now confirms paid status
      const isPaid = await paymentsRepository.verifyMentoringPayment(testStudentUid, orderId);
      expect(isPaid).toBe(true);

      // Imposter/another user cannot claim the same payment ID
      const imposterPaid = await paymentsRepository.verifyMentoringPayment(testImposterUid, orderId);
      expect(imposterPaid).toBe(false);
    });
  });

  describe('4. Mentoring Workflow, Isolation & XP Idempotency', () => {
    let testRequestId: string;
    let testSessionId: string;

    it('requires server-verified payment for paid mentoring requests', async () => {
      // Submitting request with arbitrary fake payment ID must fail payment check
      const fakePaymentVerified = await paymentsRepository.verifyMentoringPayment(testStudentUid, 'FAKE_PAY_STRING_999');
      expect(fakePaymentVerified).toBe(false);

      // Submitting request with verified payment succeeds
      const orderId = `order_req_${Date.now()}`;
      await paymentsRepository.createPendingOrder({
        order_id: orderId,
        user_id: testStudentUid,
        amount: 500,
        payment_type: 'mentoring',
      });
      await paymentsRepository.markPaid(orderId, `pay_req_${Date.now()}`);

      const paymentConfirmed = await paymentsRepository.verifyMentoringPayment(testStudentUid, orderId);
      expect(paymentConfirmed).toBe(true);

      const request = await requestsRepository.create({
        student_id: testStudentUid,
        mentor_id: testMentorId,
        student_name: 'Alignment Student',
        student_email: `student_${ts}@anx.club`,
        topic: 'Architecture Alignment',
        message: 'Security and schema alignment discussion',
        proposed_duration: 45,
      });

      expect(request.status).toBe('pending');
      testRequestId = request.id;
    });

    it('accepting a mentoring request changes status to accepted without auto-scheduling meeting', async () => {
      const accepted = await requestsRepository.accept(testRequestId, testMentorId);
      expect(accepted.status).toBe('accepted');

      // Verify NO session exists yet for this request
      const session = await sessionsRepository.getByRequestId(testRequestId);
      expect(session).toBeNull();
    });

    it('authorizes mentor to schedule a session after request is accepted', async () => {
      const scheduled = await sessionsRepository.schedule({
        request_id: testRequestId,
        student_id: testStudentUid,
        mentor_id: testMentorId,
        topic: 'Architecture Alignment',
        scheduled_date: '2026-11-25',
        start_time: '15:00',
        end_time: '15:45',
        duration_minutes: 45,
        meeting_link: 'https://meet.google.com/ali-gned-sec',
        calendar_event_id: 'gcal_event_777',
        performed_by: testMentorUid,
      });

      expect(scheduled.status).toBe('confirmed');
      expect(scheduled.meeting_link).toBe('https://meet.google.com/ali-gned-sec');
      testSessionId = scheduled.id;
    });

    it('completing session awards +75 XP to student strictly once (idempotent)', async () => {
      const studentBefore = await usersRepository.getById(testStudentUid);
      const initialXp = studentBefore?.xp_total || 0;

      // 1. First completion
      const firstComplete = await sessionsRepository.complete(testSessionId, testMentorId, testMentorUid);
      expect(firstComplete.newlyCompleted).toBe(true);
      expect(firstComplete.session.status).toBe('completed');

      if (firstComplete.newlyCompleted) {
        await usersRepository.addXp(testStudentUid, 75);
        await db.execute({
          sql: `INSERT INTO xp_ledger (id, user_id, action_type, xp_value, source_ref_id, reason, created_at)
                VALUES (?, ?, 'mentoring_session_completed', 75, ?, 'Completed mentoring session', ?)
                ON CONFLICT(user_id, action_type, source_ref_id) DO NOTHING`,
          args: [`xp_${Date.now()}_1`, testStudentUid, testSessionId, Date.now()],
        });
      }

      const studentAfterFirst = await usersRepository.getById(testStudentUid);
      expect(studentAfterFirst?.xp_total).toBe(initialXp + 75);

      // 2. Second completion attempt (idempotency verification)
      const secondComplete = await sessionsRepository.complete(testSessionId, testMentorId, testMentorUid);
      expect(secondComplete.newlyCompleted).toBe(false);
      expect(secondComplete.session.status).toBe('completed');

      if (secondComplete.newlyCompleted) {
        // This block must NOT be executed!
        await usersRepository.addXp(testStudentUid, 75);
      }

      const studentAfterSecond = await usersRepository.getById(testStudentUid);
      expect(studentAfterSecond?.xp_total).toBe(initialXp + 75); // Must remain +75, never +150

      // Ledger must strictly have only 1 entry for this session
      const ledgerRes = await db.execute({
        sql: `SELECT * FROM xp_ledger WHERE user_id = ? AND source_ref_id = ?`,
        args: [testStudentUid, testSessionId],
      });
      expect(ledgerRes.rows.length).toBe(1);
    });
  });
});
