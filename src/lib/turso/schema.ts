import { Client } from '@libsql/client';

export const DDL_SCHEMA = `
-- ============================================
-- 1. USERS & STUDENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  role TEXT NOT NULL DEFAULT 'Member',
  membership_type TEXT NOT NULL DEFAULT 'free',
  membership_expiry INTEGER,
  college_id TEXT,
  college_name TEXT,
  graduation_year TEXT,
  xp_total INTEGER NOT NULL DEFAULT 0,
  leadership_stage TEXT NOT NULL DEFAULT 'Member',
  avatar_url TEXT,
  bio TEXT,
  referral_code TEXT UNIQUE,
  referred_by TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_college ON users(college_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at);

-- ============================================
-- 2. EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  time TEXT,
  duration_minutes INTEGER DEFAULT 60,
  venue TEXT,
  is_online INTEGER NOT NULL DEFAULT 0,
  meeting_link TEXT,
  category TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'free',
  price REAL NOT NULL DEFAULT 0,
  premium_price REAL NOT NULL DEFAULT 0,
  capacity INTEGER NOT NULL DEFAULT 100,
  seats_booked INTEGER NOT NULL DEFAULT 0,
  registration_deadline TEXT,
  registration_type TEXT DEFAULT 'internal',
  external_registration_url TEXT,
  poster_url TEXT,
  speaker TEXT,
  speaker_bio TEXT,
  speaker_image TEXT,
  status TEXT NOT NULL DEFAULT 'Published',
  is_published INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  cancellation_reason TEXT,
  college_id TEXT,
  college_name TEXT,
  organizer_id TEXT NOT NULL DEFAULT 'system',
  version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status, is_published, is_active);
CREATE INDEX IF NOT EXISTS idx_events_updated_at ON events(updated_at);

-- ============================================
-- 3. EVENT REGISTRATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS event_registrations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  college TEXT,
  team_name TEXT,
  team_members TEXT,
  payment_status TEXT NOT NULL DEFAULT 'free',
  payment_id TEXT,
  order_id TEXT,
  amount REAL NOT NULL DEFAULT 0,
  ticket_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'confirmed',
  version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(event_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_reg_event ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_reg_user ON event_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_reg_updated_at ON event_registrations(updated_at);

-- ============================================
-- 4. MENTORS & PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS mentors (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  title TEXT NOT NULL,
  company TEXT,
  bio TEXT,
  avatar_url TEXT,
  hourly_rate REAL NOT NULL DEFAULT 0,
  rating REAL DEFAULT 5.0,
  review_count INTEGER DEFAULT 0,
  skills_json TEXT NOT NULL DEFAULT '[]',
  is_available INTEGER NOT NULL DEFAULT 1,
  is_premium_only INTEGER NOT NULL DEFAULT 0,
  experience_years INTEGER DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mentors_user ON mentors(user_id);
CREATE INDEX IF NOT EXISTS idx_mentors_available ON mentors(is_available);

CREATE TABLE IF NOT EXISTS mentor_profiles (
  id TEXT PRIMARY KEY REFERENCES mentors(id) ON DELETE CASCADE,
  headline TEXT,
  languages_json TEXT DEFAULT '["English"]',
  topics_json TEXT DEFAULT '[]',
  linkedin_url TEXT,
  github_url TEXT,
  twitter_url TEXT,
  google_refresh_token TEXT,
  google_access_token TEXT,
  google_token_expiry INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS mentor_availability (
  id TEXT PRIMARY KEY,
  mentor_id TEXT NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mentor_avail ON mentor_availability(mentor_id);

-- ============================================
-- 5. MENTOR REQUESTS TABLE (Workflow Stage 1)
-- ============================================
CREATE TABLE IF NOT EXISTS mentor_requests (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mentor_id TEXT NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'cancelled'
  decline_reason TEXT,
  is_paid INTEGER NOT NULL DEFAULT 0,
  amount REAL NOT NULL DEFAULT 0,
  payment_id TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mentor_requests_student ON mentor_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_mentor_requests_mentor ON mentor_requests(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_requests_status ON mentor_requests(status);

-- ============================================
-- 6. MENTORING SESSIONS TABLE (Workflow Stage 2)
-- ============================================
CREATE TABLE IF NOT EXISTS mentoring_sessions (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES mentor_requests(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mentor_id TEXT NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  description TEXT,
  scheduled_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  time_zone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  status TEXT NOT NULL DEFAULT 'confirmed', -- 'pending_conference', 'confirmed', 'rescheduled', 'cancelled', 'completed'
  calendar_event_id TEXT,
  meeting_link TEXT,
  cancellation_reason TEXT,
  cancelled_by TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_student ON mentoring_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_mentor ON mentoring_sessions(mentor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON mentoring_sessions(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON mentoring_sessions(status);

CREATE TABLE IF NOT EXISTS mentoring_session_history (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES mentoring_sessions(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  details_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_session_hist ON mentoring_session_history(session_id);

-- Legacy mentor_bookings table for backward compatibility
CREATE TABLE IF NOT EXISTS mentor_bookings (
  id TEXT PRIMARY KEY,
  mentor_id TEXT NOT NULL REFERENCES mentors(id),
  mentor_name TEXT NOT NULL,
  member_id TEXT NOT NULL REFERENCES users(id),
  member_name TEXT NOT NULL,
  member_email TEXT NOT NULL,
  topic TEXT NOT NULL,
  scheduled_date TEXT NOT NULL,
  scheduled_time TEXT NOT NULL,
  message TEXT,
  meeting_link TEXT,
  is_paid INTEGER NOT NULL DEFAULT 0,
  amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pending',
  version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mentor_bookings_member ON mentor_bookings(member_id);
CREATE INDEX IF NOT EXISTS idx_mentor_bookings_mentor ON mentor_bookings(mentor_id);

-- ============================================
-- 7. MEMBERSHIPS & PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS memberships (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  plan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  start_date INTEGER NOT NULL,
  end_date INTEGER NOT NULL,
  razorpay_payment_id TEXT,
  order_id TEXT,
  amount REAL NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  payment_type TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL,
  razorpay_signature TEXT,
  created_at INTEGER NOT NULL,
  verified_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);

-- ============================================
-- 8. GAMIFICATION XP LEDGER TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS xp_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  action_type TEXT NOT NULL,
  xp_value INTEGER NOT NULL,
  source_ref_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  awarded_by TEXT NOT NULL DEFAULT 'system',
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, action_type, source_ref_id)
);
CREATE INDEX IF NOT EXISTS idx_xp_user ON xp_ledger(user_id);

-- ============================================
-- 9. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS mentoring_notifications (
  id TEXT PRIMARY KEY,
  recipient_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  delivery_status TEXT NOT NULL DEFAULT 'sent',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notif_recipient ON mentoring_notifications(recipient_id);

-- ============================================
-- 10. DELTA SYNC TOMBSTONES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sync_tombstones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  deleted_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tombstones_deleted_at ON sync_tombstones(deleted_at);

-- ============================================
-- 11. AUDIT LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata_json TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- ============================================
-- 12. CONSUMED OAUTH STATES TABLE (Replay Protection)
-- ============================================
CREATE TABLE IF NOT EXISTS consumed_oauth_states (
  state_hash TEXT PRIMARY KEY,
  mentor_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  consumed_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_consumed_states_exp ON consumed_oauth_states(expires_at);

-- ============================================
-- 13. REFERRAL REWARD CLAIMS TABLE (Idempotent Rewards)
-- ============================================
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
CREATE INDEX IF NOT EXISTS idx_referral_claims_user ON referral_reward_claims(user_id);

-- ============================================
-- 14. MENTOR INVITATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS mentor_invitations (
  id TEXT PRIMARY KEY,
  mentor_id TEXT NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invitation_link TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'expired'
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mentor_invitations_email ON mentor_invitations(email);
CREATE INDEX IF NOT EXISTS idx_mentor_invitations_status ON mentor_invitations(status);
`;

export async function initDatabase(client: Client): Promise<void> {
  const statements = DDL_SCHEMA.split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    try {
      await client.execute(statement);
    } catch (err: any) {
      console.error(`[initDatabase] Error executing statement:\n${statement}\nError:`, err?.message || err);
      throw err;
    }
  }
}
