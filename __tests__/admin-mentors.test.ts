import { NextRequest } from 'next/server';
import { db } from '../src/lib/turso/client';
import { usersRepository } from '../src/lib/turso/repositories/usersRepository';
import { mentorsRepository } from '../src/lib/turso/repositories/mentorsRepository';
import { authenticateUser, requireAdmin, requireMentor } from '../src/lib/auth';

// Route handlers under test
import { GET as adminMentorsGet, POST as adminMentorsPost } from '../src/app/api/v1/admin/mentors/route';
import { GET as adminMentorDetailGet, PATCH as adminMentorDetailPatch, DELETE as adminMentorDetailDelete } from '../src/app/api/v1/admin/mentors/[id]/route';
import { POST as resendInvitePost } from '../src/app/api/v1/admin/mentors/[id]/resend-invite/route';
import { GET as listInvitationsGet } from '../src/app/api/v1/admin/mentors/invitations/route';

// Mock Firebase Admin
jest.mock('@/lib/firebase/admin', () => {
  return {
    adminAuth: {
      verifyIdToken: jest.fn(),
      createUser: jest.fn(),
      generatePasswordResetLink: jest.fn(),
      deleteUser: jest.fn(),
      updateUser: jest.fn(),
      getUserByEmail: jest.fn(),
    },
    adminDb: {
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({ exists: false, data: () => null }),
          set: jest.fn().mockResolvedValue(true),
          update: jest.fn().mockResolvedValue(true),
        })),
      })),
    },
  };
});

// Mock virtual email dispatch to verify calls without side effects
jest.mock('@/lib/resend', () => ({
  sendEmail: jest.fn().mockResolvedValue({
    id: 'email_test_123',
    status: 'sent',
    virtual: true,
  }),
}));

import { adminAuth } from '@/lib/firebase/admin';
import { sendEmail } from '@/lib/resend';

describe('Admin Mentor Management & Provisioning Test Suite', () => {
  const ts = Date.now();
  const testAdminUid = `admin_test_uid_${ts}`;
  const testStudentUid = `student_test_uid_${ts}`;
  const createdMentorUids: string[] = [];
  const createdMentorIds: string[] = [];
  const createdEmails: string[] = [];

  beforeAll(async () => {
    // 1. Seed an authoritative Admin user in Turso
    await usersRepository.create({
      id: testAdminUid,
      email: `admin_${ts}@anx.club`,
      full_name: 'Test Administrator',
      role: 'Admin',
    });

    // 2. Seed a standard Member / Student user in Turso
    await usersRepository.create({
      id: testStudentUid,
      email: `student_${ts}@anx.club`,
      full_name: 'Test Student',
      role: 'Member',
    });
  });

  afterAll(async () => {
    try {
      // Clean up test data
      for (const email of createdEmails) {
        await db.execute({ sql: `DELETE FROM mentor_invitations WHERE email = ?`, args: [email] });
      }
      for (const mentorId of createdMentorIds) {
        await db.execute({ sql: `DELETE FROM mentor_invitations WHERE mentor_id = ?`, args: [mentorId] });
        await db.execute({ sql: `DELETE FROM mentors WHERE id = ?`, args: [mentorId] });
      }
      for (const uid of createdMentorUids) {
        await db.execute({ sql: `DELETE FROM users WHERE id = ?`, args: [uid] });
      }
      await db.execute({ sql: `DELETE FROM users WHERE id IN (?, ?)`, args: [testAdminUid, testStudentUid] });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for verifyIdToken: routes token to corresponding user
    (adminAuth.verifyIdToken as jest.Mock).mockImplementation(async (token: string) => {
      if (token === 'admin_token') {
        return { uid: testAdminUid, email: `admin_${ts}@anx.club` };
      }
      if (token === 'student_token') {
        return { uid: testStudentUid, email: `student_${ts}@anx.club` };
      }
      if (token.startsWith('mentor_token_')) {
        const uid = token.replace('mentor_token_', '');
        return { uid, email: `mentor_${uid}@anx.club` };
      }
      throw new Error('Invalid or unverified token');
    });

    // Default mock for createUser: generates a unique Firebase UID
    (adminAuth.createUser as jest.Mock).mockImplementation(async (data: { email: string; displayName?: string }) => {
      const generatedUid = `fb_uid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      createdMentorUids.push(generatedUid);
      createdEmails.push(data.email.toLowerCase().trim());
      return {
        uid: generatedUid,
        email: data.email,
        displayName: data.displayName,
      };
    });

    // Default mock for getUserByEmail (user does not exist yet)
    (adminAuth.getUserByEmail as jest.Mock).mockImplementation(async (email: string) => {
      const err: any = new Error('User not found');
      err.code = 'auth/user-not-found';
      throw err;
    });

    // Default mock for generatePasswordResetLink
    (adminAuth.generatePasswordResetLink as jest.Mock).mockImplementation(async (email: string) => {
      return `https://anx.club/login?mode=reset&email=${encodeURIComponent(email)}&token=mock_secure_token`;
    });
  });

  // ==========================================
  // SUITE 1: Authorization & Gate Enforcement
  // ==========================================
  describe('1. Security & Role Authorization Gates', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/mentors');
      const res = await adminMentorsGet(req);
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated POST requests with 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/mentors', {
        method: 'POST',
        body: JSON.stringify({ email: 'intruder@anx.club', fullName: 'Intruder' }),
      });
      const res = await adminMentorsPost(req);
      expect(res.status).toBe(401);
    });

    it('rejects student / member caller with 403 Forbidden', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/mentors', {
        method: 'POST',
        headers: { Authorization: 'Bearer student_token' },
        body: JSON.stringify({ email: 'intruder2@anx.club', fullName: 'Intruder 2' }),
      });
      const res = await adminMentorsPost(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error?.message || json.error).toMatch(/Admin authorization required/i);
    });

    it('rejects student attempting to access mentor invitations with 403', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/mentors/invitations', {
        headers: { Authorization: 'Bearer student_token' },
      });
      const res = await listInvitationsGet(req);
      expect(res.status).toBe(403);
    });

    it('rejects student attempting to patch mentor profile with 403', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/mentors/fake_id', {
        method: 'PATCH',
        headers: { Authorization: 'Bearer student_token' },
        body: JSON.stringify({ title: 'Hacked Title' }),
      });
      const res = await adminMentorDetailPatch(req, { params: { id: 'fake_id' } });
      expect(res.status).toBe(403);
    });

    it('rejects student attempting to resend invitation with 403', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/mentors/fake_id/resend-invite', {
        method: 'POST',
        headers: { Authorization: 'Bearer student_token' },
      });
      const res = await resendInvitePost(req, { params: { id: 'fake_id' } });
      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // SUITE 2: Mentor Account Provisioning
  // ==========================================
  describe('2. Mentor Account Provisioning Flow', () => {
    let newMentorId: string;
    let newMentorUid: string;
    const mentorEmail = `sarah.chen.${ts}@cloudscale.io`;

    it('successfully provisions a new mentor with Firebase Auth, Turso User, and Mentor profile', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/mentors', {
        method: 'POST',
        headers: { Authorization: 'Bearer admin_token' },
        body: JSON.stringify({
          fullName: 'Sarah Chen',
          email: mentorEmail,
          title: 'Principal Cloud Architect',
          company: 'CloudScale Systems',
          hourlyRate: 1500,
          skills: ['AWS', 'Kubernetes', 'Distributed Systems'],
          bio: 'Specialist in cloud architectures and high-throughput systems.',
          experienceYears: 10,
          isAvailable: true,
          isPremiumOnly: true,
        }),
      });

      const res = await adminMentorsPost(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
      expect(json.data.id).toBeDefined();
      expect(json.data.userId).toBeDefined();
      expect(json.data.fullName).toBe('Sarah Chen');
      expect(json.data.email).toBe(mentorEmail);
      expect(json.data.hourlyRate).toBe(1500);
      expect(json.data.invitationLink).toBeDefined();

      newMentorId = json.data.id;
      newMentorUid = json.data.userId;
      createdMentorIds.push(newMentorId);

      // Verify Firebase Auth createUser was invoked
      expect(adminAuth.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mentorEmail,
          displayName: 'Sarah Chen',
        })
      );

      // Verify Firebase password reset link was generated
      expect(adminAuth.generatePasswordResetLink).toHaveBeenCalledWith(
        mentorEmail,
        expect.any(Object)
      );

      // Verify email dispatch service was triggered
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mentorEmail,
          subject: expect.stringContaining('Mentor'),
        })
      );

      // Verify Authoritative User record in Turso
      const tursoUser = await usersRepository.getById(newMentorUid);
      expect(tursoUser).toBeDefined();
      expect(tursoUser?.email).toBe(mentorEmail);
      expect(tursoUser?.role).toBe('Mentor'); // Strict Turso role

      // Verify Authoritative Mentor record in Turso
      const tursoMentor = await mentorsRepository.getById(newMentorId);
      expect(tursoMentor).toBeDefined();
      expect(tursoMentor?.user_id).toBe(newMentorUid); // Strict foreign key link
      expect(tursoMentor?.title).toBe('Principal Cloud Architect');
      expect(tursoMentor?.company).toBe('CloudScale Systems');
      expect(tursoMentor?.is_available).toBe(1);
      expect(tursoMentor?.is_premium_only).toBe(1);

      // Verify invitation record in mentor_invitations
      const invitation = await mentorsRepository.getInvitationByMentorId(newMentorId);
      expect(invitation).toBeDefined();
      expect(invitation?.email).toBe(mentorEmail);
      expect(invitation?.status).toBe('pending');
      expect(invitation?.expires_at).toBeGreaterThan(Date.now());
    });

    it('rejects duplicate mentor creation with the same email (409 Conflict)', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/mentors', {
        method: 'POST',
        headers: { Authorization: 'Bearer admin_token' },
        body: JSON.stringify({
          fullName: 'Duplicate Sarah Chen',
          email: mentorEmail,
          title: 'Senior Engineer',
          company: 'CloudScale Systems',
        }),
      });

      const res = await adminMentorsPost(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/already exists/i);
    });

    it('rejects mentor creation with missing required fields (400 Bad Request)', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/mentors', {
        method: 'POST',
        headers: { Authorization: 'Bearer admin_token' },
        body: JSON.stringify({
          fullName: '', // empty name
          email: 'invalid-email', // invalid email
        }),
      });

      const res = await adminMentorsPost(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  // ==========================================
  // SUITE 3: Admin Listing & Auditing
  // ==========================================
  describe('3. Admin Mentor Listing & Audit Endpoints', () => {
    it('returns all mentors including user account and invitation details', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/mentors', {
        headers: { Authorization: 'Bearer admin_token' },
      });
      const res = await adminMentorsGet(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.count).toBeGreaterThan(0);

      // Ensure the newly created mentor is present with linked user and invitation data
      const found = json.data.find((m: any) => m.fullName === 'Sarah Chen');
      expect(found).toBeDefined();
      expect(found.role).toBe('Mentor');
      expect(found.invitationStatus).toBe('pending');
    });

    it('returns all invitations via /api/v1/admin/mentors/invitations', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/mentors/invitations', {
        headers: { Authorization: 'Bearer admin_token' },
      });
      const res = await listInvitationsGet(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.count).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // SUITE 4: Profile Modification & Deactivation
  // ==========================================
  describe('4. Mentor Profile Updates & Status Toggling', () => {
    it('allows admin to update mentor profile fields via PATCH', async () => {
      const mentorId = createdMentorIds[0];
      const req = new NextRequest(`http://localhost:3000/api/v1/admin/mentors/${mentorId}`, {
        method: 'PATCH',
        headers: { Authorization: 'Bearer admin_token' },
        body: JSON.stringify({
          title: 'Distinguished Fellow & VP',
          company: 'HyperScale Corp',
          hourlyRate: 2000,
          isAvailable: false,
        }),
      });

      const res = await adminMentorDetailPatch(req, { params: { id: mentorId } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.title).toBe('Distinguished Fellow & VP');
      expect(json.data.company).toBe('HyperScale Corp');
      expect(json.data.hourly_rate).toBe(2000);
      expect(json.data.is_available).toBe(0);
    });

    it('allows admin to safely deactivate mentor via DELETE', async () => {
      const mentorId = createdMentorIds[0];
      const req = new NextRequest(`http://localhost:3000/api/v1/admin/mentors/${mentorId}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer admin_token' },
      });

      const res = await adminMentorDetailDelete(req, { params: { id: mentorId } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      // Verify mentor availability in database is now 0 (deactivated)
      const updated = await mentorsRepository.getById(mentorId);
      expect(updated?.is_available).toBe(0);
    });
  });

  // ==========================================
  // SUITE 5: Invitation Reissue
  // ==========================================
  describe('5. Invitation Reissue Flow', () => {
    it('allows admin to re-send invitation with fresh link and expiration', async () => {
      const mentorId = createdMentorIds[0];
      const req = new NextRequest(`http://localhost:3000/api/v1/admin/mentors/${mentorId}/resend-invite`, {
        method: 'POST',
        headers: { Authorization: 'Bearer admin_token' },
      });

      const res = await resendInvitePost(req, { params: { id: mentorId } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.invitation).toBeDefined();
      expect(json.invitation.status).toBe('pending');
      expect(json.invitation.expiresAt).toBeGreaterThan(Date.now());

      // Verify email dispatch service was called again
      expect(sendEmail).toHaveBeenCalled();
    });
  });

  // ==========================================
  // SUITE 6: Persona & Authorization Verification
  // ==========================================
  describe('6. End-to-End Persona Verification', () => {
    it('authorizes the newly provisioned mentor with Mentor privileges', async () => {
      const mentorUid = createdMentorUids[0];
      const mentorId = createdMentorIds[0];

      const req = new Request('http://localhost:3000', {
        headers: { Authorization: `Bearer mentor_token_${mentorUid}` },
      });

      const authUser = await authenticateUser(req);
      expect(authUser).not.toBeNull();
      expect(authUser?.uid).toBe(mentorUid);
      expect(authUser?.role).toBe('Mentor'); // Strict Turso role
      expect(authUser?.mentorId).toBe(mentorId); // Resolves linked mentor profile

      // Verify requireMentor gate accepts this user
      const mentorGateRes = await requireMentor(req);
      expect('user' in mentorGateRes).toBe(true);
      if ('user' in mentorGateRes) {
        expect(mentorGateRes.user.uid).toBe(mentorUid);
        expect(mentorGateRes.mentor.id).toBe(mentorId);
      }
    });

    it('rejects student from passing requireMentor gate', async () => {
      const req = new Request('http://localhost:3000', {
        headers: { Authorization: 'Bearer student_token' },
      });

      const mentorGateRes = await requireMentor(req);
      expect('response' in mentorGateRes).toBe(true);
      if ('response' in mentorGateRes) {
        expect(mentorGateRes.response.status).toBe(403);
      }
    });
  });
});
