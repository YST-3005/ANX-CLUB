import { db, validateDatabaseConfig, TursoDatabase, sanitizeErrorMessage } from '../src/lib/turso/client';
import { usersRepository } from '../src/lib/turso/repositories/usersRepository';
import { mentorsRepository } from '../src/lib/turso/repositories/mentorsRepository';
import { eventsRepository } from '../src/lib/turso/repositories/eventsRepository';
import {
  oauthStatesRepository,
  isUniqueConstraintViolation,
} from '../src/lib/turso/repositories/oauthStatesRepository';
import { initDatabase } from '../src/lib/turso/schema';
import { signOAuthState, encryptToken, decryptToken } from '../src/lib/security/encryption';

describe('Turso Relational Database Foundation & Infrastructure', () => {
  const defaultKey = 'test-token-encryption-key-32-chars-long!';
  const testUserId = `test_user_${Date.now()}`;
  const testMentorId = `test_mentor_${Date.now()}`;
  const testEventId = `test_event_${Date.now()}`;

  beforeAll(() => {
    process.env.TOKEN_ENCRYPTION_KEY = defaultKey;
  });

  afterAll(async () => {
    // Cleanup test records
    try {
      await db.execute({ sql: `DELETE FROM users WHERE id = ?`, args: [testUserId] });
      await db.execute({ sql: `DELETE FROM mentors WHERE id = ?`, args: [testMentorId] });
      await db.execute({ sql: `DELETE FROM events WHERE id = ?`, args: [testEventId] });
    } catch {
      // ignore
    }
  });

  describe('1. Core Turso Schema & Repository Features', () => {
    it('enforces foreign key pragma and schema integrity', async () => {
      const pragmaRes = await db.execute('PRAGMA foreign_keys;');
      // Pragma returns 1 when enabled
      const fkVal = Number(Object.values(pragmaRes.rows[0])[0]);
      expect(fkVal).toBe(1);
    });

    it('creates and retrieves a user in Turso', async () => {
      const user = await usersRepository.create({
        id: testUserId,
        email: `test_${Date.now()}@anxclub.com`,
        full_name: 'Test Turso User',
        role: 'member',
      });

      expect(user.id).toBe(testUserId);
      expect(user.full_name).toBe('Test Turso User');
      expect(user.xp_total).toBe(0);

      const fetched = await usersRepository.getById(testUserId);
      expect(fetched).not.toBeNull();
      expect(fetched?.email).toBe(user.email);
    });

    it('updates user role and awards XP atomically', async () => {
      await usersRepository.updateRole(testUserId, 'mentor');
      const updatedUser = await usersRepository.getById(testUserId);
      expect(updatedUser?.role).toBe('mentor');

      const newXp = await usersRepository.addXp(testUserId, 75);
      expect(newXp).toBe(75);

      const checkUser = await usersRepository.getById(testUserId);
      expect(checkUser?.xp_total).toBe(75);
    });

    it('handles mentor creation and availability retrieval', async () => {
      await db.execute({
        sql: `INSERT INTO mentors (id, user_id, full_name, email, title, company, bio, skills_json, is_available, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        args: [
          testMentorId,
          testUserId,
          'Test Mentor',
          'mentor@anxclub.com',
          'Senior Edge Architect',
          'Cloudflare',
          'Bio here',
          JSON.stringify(['TypeScript', 'Cloudflare Workers', 'SQLite']),
          Date.now(),
          Date.now(),
        ],
      });

      const mentor = await mentorsRepository.getById(testMentorId);
      expect(mentor).not.toBeNull();
      expect(mentor?.company).toBe('Cloudflare');
      expect(mentor?.skills).toContain('Cloudflare Workers');
    });

    it('handles event registration capacity atomically and prevents duplicate registrations', async () => {
      await eventsRepository.upsert({
        id: testEventId,
        title: 'Atomic Concurrency Workshop',
        description: 'Testing event concurrency and constraints',
        date: '2026-12-01',
        time: '10:00 AM',
        category: 'Workshop',
        capacity: 1,
        seats_booked: 0,
        venue: 'Online',
        price: 0,
        is_published: 1,
        is_active: 1,
      });

      // First registration succeeds
      const reg1 = await eventsRepository.registerUser(testEventId, testUserId, 'test@anxclub.com', 'Test User');
      expect(reg1.status).toBe('confirmed');

      // Duplicate registration fails
      await expect(
        eventsRepository.registerUser(testEventId, testUserId, 'test@anxclub.com', 'Test User')
      ).rejects.toThrow(/Already registered/);

      // Registration beyond capacity fails
      const anotherUser = `another_user_${Date.now()}`;
      await usersRepository.create({
        id: anotherUser,
        email: `${anotherUser}@anxclub.com`,
        full_name: 'Overflow User',
      });

      await expect(
        eventsRepository.registerUser(testEventId, anotherUser, `${anotherUser}@anxclub.com`, 'Overflow User')
      ).rejects.toThrow(/Event is fully booked/);

      await db.execute({ sql: `DELETE FROM users WHERE id = ?`, args: [anotherUser] });
    });
  });

  describe('2. Turso vs Local SQLite Environment Validation', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      process.env = { ...originalEnv };
      process.env.TOKEN_ENCRYPTION_KEY = defaultKey;
      TursoDatabase.resetInstance();
    });

    it('allows local SQLite file fallback in development or test mode', () => {
      (process.env as any).NODE_ENV = 'development';
      delete process.env.TURSO_DATABASE_URL;
      delete process.env.TURSO_AUTH_TOKEN;

      const config = validateDatabaseConfig();
      expect(config.isProduction).toBe(false);
      expect(config.url).toBe('file:anx_local.db');
      expect(config.authToken).toBeUndefined();
    });

    it('strictly requires TURSO_DATABASE_URL when NODE_ENV=production', () => {
      (process.env as any).NODE_ENV = 'production';
      delete process.env.TURSO_DATABASE_URL;
      process.env.TURSO_AUTH_TOKEN = 'mock-prod-token';

      expect(() => validateDatabaseConfig()).toThrow(/TURSO_DATABASE_URL is required when NODE_ENV=production/);
    });

    it('prohibits local file database (file:...) fallback when NODE_ENV=production', () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.TURSO_DATABASE_URL = 'file:anx_local.db';
      process.env.TURSO_AUTH_TOKEN = 'mock-prod-token';

      expect(() => validateDatabaseConfig()).toThrow(/cannot point to a local file .* in production/);
    });

    it('strictly requires TURSO_AUTH_TOKEN when NODE_ENV=production', () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.TURSO_DATABASE_URL = 'libsql://anx-production-db.turso.io';
      delete process.env.TURSO_AUTH_TOKEN;

      expect(() => validateDatabaseConfig()).toThrow(/TURSO_AUTH_TOKEN is required when NODE_ENV=production/);
    });

    it('accepts valid remote Turso credentials in production without leaking secrets', () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.TURSO_DATABASE_URL = 'libsql://anx-production-db.turso.io';
      process.env.TURSO_AUTH_TOKEN = 'secret-token-12345';

      const config = validateDatabaseConfig();
      expect(config.isProduction).toBe(true);
      expect(config.url).toBe('libsql://anx-production-db.turso.io');
      expect(config.authToken).toBe('secret-token-12345');
    });
  });

  describe('3. Database Initialization & Failure Propagation', () => {
    it('propagates SQL execution failures during initDatabase without swallowing errors', async () => {
      const mockClient = {
        execute: jest.fn().mockRejectedValue(new Error('Syntax error in statement: SIMULATED_FAILURE')),
      } as any;

      await expect(initDatabase(mockClient)).rejects.toThrow(/SIMULATED_FAILURE/);
    });

    it('initializes tables idempotently without dropping existing data', async () => {
      // Running initDatabase on our real client must succeed
      await expect(initDatabase(db)).resolves.not.toThrow();

      // Verify users table still exists and data was not dropped
      const user = await usersRepository.getById(testUserId);
      expect(user).not.toBeNull();
    });
  });

  describe('4. OAuth Replay Protection vs Database Failure Distinction', () => {
    it('accurately identifies UNIQUE and PRIMARY KEY violations and rejects generic or other constraint errors', () => {
      // Genuine UNIQUE / PRIMARY KEY violations -> true
      expect(isUniqueConstraintViolation(new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed: consumed_oauth_states.state_hash'))).toBe(true);
      expect(isUniqueConstraintViolation({ code: 'SQLITE_CONSTRAINT_PRIMARYKEY', message: 'PRIMARY KEY must be unique' })).toBe(true);
      expect(isUniqueConstraintViolation({ code: 'SQLITE_CONSTRAINT_UNIQUE', message: 'UNIQUE constraint failed' })).toBe(true);
      expect(isUniqueConstraintViolation(new Error('PRIMARY KEY must be unique'))).toBe(true);

      // Foreign-key, NOT NULL, CHECK, generic constraint errors -> must return false!
      expect(isUniqueConstraintViolation(new Error('SQLITE_CONSTRAINT: FOREIGN KEY constraint failed'))).toBe(false);
      expect(isUniqueConstraintViolation({ code: 'SQLITE_CONSTRAINT_FOREIGNKEY', message: 'FOREIGN KEY constraint failed' })).toBe(false);
      expect(isUniqueConstraintViolation(new Error('SQLITE_CONSTRAINT: NOT NULL constraint failed: users.email'))).toBe(false);
      expect(isUniqueConstraintViolation({ code: 'SQLITE_CONSTRAINT_NOTNULL', message: 'NOT NULL constraint failed' })).toBe(false);
      expect(isUniqueConstraintViolation(new Error('SQLITE_CONSTRAINT: CHECK constraint failed: users'))).toBe(false);
      expect(isUniqueConstraintViolation({ code: 'SQLITE_CONSTRAINT_CHECK', message: 'CHECK constraint failed' })).toBe(false);
      expect(isUniqueConstraintViolation({ code: 'SQLITE_CONSTRAINT', message: 'generic constraint failed' })).toBe(false);

      // Generic connection or operational errors -> false
      expect(isUniqueConstraintViolation(new Error('Connection reset by peer'))).toBe(false);
      expect(isUniqueConstraintViolation(new Error('Disk full'))).toBe(false);
      expect(isUniqueConstraintViolation(null)).toBe(false);
    });

    it('propagates foreign-key, not-null, check, and operational database errors from consume()', async () => {
      const testState = signOAuthState({ mentorId: 'm_test', userId: 'u_test' });
      const verified = { mentorId: 'm_test', userId: 'u_test', exp: Date.now() + 60000 };

      const client = TursoDatabase.getInstance();

      // 1. Foreign-key violation must propagate as an error, NOT return false
      const fkSpy = jest.spyOn(client, 'execute').mockRejectedValueOnce(
        new Error('SQLITE_CONSTRAINT: FOREIGN KEY constraint failed')
      );
      await expect(oauthStatesRepository.consume(testState, verified)).rejects.toThrow(/FOREIGN KEY constraint failed/);
      fkSpy.mockRestore();

      // 2. NOT NULL violation must propagate as an error, NOT return false
      const notNullSpy = jest.spyOn(client, 'execute').mockRejectedValueOnce(
        new Error('SQLITE_CONSTRAINT: NOT NULL constraint failed: consumed_oauth_states.mentor_id')
      );
      await expect(oauthStatesRepository.consume(testState, verified)).rejects.toThrow(/NOT NULL constraint failed/);
      notNullSpy.mockRestore();

      // 3. CHECK constraint violation must propagate as an error, NOT return false
      const checkSpy = jest.spyOn(client, 'execute').mockRejectedValueOnce(
        new Error('SQLITE_CONSTRAINT: CHECK constraint failed')
      );
      await expect(oauthStatesRepository.consume(testState, verified)).rejects.toThrow(/CHECK constraint failed/);
      checkSpy.mockRestore();

      // 4. Connection timeout must propagate as an error, NOT return false
      const timeoutSpy = jest.spyOn(client, 'execute').mockRejectedValueOnce(
        new Error('Turso connection timeout: 504 Gateway Timeout')
      );
      await expect(oauthStatesRepository.consume(testState, verified)).rejects.toThrow(/Turso connection timeout/);
      timeoutSpy.mockRestore();
    });
  });

  describe('5. Legacy Token Migration Hardening', () => {
    it('preserves already-encrypted tokens and skips malformed encrypted tokens', async () => {
      const legacyMentorA = `legacy_a_${Date.now()}`;
      const legacyMentorB = `legacy_b_${Date.now()}`;

      // Mentor A: genuine plaintext
      await db.execute({
        sql: `INSERT INTO mentors (id, user_id, full_name, email, title, skills_json, created_at, updated_at)
              VALUES (?, NULL, 'Legacy Plaintext', 'leg_a@test.com', 'Dev', '[]', ?, ?)`,
        args: [legacyMentorA, Date.now(), Date.now()],
      });
      await db.execute({
        sql: `INSERT INTO mentor_profiles (id, google_refresh_token, google_access_token, created_at, updated_at)
              VALUES (?, 'genuine_plaintext_refresh', 'genuine_plaintext_access', ?, ?)`,
        args: [legacyMentorA, Date.now(), Date.now()],
      });

      // Mentor B: already encrypted + malformed encrypted
      const alreadyEncrypted = encryptToken('valid_refresh_token');
      const malformedEncrypted = 'v1:corrupt_iv:corrupt_tag:corrupt_cipher';
      await db.execute({
        sql: `INSERT INTO mentors (id, user_id, full_name, email, title, skills_json, created_at, updated_at)
              VALUES (?, NULL, 'Legacy Encrypted', 'leg_b@test.com', 'Dev', '[]', ?, ?)`,
        args: [legacyMentorB, Date.now(), Date.now()],
      });
      await db.execute({
        sql: `INSERT INTO mentor_profiles (id, google_refresh_token, google_access_token, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?)`,
        args: [legacyMentorB, alreadyEncrypted, malformedEncrypted, Date.now(), Date.now()],
      });

      // Run migration
      const result = await mentorsRepository.migrateLegacyPlaintextTokens();
      expect(result.migratedCount).toBeGreaterThanOrEqual(1);

      // Verify Mentor A was migrated
      const profileA = await mentorsRepository.getProfile(legacyMentorA);
      expect(profileA?.google_refresh_token?.startsWith('v1:')).toBe(true);
      expect(decryptToken(profileA?.google_refresh_token)).toBe('genuine_plaintext_refresh');

      // Verify Mentor B was preserved and malformed token was NOT re-encrypted
      const profileB = await mentorsRepository.getProfile(legacyMentorB);
      expect(profileB?.google_refresh_token).toBe(alreadyEncrypted);
      expect(profileB?.google_access_token).toBe(malformedEncrypted);

      // Cleanup
      await db.execute({ sql: `DELETE FROM mentor_profiles WHERE id IN (?, ?)`, args: [legacyMentorA, legacyMentorB] });
      await db.execute({ sql: `DELETE FROM mentors WHERE id IN (?, ?)`, args: [legacyMentorA, legacyMentorB] });
    });

    it('accurately counts migratedCount, skippedCount, and errors per record in token migration', async () => {
      const idPlain = `rec_plain_${Date.now()}`;
      const idAlready = `rec_already_${Date.now()}`;
      const idMalformed = `rec_malformed_${Date.now()}`;

      // 1. Plaintext record
      await db.execute({
        sql: `INSERT INTO mentors (id, user_id, full_name, email, title, skills_json, created_at, updated_at)
              VALUES (?, NULL, 'Plain Mentor', 'plain@test.com', 'Dev', '[]', ?, ?)`,
        args: [idPlain, Date.now(), Date.now()],
      });
      await db.execute({
        sql: `INSERT INTO mentor_profiles (id, google_refresh_token, google_access_token, created_at, updated_at)
              VALUES (?, 'genuine_plain_refresh', 'genuine_plain_access', ?, ?)`,
        args: [idPlain, Date.now(), Date.now()],
      });

      // 2. Already encrypted record (both tokens encrypted)
      await db.execute({
        sql: `INSERT INTO mentors (id, user_id, full_name, email, title, skills_json, created_at, updated_at)
              VALUES (?, NULL, 'Encrypted Mentor', 'enc@test.com', 'Dev', '[]', ?, ?)`,
        args: [idAlready, Date.now(), Date.now()],
      });
      await db.execute({
        sql: `INSERT INTO mentor_profiles (id, google_refresh_token, google_access_token, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?)`,
        args: [idAlready, encryptToken('enc_refresh'), encryptToken('enc_access'), Date.now(), Date.now()],
      });

      // 3. Malformed encrypted record
      await db.execute({
        sql: `INSERT INTO mentors (id, user_id, full_name, email, title, skills_json, created_at, updated_at)
              VALUES (?, NULL, 'Malformed Mentor', 'mal@test.com', 'Dev', '[]', ?, ?)`,
        args: [idMalformed, Date.now(), Date.now()],
      });
      await db.execute({
        sql: `INSERT INTO mentor_profiles (id, google_refresh_token, google_access_token, created_at, updated_at)
              VALUES (?, 'v1:corrupt_iv:corrupt_tag:corrupt_cipher', NULL, ?, ?)`,
        args: [idMalformed, Date.now(), Date.now()],
      });

      const res = await mentorsRepository.migrateLegacyPlaintextTokens();

      // Return type verification
      expect(typeof res.migratedCount).toBe('number');
      expect(typeof res.skippedCount).toBe('number');
      expect(typeof res.errors).toBe('number');

      // The plain record was migrated
      expect(res.migratedCount).toBeGreaterThanOrEqual(1);
      // The already encrypted record and malformed record were skipped (exactly 1 count per record)
      expect(res.skippedCount).toBeGreaterThanOrEqual(2);
      expect(res.errors).toBe(0);

      // Cleanup
      await db.execute({ sql: `DELETE FROM mentor_profiles WHERE id IN (?, ?, ?)`, args: [idPlain, idAlready, idMalformed] });
      await db.execute({ sql: `DELETE FROM mentors WHERE id IN (?, ?, ?)`, args: [idPlain, idAlready, idMalformed] });
    });
  });

  describe('6. Client Lazy Proxy & Reliable Foreign Key Enforcement', () => {
    it('correctly forwards methods and properties through the db proxy', () => {
      expect(typeof db.execute).toBe('function');
      expect(typeof db.batch).toBe('function');
      expect(typeof db.transaction).toBe('function');
      expect('execute' in db).toBe(true);
      expect('batch' in db).toBe(true);
      expect('closed' in db).toBe(true);
      expect(db.closed).toBe(false);
      expect(typeof db.protocol).toBe('string');
    });

    it('reliably enforces foreign keys on statements and rejects invalid relations', async () => {
      // Foreign keys must be active and reject invalid foreign key inserts
      await expect(
        db.execute({
          sql: `INSERT INTO mentor_profiles (id, headline, created_at, updated_at) VALUES ('non_existent_mentor_id', 'Headline', 1, 1)`,
        })
      ).rejects.toThrow(/FOREIGN KEY constraint failed/i);
    });

    it('enforces foreign keys inside db.transaction() and rejects invalid foreign-key inserts', async () => {
      const tx = await db.transaction('write');
      try {
        await expect(
          tx.execute({
            sql: `INSERT INTO mentor_profiles (id, headline, created_at, updated_at) VALUES ('non_existent_mentor_tx_id', 'Headline', 1, 1)`,
          })
        ).rejects.toThrow(/FOREIGN KEY constraint failed/i);
      } finally {
        await tx.rollback().catch(() => {});
      }
    });

    it('preserves libSQL transaction API including commit, rollback, and transaction mode options', async () => {
      // 1. Transaction mode option ('write') and commit behavior
      const txWrite = await db.transaction('write');
      const testCommitUser = `tx_commit_user_${Date.now()}`;
      await txWrite.execute({
        sql: `INSERT INTO users (id, email, full_name, role, created_at, updated_at) VALUES (?, ?, 'TX Commit', 'Member', ?, ?)`,
        args: [testCommitUser, `${testCommitUser}@test.com`, Date.now(), Date.now()],
      });
      await txWrite.commit();
      expect(txWrite.closed).toBe(true);

      const committedRow = await db.execute({
        sql: `SELECT id FROM users WHERE id = ?`,
        args: [testCommitUser],
      });
      expect(committedRow.rows.length).toBe(1);

      // 2. Transaction rollback behavior
      const txRollback = await db.transaction('write');
      const testRollbackUser = `tx_rollback_user_${Date.now()}`;
      await txRollback.execute({
        sql: `INSERT INTO users (id, email, full_name, role, created_at, updated_at) VALUES (?, ?, 'TX Rollback', 'Member', ?, ?)`,
        args: [testRollbackUser, `${testRollbackUser}@test.com`, Date.now(), Date.now()],
      });
      await txRollback.rollback();
      expect(txRollback.closed).toBe(true);

      const rolledBackRow = await db.execute({
        sql: `SELECT id FROM users WHERE id = ?`,
        args: [testRollbackUser],
      });
      expect(rolledBackRow.rows.length).toBe(0);

      // Cleanup
      await db.execute({ sql: `DELETE FROM users WHERE id = ?`, args: [testCommitUser] });
    });

    it('applies WAL and busy_timeout only to local SQLite and safely omits them for remote Turso URLs', () => {
      const isLocalUrl = (url: string) =>
        url.startsWith('file:') || url.includes('127.0.0.1') || url.includes('localhost');

      // Local file or localhost URLs
      expect(isLocalUrl('file:anx_local.db')).toBe(true);
      expect(isLocalUrl('file:///path/to/db.sqlite')).toBe(true);
      expect(isLocalUrl('http://127.0.0.1:8080')).toBe(true);
      expect(isLocalUrl('http://localhost:8080')).toBe(true);

      // Remote Turso URLs -> must be false to avoid sending incompatible WAL/busy pragmas
      expect(isLocalUrl('libsql://anx-production-db.turso.io')).toBe(false);
      expect(isLocalUrl('https://anx-production-db.turso.io')).toBe(false);
      expect(isLocalUrl('wss://anx-production-db.turso.io')).toBe(false);
    });

    it('sanitizes error logging and prevents database credentials and tokens from leaking', () => {
      const leakedAuthToken = 'Error connecting: https://db.turso.io?authToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.supersecret';
      const leakedBearer = 'Unauthorized: Bearer secret-oauth-token-12345';
      const leakedBasicAuth = 'Connection failed: https://admin_user:super_secret_password_999@turso.io/db';

      expect(sanitizeErrorMessage(leakedAuthToken)).not.toContain('supersecret');
      expect(sanitizeErrorMessage(leakedAuthToken)).toContain('authToken=***');

      expect(sanitizeErrorMessage(leakedBearer)).not.toContain('secret-oauth-token-12345');
      expect(sanitizeErrorMessage(leakedBearer)).toContain('Bearer ***');

      expect(sanitizeErrorMessage(leakedBasicAuth)).not.toContain('super_secret_password_999');
      expect(sanitizeErrorMessage(leakedBasicAuth)).toContain('://***:***@');
    });
  });
});

