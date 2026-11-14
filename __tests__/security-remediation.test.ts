import { NextRequest } from 'next/server';
import { POST as seedPost } from '../src/app/api/v1/admin/seed/route';
import { POST as grantXpPost } from '../src/app/api/gamification/grant-xp/route';
import { GET as adminRegistrationsGet } from '../src/app/api/v1/admin/events/[id]/registrations/route';
import { POST as adminMentorsPost } from '../src/app/api/v1/admin/mentors/route';
import { POST as eventsPost } from '../src/app/api/events/route';
import { POST as chatsPost } from '../src/app/api/chats/route';
import { POST as eventRegisterPost } from '../src/app/api/v1/events/[id]/register/route';
import { POST as mentorReviewPost } from '../src/app/api/v1/mentors/[id]/reviews/route';
import { verifyCronAuthorization } from '../src/lib/security/cron-auth';
import { db } from '../src/lib/turso/client';
import { usersRepository } from '../src/lib/turso/repositories/usersRepository';
import { eventsRepository } from '../src/lib/turso/repositories/eventsRepository';
import { mentorsRepository } from '../src/lib/turso/repositories/mentorsRepository';
import { sessionsRepository } from '../src/lib/turso/repositories/sessionsRepository';
import { POST as cancelSessionPost } from '../src/app/api/v1/mentoring/sessions/[id]/cancel/route';

describe('Security Remediation & Authority Enforcement', () => {
  const timestamp = Date.now();
  const testUserId = `sec_user_${timestamp}`;
  const testMentorUserId = `sec_mentor_user_${timestamp}`;
  const testEventId = `sec_event_${timestamp}`;
  const testMentorId = `sec_mentor_${timestamp}`;
  const testRequestId = `sec_req_${timestamp}`;
  let testSessionId = `sec_session_${timestamp}`;

  beforeAll(async () => {
    // 1. Seed a test student user in Turso
    await usersRepository.create({
      id: testUserId,
      email: `sec_test_${timestamp}@example.com`,
      full_name: 'Security Test User',
      role: 'Member',
    });

    // 2. Seed a test mentor user in Turso
    await usersRepository.create({
      id: testMentorUserId,
      email: `sec_mentor_${timestamp}@example.com`,
      full_name: 'Actual Mentor',
      role: 'Mentor',
    });

    // 3. Seed a test paid event in Turso
    await eventsRepository.upsert({
      id: testEventId,
      title: 'Paid Exclusive Tech Workshop',
      description: 'Exclusive event with ticket fee',
      date: '2026-12-01',
      time: '10:00 AM',
      duration_minutes: 60,
      price: 499,
      event_type: 'paid',
      category: 'workshop',
      is_active: 1,
      is_published: 1,
    });

    // 4. Seed a test mentor
    await mentorsRepository.upsert({
      id: testMentorId,
      user_id: testMentorUserId,
      full_name: 'Actual Mentor',
      email: `sec_mentor_${timestamp}@example.com`,
      title: 'Senior Engineer',
      hourly_rate: 1000,
    });

    // 5. Seed a test mentor request
    await db.execute({
      sql: `INSERT INTO mentor_requests (id, student_id, mentor_id, topic, status, created_at, updated_at)
            VALUES (?, ?, ?, 'Architecture Review', 'accepted', ?, ?)`,
      args: [testRequestId, testUserId, testMentorId, Date.now(), Date.now()],
    });

    // 6. Seed a test session
    const session = await sessionsRepository.create({
      request_id: testRequestId,
      mentor_id: testMentorId,
      student_id: testUserId,
      topic: 'Architecture Review',
      scheduled_date: '2026-12-01',
      start_time: '10:00 AM',
      end_time: '10:45 AM',
      duration_minutes: 45,
      performed_by: testMentorUserId,
    });
    testSessionId = session.id;
  });

  describe('1. Decommissioned Endpoints', () => {
    it('rejects POST to /api/v1/admin/seed with 410 Gone', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/seed', {
        method: 'POST',
      });
      const res = await seedPost(req);
      expect(res.status).toBe(410);
      const json = await res.json();
      expect(json.error).toContain('Decommissioned');
    });

    it('rejects POST to /api/gamification/grant-xp with 410 Gone', async () => {
      const req = new Request('http://localhost:3000/api/gamification/grant-xp', {
        method: 'POST',
        body: JSON.stringify({ userId: 'victim123', xpValue: 999999 }),
      });
      const res = await grantXpPost(req);
      expect(res.status).toBe(410);
      const json = await res.json();
      expect(json.error).toContain('Decommissioned');
    });
  });

  describe('2. Unauthenticated Admin Route Access Controls', () => {
    it('rejects unauthenticated GET to /api/v1/admin/events/[id]/registrations with 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/events/test_id/registrations');
      const res = await adminRegistrationsGet(req, { params: { id: 'test_id' } });
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated POST to /api/v1/admin/mentors with 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/mentors', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Hacker Mentor',
          role: 'Attacker',
          company: 'Exploit Corp',
          topics: ['Exploitation'],
        }),
      });
      const res = await adminMentorsPost(req);
      expect(res.status).toBe(401);
    });
  });

  describe('3. Public Event and Chat Endpoints Protection', () => {
    it('rejects unauthenticated POST to /api/events with 401', async () => {
      const req = new Request('http://localhost:3000/api/events', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Unvetted Event',
          description: 'Spam',
          date: '2026-12-01',
          type: 'workshop',
          seats: 50,
        }),
      });
      const res = await eventsPost(req);
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated POST to /api/chats with 401', async () => {
      const req = new Request('http://localhost:3000/api/chats', {
        method: 'POST',
        body: JSON.stringify({
          currentEmail: 'victim1@example.com',
          currentUserName: 'Victim 1',
          targetEmail: 'victim2@example.com',
          targetUserName: 'Victim 2',
        }),
      });
      const res = await chatsPost(req);
      expect(res.status).toBe(401);
    });
  });

  describe('4. Event Registration Identity & Payment Validation', () => {
    it('rejects unauthenticated event registration', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/events/${testEventId}/register`, {
        method: 'POST',
        body: JSON.stringify({
          userId: 'spoofed_user_id',
          name: 'Spoofed User',
        }),
      });
      const res = await eventRegisterPost(req, { params: { id: testEventId } });
      expect(res.status).toBe(401);
    });
  });

  describe('5. Mentor Review Authentication & Identity Binding', () => {
    it('rejects unauthenticated review submission with 401', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/mentors/${testMentorId}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          rating: 5,
          comment: 'Fabricated review',
          memberName: 'Fake Student',
          memberId: 'spoofed_student_id',
        }),
      });
      const res = await mentorReviewPost(req, { params: { id: testMentorId } });
      expect(res.status).toBe(401);
    });
  });

  describe('6. Timing-Safe CRON_SECRET Verification', () => {
    it('rejects missing or incorrect CRON_SECRET', () => {
      process.env.CRON_SECRET = 'super_secure_cron_secret_12345';

      const invalidReq1 = new Request('http://localhost:3000/api/cron/analytics');
      expect(verifyCronAuthorization(invalidReq1)).toBe(false);

      const invalidReq2 = new Request('http://localhost:3000/api/cron/analytics', {
        headers: { Authorization: 'Bearer wrong_secret' },
      });
      expect(verifyCronAuthorization(invalidReq2)).toBe(false);

      const validReq = new Request('http://localhost:3000/api/cron/analytics', {
        headers: { Authorization: 'Bearer super_secure_cron_secret_12345' },
      });
      expect(verifyCronAuthorization(validReq)).toBe(true);
    });
  });

  describe('7. Removal of Email Fallback in Mentoring Session Actions', () => {
    it('rejects cancellation from unauthenticated caller', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/mentoring/sessions/${testSessionId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Malicious cancel' }),
      });
      const res = await cancelSessionPost(req, { params: { id: testSessionId } });
      expect(res.status).toBe(401);
    });
  });
});
