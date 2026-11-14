# ANX-CLUB — Full-Stack Platform

ANX-CLUB is a production-grade full-stack platform built with Next.js 14 (App Router), Turso/libSQL SQLite Edge Database, Firebase Authentication, Razorpay Payments, Google Calendar API with Google Meet integration, and Cloudflare Worker push notifications.

---

## 1. Architectural Architecture & Core Security Principles

```
  ┌────────────────────────┐
  │ Firebase Authentication│  ──►  WHO the user is (Cryptographic ID Token Verification)
  └────────────────────────┘
              │
              ▼
  ┌────────────────────────┐
  │ Next.js 14 API Routes  │  ──►  WHAT the user is allowed to do (Authorization & Business Logic)
  └────────────────────────┘
              │
              ▼
  ┌────────────────────────┐
  │  Turso / libSQL SQLite │  ──►  AUTHORITATIVE Application Database (Roles, Memberships,
  └────────────────────────┘      Mentors, Sessions, Payments, XP Ledger)
```

- **Identity vs Privilege**: Firebase verifies caller identity; Turso is the sole authority for application roles (`Member`, `Mentor`, `Admin`) and memberships (`free`, `premium`).
- **Zero Client Spoofing**: Client-supplied headers (`x-user-id`), Firestore roles, and email heuristics are strictly prohibited from granting privileges.
- **Fail-Closed Security**: Protected endpoints fail closed if Turso authorization lookups fail.
- **Anti-Downgrade Protection**: User provisioning is idempotent and prevents downgrading existing Admin, Mentor, or active premium statuses.
- **Token Encryption**: Google OAuth tokens stored for mentors are encrypted with AES-256-GCM via `TOKEN_ENCRYPTION_KEY`.

---

## 2. Key Features

### A. Authentication & User Provisioning
- Firebase email/password and Google OAuth login.
- Automatic server-side provisioning in Turso with role `Member` and membership `free`.
- Session persistence via secure HTTP-only cookies and Authorization headers.

### B. Mentoring Workflow (ACID State Machine)
1. **Student Request**: Student submits a mentoring request for a specific mentor and topic.
2. **Mentor Review**: Mentor receives the request and explicitly accepts or declines it (accepting does **not** auto-schedule).
3. **Explicit Scheduling**: Mentor selects date, time, and duration (e.g. 30m, 45m, 60m).
4. **Google Meet Creation**: If mentor has connected Google Calendar, a genuine Google Meet conference URL is extracted and bound to the session.
5. **Participant Actions**: Sessions can be rescheduled or cancelled with ownership checks.
6. **Completion & Gamification**: When mentor marks the session complete, the student is awarded +75 XP exactly once, transactionally enforced by `UNIQUE(user_id, action_type, source_ref_id)`.

### C. Razorpay Payments
- Membership Subscriptions: Monthly (₹149) and Annual (₹999).
- Mentoring Sessions: Server-calculated based on mentor's hourly rate and session duration.
- HMAC-SHA256 signature verification with timing-safe comparison.
- Real database verification: Paid event registrations verify payment in Turso `payments` table.

### D. Google Calendar & Google Meet
- Mentor-specific Google OAuth2 connection flow (`calendar.events` scope).
- CSRF protection via HMAC-signed, state cookie verification with one-time replay consumption in Turso `oauth_states`.
- Genuine Google Meet URLs extracted exclusively from Google Calendar API conference data.

### E. Cloudflare Worker + FCM Notifications
- Push notifications dispatched asynchronously via HMAC-SHA256 signed edge webhooks.
- In-app notification bell synced with Turso `mentoring_notifications`.

---

## 3. Database Infrastructure Setup

ANX-CLUB uses `@libsql/client`. It supports local SQLite for development and Turso Cloud (`libsql://...`) for production.

### A. Local SQLite Development Setup
1. Set `NODE_ENV=development` in `.env.local`.
2. Omit `TURSO_DATABASE_URL` (or set `TURSO_DATABASE_URL=file:anx_local.db`).
3. Run database initialization:
   ```bash
   npm run db:init
   ```
4. Seed development data (events and mentors):
   ```bash
   npm run db:seed
   ```

### B. Production Turso Setup
In production (`NODE_ENV=production`), cloud Turso is strictly required (local file databases are blocked):
1. Create a database on [Turso](https://turso.tech):
   ```bash
   turso db create anx-production
   turso db show anx-production --url
   turso db tokens create anx-production
   ```
2. Configure production environment variables:
   - `NODE_ENV=production`
   - `TURSO_DATABASE_URL=libsql://anx-production-<org>.turso.io`
   - `TURSO_AUTH_TOKEN=<your-turso-auth-token>`
   - `TOKEN_ENCRYPTION_KEY=<random-32-byte-hex-secret>`
3. Run schema initialization:
   ```bash
   npm run db:init
   ```

---

## 4. Commands & Scripts

### PowerShell Execution Commands (Windows)

```powershell
# 1. Install dependencies
npm install

# 2. Initialize database schema
npm run db:init

# 3. Seed development sample events & mentors
npm run db:seed

# 4. Create an administrator account
npm run create:admin

# 5. Run test suite (10 suites, 99 tests)
npm test

# 6. Run TypeScript compilation check
npx tsc --noEmit

# 7. Run ESLint check
npm run lint

# 8. Start development server
npm run dev

# 9. Create production build
npm run build
```

---

## 5. Security & Remediation Log

| Vulnerability / Requirement | Remediation Applied |
| :--- | :--- |
| **HTTP Database Seed Route** | Decommissioned `/api/v1/admin/seed` with 410 Gone. Moved seeding to development-only CLI script (`scripts/seed-db.ts`) with production lock. |
| **Direct Client XP Grants** | Decommissioned `/api/gamification/grant-xp` with 410 Gone. XP awards are strictly server-side through `xpRepository` and `sessionsRepository`. |
| **Admin Route Gaps** | Added `requireAdmin` to `/api/v1/admin/events/[id]/registrations`, `/api/v1/admin/mentors`, and `/api/v1/admin/events/[id]/approve`. |
| **Paid Event Ticket Spoofing** | Stripped `body.userId` fallback in `/api/v1/events/[id]/register`. Verifies real payment in Turso `paymentsRepository` before issuing paid tickets. |
| **Chat Spoofing** | Secured `/api/chats` and `/api/v1/chats` with `requireAuth` and verified participant email ownership. |
| **Email Heuristic Fallbacks** | Removed `mentorsRepository.getByEmail()` fallbacks from session cancel and reschedule routes. Only `getByUserId(user.uid)` is authorized. |
| **Admin Membership Dual-Write** | Synced `/api/v1/admin/users/update` to write to Turso `usersRepository.updateMembership()` and Firestore. |
| **OTP Rate Limiting** | In `/api/auth/verify-otp`, limited failed attempts to 5 before deleting the OTP. Expiration verified prior to attempt deduction. |
| **Cron Secret Comparison** | Implemented constant-time comparison in `src/lib/security/cron-auth.ts` via `crypto.timingSafeEqual`. |
| **Mentor Review Impersonation** | Bound `memberId` to authenticated `user.uid` in `/api/v1/mentors/[id]/reviews`. |
