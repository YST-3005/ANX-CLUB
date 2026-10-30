# A.N.X Platform — Mentoring & Student Ecosystem

Production-grade engineering leadership platform built with Next.js 14 App Router, TypeScript, Tailwind CSS, Firebase Auth & Firestore, Google Calendar & Meet OAuth 2.0 integration, and Resend email.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js:** v20.x or higher
- **npm:** v10.x or higher

### 2. Installation
```bash
git clone <repo-url>
cd ANX-CLUB
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env.local` and configure your credentials:
```bash
cp .env.example .env.local
```

Key environment variables:
```env
# Application
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Firebase Admin SDK (Server-Side)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Firebase Client SDK (Browser)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Google Calendar & Meet Integration (OAuth 2.0)
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-google-oauth-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/google/callback
GOOGLE_TOKEN_ENCRYPTION_KEY=your-32-byte-hex-encryption-key-for-aes-256-gcm-64chars

# Email (Resend)
RESEND_API_KEY=re_your_resend_api_key_here
EMAIL_FROM=notifications@anx.club

# Cron Security
CRON_SECRET=your-random-cron-secret-32-chars
```

### 4. Database Seeding (Development Only)
Populate Firestore with verified test accounts, mentors, sample requests, and scheduled sessions:
```bash
npm run seed:mentoring
```

*Note: `scripts/seed-mentoring.ts` will strictly refuse to run if `NODE_ENV === 'production'`.*

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Test Accounts

After running `npm run seed:mentoring`, you can log in with these pre-configured credentials:

| Role | Email | Password | Primary Workspace Route | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Student** | `student@anx.club` | `Password@123` | `/dashboard`, `/mentors/my-sessions` | Browse mentors, submit requests, view sessions, earn XP. |
| **Mentor 1** | `mentor1@anx.club` | `Password@123` | `/mentor-dashboard` | Accept/decline requests, schedule sessions, connect Google Calendar. |
| **Mentor 2** | `mentor2@anx.club` | `Password@123` | `/mentor-dashboard` | Multi-mentor testing, profile editing, availability setup. |
| **Admin** | `admin@anx.club` | `Password@123` | `/admin`, `/mentor-dashboard` | Administrative oversight, platform metrics, and full override. |

---

## 🛠️ Google Cloud Setup Guide (Google Calendar & Google Meet)

To enable live Google Calendar event creation and authentic Google Meet links:

1. **Google Cloud Console:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/) and create or select your project.
2. **Enable Google Calendar API:**
   - Navigate to **APIs & Services > Library**.
   - Search for **Google Calendar API** and click **Enable**.
3. **Configure OAuth Consent Screen:**
   - Navigate to **APIs & Services > OAuth consent screen**.
   - Select **External** and click **Create**.
   - Fill in app information: App name (`A.N.X Platform`), User support email, Developer contact email.
   - **Scopes:** Click **Add or Remove Scopes** and select:
     - `https://www.googleapis.com/auth/calendar.events` (Manage calendar events)
     - `https://www.googleapis.com/auth/userinfo.email` (View email address)
   - **Test Users:** Under **Test users**, add the Google email addresses of your test mentors (e.g. your personal Gmail).
   - *Important Notice on Testing Mode:* While the app is in "Testing" mode, Google refresh tokens expire after **7 days**. For permanent refresh tokens, publish the consent screen.
4. **Create OAuth 2.0 Credentials:**
   - Navigate to **APIs & Services > Credentials > Create Credentials > OAuth client ID**.
   - Application type: **Web application**.
   - **Authorized JavaScript origins:**
     - `http://localhost:3000`
     - `https://your-production-domain.vercel.app`
   - **Authorized redirect URIs:**
     - `http://localhost:3000/api/v1/google/callback`
     - `https://your-production-domain.vercel.app/api/v1/google/callback`
   - Copy the generated **Client ID** and **Client Secret** into `.env.local` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
5. **Token Encryption Key:**
   - Generate a 32-byte secret (e.g. `openssl rand -hex 32`) and paste it into `GOOGLE_TOKEN_ENCRYPTION_KEY`. All mentor refresh tokens are encrypted server-side with AES-256-GCM.

---

## 🧪 Testing & Verification

Run the comprehensive Jest test suite:
```bash
npm test
```
The test suite covers:
- **Gamification & XP:** 6-tier leadership ladder calculations (PRD v2.0).
- **Security & Anti-Tamper:** AES-256-GCM token encryption and authentication tag verification.
- **Scheduling Rules:** Duration bounds (15m–120m), past date prevention, and interval overlap collision checks.
- **IDOR Protection:** Student and mentor tenant isolation, preventing cross-tenant access.
- **Meet Link Masking:** Verifying that `meetLink` is never exposed until Google API confirms with a valid video conference entry point.

Run TypeScript verification:
```bash
./node_modules/.bin/tsc.cmd --noEmit
```

---

## 🔄 End-to-End Walkthrough Checklist

1. **Student Requests Mentoring:**
   - Log in as `student@anx.club`.
   - Go to `/mentors`. Search mentors, open "Request Mentorship" modal for Dr. Sarah Chen.
   - Fill in topic, message, and submit.
   - Verify request appears in "Requests in Review" on `/mentors/my-sessions`.
2. **Mentor Accepts Request:**
   - Log in as `mentor1@anx.club`.
   - Go to `/mentor-dashboard`. Request appears in "Requests in Inbox".
   - Click "Accept Request". Request transitions to `accepted_awaiting_scheduling` (no meeting is scheduled yet).
3. **Mentor Schedules Slot & Generates Meet Link:**
   - On `/mentor-dashboard`, click "Schedule Session".
   - Choose upcoming date, time, and 45 min duration. Click "Confirm & Schedule".
   - If Google Calendar is connected, a real Google Meet link is generated and session status becomes `confirmed`.
   - If Google Calendar is not yet connected, status displays "Meet Link Pending" with a "Retry Google Meet" button.
4. **Reschedule & Duration Modification:**
   - Click "Reschedule" on upcoming session. Enter new time. Verify session updates.
   - Click "Duration (45m)" and change to 60m. Verify update.
5. **Complete Session & XP Award:**
   - Click "Mark Complete (+75 XP)".
   - Student receives +75 XP idempotently, recorded in `xpLedger`.
   - Mentor's completed sessions count increments.
6. **IDOR & Access Security:**
   - Student navigating to `/mentor-dashboard` receives "Mentor Access Required" error.
   - Calling `/api/v1/student/requests/[other-id]/cancel` as an unrelated user returns `404 Not Found` without leaking resource existence.

---

## 📂 Architecture & Documentation Index

- `docs/phase1.md`: Baseline Codebase & Architectural Audit
- `docs/phase2.md`: Foundations, Data Models & IDOR Security
- `docs/phase3.md`: Student Dashboard & Sessions Portal
- `docs/phase4.md`: Mentor Dashboard, Inbox & Scheduling Actions
- `docs/phase5.md`: Real Google Calendar & Meet Integration via OAuth 2.0
- `docs/phase6.md`: Multi-Channel Notifications & Session Reminders Cron
- `docs/phase7.md`: Cross-Module Audit & Certificates Locker
- `docs/phase8.md`: Quality Assurance, Testing, Seed Scripts & Deployment
- `docs/INCOMPLETE_FEATURES.md`: Canonical Tracking Document for Deferred Modules
- `docs/CHANGELOG.md`: Full Changelog across all phases
