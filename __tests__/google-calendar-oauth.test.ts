import crypto from 'crypto';
import { NextRequest } from 'next/server';
import {
  encryptToken,
  decryptToken,
  signOAuthState,
  verifyOAuthState,
} from '../src/lib/security/encryption';
import {
  getGoogleAuthUrl,
  GOOGLE_CALENDAR_SCOPES,
  createGoogleMeetConference,
  updateGoogleCalendarMeeting,
  deleteGoogleCalendarMeeting,
} from '../src/lib/google/calendar';
import { db } from '../src/lib/turso/client';
import { mentorsRepository } from '../src/lib/turso/repositories/mentorsRepository';
import { usersRepository } from '../src/lib/turso/repositories/usersRepository';
import { oauthStatesRepository } from '../src/lib/turso/repositories/oauthStatesRepository';
import { GET as handleGoogleCallback } from '../src/app/api/auth/google/callback/route';

// Mock exchangeCodeForTokens so tests don't make real external Google HTTP requests
jest.mock('../src/lib/google/calendar', () => {
  const actual = jest.requireActual('../src/lib/google/calendar');
  return {
    ...actual,
    exchangeCodeForTokens: jest.fn(),
  };
});

import { exchangeCodeForTokens } from '../src/lib/google/calendar';

describe('Google Calendar OAuth2 Security Audit & Integration Tests', () => {
  const defaultKey = 'test-token-encryption-key-32-chars-long!';
  const ts = Date.now();
  const testUserIdA = `oauth_usr_a_${ts}`;
  const testMentorIdA = `oauth_mentor_a_${ts}`;
  const testUserIdB = `oauth_usr_b_${ts}`;
  const testMentorIdB = `oauth_mentor_b_${ts}`;
  const rawRefreshToken = '1//04test_refresh_token_from_google_oauth_exchange_abc123';
  const rawAccessToken = 'ya29.test_access_token_xyz987';

  beforeAll(async () => {
    process.env.TOKEN_ENCRYPTION_KEY = defaultKey;
    process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';

    // Ensure oauth states table exists
    await oauthStatesRepository.ensureTable();

    // Create Mentor A
    await usersRepository.create({
      id: testUserIdA,
      email: `mentor_a_${ts}@example.com`,
      full_name: 'OAuth Mentor A',
      role: 'mentor',
    });
    await db.execute({
      sql: `INSERT INTO mentors (id, user_id, full_name, email, title, company, bio, skills_json, is_available, created_at, updated_at)
            VALUES (?, ?, 'OAuth Mentor A', ?, 'Staff Engineer', 'Google', 'Bio', '["Go"]', 1, ?, ?)`,
      args: [testMentorIdA, testUserIdA, `mentor_a_${ts}@example.com`, ts, ts],
    });

    // Create Mentor B
    await usersRepository.create({
      id: testUserIdB,
      email: `mentor_b_${ts}@example.com`,
      full_name: 'OAuth Mentor B',
      role: 'mentor',
    });
    await db.execute({
      sql: `INSERT INTO mentors (id, user_id, full_name, email, title, company, bio, skills_json, is_available, created_at, updated_at)
            VALUES (?, ?, 'OAuth Mentor B', ?, 'Principal Architect', 'Stripe', 'Bio', '["Rust"]', 1, ?, ?)`,
      args: [testMentorIdB, testUserIdB, `mentor_b_${ts}@example.com`, ts, ts],
    });
  });

  afterAll(async () => {
    try {
      await db.execute({ sql: `DELETE FROM mentor_profiles WHERE id IN (?, ?)`, args: [testMentorIdA, testMentorIdB] });
      await db.execute({ sql: `DELETE FROM mentors WHERE id IN (?, ?)`, args: [testMentorIdA, testMentorIdB] });
      await db.execute({ sql: `DELETE FROM users WHERE id IN (?, ?)`, args: [testUserIdA, testUserIdB] });
    } catch {
      // ignore
    }
  });

  beforeEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = defaultKey;
    process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    jest.clearAllMocks();
  });

  describe('1. Token Encryption & Mandatory Key Validation', () => {
    it('encrypts and decrypts both refresh tokens and access tokens accurately', () => {
      const encryptedRefresh = encryptToken(rawRefreshToken);
      const encryptedAccess = encryptToken(rawAccessToken);

      expect(encryptedRefresh.startsWith('v1:')).toBe(true);
      expect(encryptedAccess.startsWith('v1:')).toBe(true);
      expect(encryptedRefresh).not.toContain(rawRefreshToken);
      expect(encryptedAccess).not.toContain(rawAccessToken);

      expect(decryptToken(encryptedRefresh)).toBe(rawRefreshToken);
      expect(decryptToken(encryptedAccess)).toBe(rawAccessToken);
    });

    it('fails securely when TOKEN_ENCRYPTION_KEY is missing (no hardcoded fallbacks)', () => {
      delete process.env.TOKEN_ENCRYPTION_KEY;

      // encryptToken must throw when key is absent
      expect(() => encryptToken(rawRefreshToken)).toThrow(/TOKEN_ENCRYPTION_KEY is required/);

      // decryptToken must fail securely and return null without crashing
      const validCipher = `v1:0123456789abcdef:0123456789abcdef:012345`;
      expect(decryptToken(validCipher)).toBeNull();

      // signOAuthState must throw
      expect(() => signOAuthState({ mentorId: testMentorIdA, userId: testUserIdA })).toThrow(
        /TOKEN_ENCRYPTION_KEY is required/
      );

      // verifyOAuthState must return null
      expect(verifyOAuthState('invalid.state')).toBeNull();
    });

    it('strictly rejects unencrypted legacy tokens (silent acceptance removed)', () => {
      const plaintext = 'legacy_plaintext_token_not_encrypted';
      const decrypted = decryptToken(plaintext);
      expect(decrypted).toBeNull();
    });

    it('rejects tampered ciphertexts and invalid auth tags', () => {
      const cipherText = encryptToken(rawRefreshToken);
      const parts = cipherText.split(':');
      // Tamper ciphertext payload
      parts[3] = parts[3].slice(0, -4) + 'ffff';
      const tampered = parts.join(':');

      expect(decryptToken(tampered)).toBeNull();
    });

    it('explicitly migrates legacy plaintext tokens in database', async () => {
      const legacyMentorId = `legacy_mentor_${Date.now()}`;
      await db.execute({
        sql: `INSERT INTO mentors (id, user_id, full_name, email, title, skills_json, created_at, updated_at)
              VALUES (?, NULL, 'Legacy Mentor', 'legacy@test.com', 'Dev', '[]', ?, ?)`,
        args: [legacyMentorId, Date.now(), Date.now()],
      });
      // Store unencrypted plaintext tokens directly
      await db.execute({
        sql: `INSERT INTO mentor_profiles (id, google_refresh_token, google_access_token, created_at, updated_at)
              VALUES (?, 'unencrypted_refresh_123', 'unencrypted_access_456', ?, ?)`,
        args: [legacyMentorId, Date.now(), Date.now()],
      });

      // Before migration: decryptToken on plaintext returns null
      const preRow = await mentorsRepository.getProfile(legacyMentorId);
      expect(decryptToken(preRow?.google_refresh_token)).toBeNull();

      // Run explicit migration
      const migrationRes = await mentorsRepository.migrateLegacyPlaintextTokens();
      expect(migrationRes.migratedCount).toBeGreaterThanOrEqual(1);

      // After migration: tokens are encrypted with v1: and decrypt properly
      const postRow = await mentorsRepository.getProfile(legacyMentorId);
      expect(postRow?.google_refresh_token?.startsWith('v1:')).toBe(true);
      expect(decryptToken(postRow?.google_refresh_token)).toBe('unencrypted_refresh_123');
      expect(decryptToken(postRow?.google_access_token)).toBe('unencrypted_access_456');

      // Clean up
      await db.execute({ sql: `DELETE FROM mentor_profiles WHERE id = ?`, args: [legacyMentorId] });
      await db.execute({ sql: `DELETE FROM mentors WHERE id = ?`, args: [legacyMentorId] });
    });
  });

  describe('2. CSRF & OAuth State Security', () => {
    it('generates a signed state and validates it successfully', () => {
      const state = signOAuthState({ mentorId: testMentorIdA, userId: testUserIdA });
      expect(state).toContain('.');

      const verified = verifyOAuthState(state);
      expect(verified).not.toBeNull();
      expect(verified?.mentorId).toBe(testMentorIdA);
      expect(verified?.userId).toBe(testUserIdA);
    });

    it('rejects tampered or forged state parameters', () => {
      const state = signOAuthState({ mentorId: testMentorIdA, userId: testUserIdA });
      const [payload] = state.split('.');
      const tamperedState = `${payload}.forgedsignature123`;

      expect(verifyOAuthState(tamperedState)).toBeNull();
    });

    it('rejects expired state tokens', () => {
      const expiredPayload = Buffer.from(
        JSON.stringify({
          mentorId: testMentorIdA,
          userId: testUserIdA,
          iat: Date.now() - 3600000,
          exp: Date.now() - 1000,
          nonce: 'testnonce',
        })
      ).toString('base64url');

      const sig = crypto.createHmac('sha256', defaultKey).update(expiredPayload).digest('base64url');
      const expiredState = `${expiredPayload}.${sig}`;

      expect(verifyOAuthState(expiredState)).toBeNull();
    });
  });

  describe('3. One-Time State Consumption & Replay Prevention', () => {
    it('consumes state on first attempt and rejects duplicate replay attempts', async () => {
      const state = signOAuthState({ mentorId: testMentorIdA, userId: testUserIdA });
      const verified = verifyOAuthState(state)!;
      expect(verified).not.toBeNull();

      // First consumption -> true
      const firstConsumption = await oauthStatesRepository.consume(state, verified);
      expect(firstConsumption).toBe(true);

      // Replay attempt with same state -> false
      const replayAttempt = await oauthStatesRepository.consume(state, verified);
      expect(replayAttempt).toBe(false);
    });
  });

  describe('4. Missing Google Credentials & Minimal Scopes', () => {
    it('requests minimal calendar permissions and offline consent', () => {
      const state = signOAuthState({ mentorId: testMentorIdA, userId: testUserIdA });
      const urlString = getGoogleAuthUrl(state);
      const url = new URL(urlString);

      expect(url.searchParams.get('access_type')).toBe('offline');
      expect(url.searchParams.get('prompt')).toBe('consent');
      expect(url.searchParams.get('state')).toBe(state);

      const scopes = decodeURIComponent(url.searchParams.get('scope') || '');
      expect(scopes).toContain('https://www.googleapis.com/auth/calendar.events');
      expect(scopes).toContain('https://www.googleapis.com/auth/userinfo.email');
      expect(scopes.split(' ')).not.toContain('https://www.googleapis.com/auth/calendar');
    });

    it('fails honestly when Google credentials are missing on server', () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
      delete process.env.GOOGLE_CALENDAR_CLIENT_ID;
      delete process.env.GOOGLE_CALENDAR_CLIENT_SECRET;

      const state = signOAuthState({ mentorId: testMentorIdA, userId: testUserIdA });
      expect(() => getGoogleAuthUrl(state)).toThrow(/credentials not configured/i);
    });
  });

  describe('5. OAuth Callback Security & Ownership Verification', () => {
    it('rejects callback if anx_google_oauth_state cookie is missing', async () => {
      const state = signOAuthState({ mentorId: testMentorIdA, userId: testUserIdA });
      const req = new NextRequest(`http://localhost:3000/api/auth/google/callback?code=mock_code&state=${state}`);
      // No cookie set

      const res = await handleGoogleCallback(req);
      expect(res.status).toBe(307);
      const location = res.headers.get('location') || '';
      expect(location).toContain('calendar=error');
      expect(location).toContain('Missing+state+cookie');
    });

    it('rejects callback if state cookie differs from returned state parameter', async () => {
      const stateA = signOAuthState({ mentorId: testMentorIdA, userId: testUserIdA });
      const stateB = signOAuthState({ mentorId: testMentorIdA, userId: testUserIdA });

      const req = new NextRequest(
        `http://localhost:3000/api/auth/google/callback?code=mock_code&state=${stateA}`,
        {
          headers: {
            cookie: `anx_google_oauth_state=${stateB}`,
          },
        }
      );

      const res = await handleGoogleCallback(req);
      expect(res.status).toBe(307);
      const location = res.headers.get('location') || '';
      expect(location).toContain('calendar=error');
      expect(location).toContain('State+cookie+mismatch');
    });

    it('rejects callback if state token has already been consumed (replay attack)', async () => {
      const state = signOAuthState({ mentorId: testMentorIdA, userId: testUserIdA });
      const verified = verifyOAuthState(state)!;

      // Manually consume state before callback arrives
      await oauthStatesRepository.consume(state, verified);

      const req = new NextRequest(
        `http://localhost:3000/api/auth/google/callback?code=mock_code&state=${state}`,
        {
          headers: {
            cookie: `anx_google_oauth_state=${state}`,
          },
        }
      );

      const res = await handleGoogleCallback(req);
      expect(res.status).toBe(307);
      const location = res.headers.get('location') || '';
      expect(location).toContain('calendar=error');
      expect(location).toContain('replay+detected');
    });

    it('rejects callback when state userId does not match mentor database owner', async () => {
      // Craft state with attacker user ID but targeting Mentor A
      const attackerUserId = `attacker_${Date.now()}`;
      const state = signOAuthState({ mentorId: testMentorIdA, userId: attackerUserId });

      const req = new NextRequest(
        `http://localhost:3000/api/auth/google/callback?code=mock_code&state=${state}`,
        {
          headers: {
            cookie: `anx_google_oauth_state=${state}`,
          },
        }
      );

      const res = await handleGoogleCallback(req);
      expect(res.status).toBe(307);
      const location = res.headers.get('location') || '';
      expect(location).toContain('calendar=error');
      expect(location).toContain('State+user+does+not+match+mentor+profile+owner');
    });

    it('preserves existing refresh token if Google omits it in response', async () => {
      // Setup Mentor A with an existing valid refresh token
      await mentorsRepository.saveGoogleOAuthTokens(testMentorIdA, {
        refreshToken: rawRefreshToken,
        accessToken: rawAccessToken,
      });

      const state = signOAuthState({ mentorId: testMentorIdA, userId: testUserIdA });

      // Mock Google returning new access token without a new refresh token
      (exchangeCodeForTokens as jest.Mock).mockResolvedValueOnce({
        access_token: 'new_access_token_only',
        expiry_date: Date.now() + 3600000,
        // refresh_token is omitted
      });

      const req = new NextRequest(
        `http://localhost:3000/api/auth/google/callback?code=mock_code&state=${state}`,
        {
          headers: {
            cookie: `anx_google_oauth_state=${state}`,
          },
        }
      );

      const res = await handleGoogleCallback(req);
      expect(res.status).toBe(307);
      const location = res.headers.get('location') || '';
      expect(location).toContain('calendar=connected');

      // Verify existing refresh token is preserved
      const profile = await mentorsRepository.getProfile(testMentorIdA);
      expect(decryptToken(profile?.google_refresh_token)).toBe(rawRefreshToken);
      expect(decryptToken(profile?.google_access_token)).toBe('new_access_token_only');
    });

    it('rejects connection if neither Google returns a refresh token nor an existing one exists', async () => {
      // Ensure Mentor B has NO prior tokens
      await mentorsRepository.clearGoogleOAuthTokens(testMentorIdB);

      const state = signOAuthState({ mentorId: testMentorIdB, userId: testUserIdB });

      // Mock Google returning access token without refresh token
      (exchangeCodeForTokens as jest.Mock).mockResolvedValueOnce({
        access_token: 'access_token_without_refresh',
      });

      const req = new NextRequest(
        `http://localhost:3000/api/auth/google/callback?code=mock_code&state=${state}`,
        {
          headers: {
            cookie: `anx_google_oauth_state=${state}`,
          },
        }
      );

      const res = await handleGoogleCallback(req);
      expect(res.status).toBe(307);
      const location = res.headers.get('location') || '';
      expect(location).toContain('calendar=error');
      expect(location).toContain('Google+did+not+provide+an+offline+refresh+token');

      // Account must NOT be marked as connected
      const isConnected = await mentorsRepository.isGoogleCalendarConnected(testMentorIdB);
      expect(isConnected).toBe(false);
    });
  });

  describe('6. Mentor Isolation & Storage Privacy', () => {
    it('ensures Mentor A credentials cannot be accessed or manipulated by Mentor B', async () => {
      // Mentor A connects their calendar
      await mentorsRepository.saveGoogleOAuthTokens(testMentorIdA, {
        refreshToken: rawRefreshToken,
        accessToken: rawAccessToken,
      });

      // Mentor B has no tokens
      await mentorsRepository.clearGoogleOAuthTokens(testMentorIdB);

      // Mentor A is connected, Mentor B is NOT
      expect(await mentorsRepository.isGoogleCalendarConnected(testMentorIdA)).toBe(true);
      expect(await mentorsRepository.isGoogleCalendarConnected(testMentorIdB)).toBe(false);

      // Mentor B profile has no access to Mentor A tokens
      const profileB = await mentorsRepository.getProfile(testMentorIdB);
      expect(profileB?.google_refresh_token || null).toBeNull();
    });
  });

  describe('7. Conference Handling & Revoked Credentials Handling', () => {
    it('returns honest pending_conference when mentor has not connected Google Calendar', async () => {
      const result = await createGoogleMeetConference({
        sessionId: 'test_session_unconnected',
        topic: 'System Design 1-on-1',
        scheduledDate: '2026-11-25',
        startTime: '10:00 AM',
        durationMinutes: 45,
        studentEmail: 'student@example.com',
        studentName: 'Student Alice',
        mentorEmail: `mentor_b_${ts}@example.com`,
        mentorName: 'OAuth Mentor B',
        mentorRefreshToken: null,
      });

      expect(result.conferenceStatus).toBe('pending_conference');
      expect(result.meetingLink).toBeNull();
      expect(result.errorMessage).toContain('Mentor has not connected their Google Calendar');
    });

    it('clears revoked tokens when invalid_grant is detected', async () => {
      // Setup Mentor A with tokens
      await mentorsRepository.saveGoogleOAuthTokens(testMentorIdA, {
        refreshToken: rawRefreshToken,
      });
      expect(await mentorsRepository.isGoogleCalendarConnected(testMentorIdA)).toBe(true);

      // Simulate a Google API call with invalid_grant error
      const mockCalendar = {
        events: {
          insert: jest.fn().mockRejectedValueOnce(new Error('invalid_grant: Bad Request')),
        },
      };

      const { google } = require('googleapis');
      jest.spyOn(google, 'calendar').mockReturnValueOnce(mockCalendar);

      const result = await createGoogleMeetConference({
        sessionId: 'test_session_revoked',
        topic: 'System Design Review',
        scheduledDate: '2026-11-25',
        startTime: '11:00 AM',
        durationMinutes: 60,
        studentEmail: 'student@example.com',
        studentName: 'Student Alice',
        mentorEmail: `mentor_a_${ts}@example.com`,
        mentorName: 'OAuth Mentor A',
        mentorId: testMentorIdA,
        mentorRefreshToken: encryptToken(rawRefreshToken),
      });

      expect(result.conferenceStatus).toBe('failed');
      expect(result.errorMessage).toContain('invalid_grant');

      // Tokens should be cleared from database
      expect(await mentorsRepository.isGoogleCalendarConnected(testMentorIdA)).toBe(false);
    });
  });
});
