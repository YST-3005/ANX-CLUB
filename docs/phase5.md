# Phase 5: Real Google Calendar & Google Meet Integration

## 1. Goal
Implement production-grade, end-to-end Google Calendar and Google Meet integration via OAuth 2.0 with AES-256-GCM encrypted server-side token storage, authentic conference generation without fake links, lifecycle event synchronization (create, patch on reschedule/duration, delete on cancel), and resilient failure handling with on-demand retry capabilities.

---

## 2. Summary
Phase 5 neutralizes all fake meeting link generation and replaces it with Google Calendar API v3 and Google Meet. Mentors connect their Google account via a dedicated OAuth 2.0 offline consent flow. Refresh tokens are encrypted server-side using AES-256-GCM authenticated encryption and stored exclusively in a private Firestore collection (`mentorGoogleTokens`), never exposed to clients. When a session is scheduled, the platform creates a Google Calendar event with Hangouts/Google Meet conference data, polling Google's asynchronous conference creation pipeline until status is confirmed. If Google credentials are not configured or the mentor has not connected, the application degrades gracefully: meeting links remain strictly null (displaying "Pending" in UI), and a "Retry Google Meet" action is provided on the mentor dashboard.

---

## 3. Features Built
- **Dedicated Google Calendar OAuth 2.0 Flow:**
  - Standard OAuth 2.0 offline authorization flow requesting `https://www.googleapis.com/auth/calendar.events` and `https://www.googleapis.com/auth/userinfo.email`.
  - State parameter preserving mentor UID across OAuth redirects.
  - Automatic refresh token handling and reconnection detection on invalidation.
- **Server-Side AES-256-GCM Token Encryption:**
  - 256-bit encryption key derived securely from `GOOGLE_TOKEN_ENCRYPTION_KEY`.
  - 96-bit unique IV generated per encryption with 128-bit authentication tag to prevent ciphertext tampering.
  - Tokens stored exclusively in server-only Firestore collection `mentorGoogleTokens/{mentorId}`.
- **Authentic Google Meet Conference Generation:**
  - Creates calendar events with `conferenceDataVersion: 1` and `conferenceSolutionKey: { type: "hangoutsMeet" }`.
  - Includes both mentor and student as calendar attendees.
  - Asynchronous polling loop (up to 3 attempts with 600ms backoff) for pending conference creation.
  - Strictly requires `statusCode === 'success'` and authentic `hangoutLink` or video `entryPoint` before presenting a Meet link.
- **Full Lifecycle Synchronization:**
  - **Reschedule:** Calls `calendar.events.patch` on the exact same `googleEventId`. Never creates duplicates.
  - **Duration Change:** Calls `calendar.events.patch` updating event end time on the existing event.
  - **Cancellation:** Calls `calendar.events.delete` to remove the event from Google Calendar for both mentor and student.
  - **Retry:** Built `POST /api/v1/mentor/sessions/[id]/retry-google` allowing mentors to sync Google Meet after reconnecting.
- **Graceful Degradation:**
  - If Google OAuth credentials are not set in environment variables, the system runs safely without crashing, presenting "Google integration not configured" and keeping links pending.

---

## 4. Files Created
- `src/lib/google-auth.ts`:
  - Token encryption/decryption utilities (`encryptToken`, `decryptToken`).
  - OAuth2 client factory (`createOAuth2Client`, `getMentorOAuthClient`).
  - Secure token persistence (`saveMentorGoogleTokens`, `disconnectMentorGoogle`).
- `src/lib/google-calendar.ts`:
  - Calendar event creation (`createGoogleCalendarEvent`) with conference polling.
  - Event update (`patchGoogleCalendarEvent`) for reschedule and duration modifications.
  - Event deletion (`deleteGoogleCalendarEvent`) upon cancellation.
- `src/app/api/v1/google/connect/route.ts`:
  - Initiates OAuth consent redirect or returns consent URL JSON.
- `src/app/api/v1/google/callback/route.ts`:
  - Handles Google OAuth callback, exchanges authorization code for tokens, encrypts refresh token, and updates mentor status.
- `src/app/api/v1/google/status/route.ts`:
  - Returns Google connection status, synced email, and reconnect state.
- `src/app/api/v1/google/disconnect/route.ts`:
  - Revokes Google credentials and clears stored encrypted tokens.
- `src/app/api/v1/mentor/sessions/[id]/retry-google/route.ts`:
  - Enables mentors to retry Google Meet generation on pending or failed sessions.

---

## 5. Files Modified
- `package.json`:
  - Added `googleapis` dependency.
- `.env.example`:
  - Added `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_TOKEN_ENCRYPTION_KEY`, and `RESEND_API_KEY`.
- `src/types/mentoring.ts`:
  - Expanded `ConferenceStatus` (`'pending' | 'pending_scheduling' | 'scheduling_pending_google' | 'confirmed' | 'failed' | 'not_requested'`).
  - Expanded `SyncStatus` (`'pending' | 'synced' | 'failed' | 'not_connected'`).
- `src/app/api/v1/mentor/requests/[id]/schedule/route.ts`:
  - Integrated `createGoogleCalendarEvent` to generate Google Meet upon session scheduling.
  - Updated confirmation email to include verified Meet link or pending notice.
- `src/app/api/v1/mentor/sessions/[id]/reschedule/route.ts`:
  - Added `patchGoogleCalendarEvent` to synchronize date/time shifts with Google Calendar.
- `src/app/api/v1/mentor/sessions/[id]/duration/route.ts`:
  - Added `patchGoogleCalendarEvent` to synchronize session duration extensions with Google Calendar.
- `src/app/api/v1/mentor/sessions/[id]/cancel/route.ts`:
  - Added `deleteGoogleCalendarEvent` to remove cancelled sessions from Google Calendar.
- `src/app/api/v1/student/sessions/[id]/cancel/route.ts`:
  - Added `deleteGoogleCalendarEvent` when student initiates session cancellation.
- `src/app/(dashboard)/mentor-dashboard/page.tsx`:
  - Added "Retry Google Meet" button for sessions with pending or failed conference status.
  - Connected action toolbar to `/api/v1/mentor/sessions/[id]/retry-google`.
- `src/app/(dashboard)/mentor-dashboard/profile/page.tsx`:
  - Wired "Connect with Google" and "Disconnect Google" buttons to live API routes with loading states and toast notifications.

---

## 6. Firestore Changes
- **`mentorGoogleTokens/{mentorId}` Collection (Server-side Only):**
  - `mentorUid` (string): Mentor's user ID.
  - `encryptedRefreshToken` (string): AES-256-GCM ciphertext payload (`iv:tag:ciphertext`).
  - `encryptedAccessToken` (string, optional): AES-256-GCM ciphertext for current access token.
  - `expiryDate` (number, optional): Token expiration epoch timestamp.
  - `email` (string): Connected Google account email.
  - `updatedAt` (string): ISO 8601 timestamp.
- **`mentors/{mentorId}` & `users/{mentorId}` Document Updates:**
  - `googleCalendarConnected` (boolean): Flag indicating active Google integration.
  - `googleCalendarEmail` (string | null): Publicly visible connected email.
  - `googleCalendarNeedsReconnect` (boolean): Set to `true` if refresh token is invalidated or revoked.
- **`mentoringSessions/{sessionId}` Conference Fields:**
  - `googleEventId` (string | null): Google Calendar event ID.
  - `meetLink` (string | null): Verified Google Meet link (only when confirmed).
  - `conferenceStatus` (ConferenceStatus): `'confirmed' | 'failed' | 'pending_scheduling'`.
  - `syncStatus` (SyncStatus): `'synced' | 'failed' | 'not_connected'`.
  - `syncError` (string | null): Diagnostic error description from Google API.

---

## 7. API Endpoints
| Method | URL | Allowed Callers | Request Body / Query | Success Response | Error Responses |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/google/connect` | Mentor, Admin | Query: `format=json` (optional) | `{ url: string }` or HTTP 302 Redirect | `401 Unauthorized`, `503 Service Unavailable` |
| `GET` | `/api/v1/google/callback` | Google OAuth Redirection | Query: `code`, `state` | HTTP 302 Redirect to `/mentor-dashboard/profile?google=connected` | HTTP 302 Redirect with error params |
| `GET` | `/api/v1/google/status` | Mentor, Admin | None | `{ configured: boolean, connected: boolean, email: string \| null, needsReconnect: boolean }` | `401 Unauthorized` |
| `POST` | `/api/v1/google/disconnect` | Mentor, Admin | None | `{ success: true, message: string }` | `401 Unauthorized`, `500 Internal Error` |
| `POST` | `/api/v1/mentor/sessions/[id]/retry-google` | Mentor, Admin (Owner) | None | `{ success: boolean, message: string, data: MentoringSession }` | `401 Unauthorized`, `403 Forbidden`, `404 Not Found` |

---

## 8. Frontend Changes
- **Mentor Dashboard (`/mentor-dashboard`):**
  - Today/Next Session spotlight and Upcoming Sessions cards display verified Google Meet button when confirmed.
  - Displays "Retry Google Meet" button when Google sync is pending or failed.
  - Google Calendar integration banner informs mentors of connection state with 1-click link to profile settings.
- **Mentor Profile (`/mentor-dashboard/profile`):**
  - "Connect with Google" initiates OAuth 2.0 consent window.
  - "Disconnect Google" revokes access and resets Firestore status.
  - Shows connected Google email address and alerts if reconnection is needed.

---

## 9. Security Checks Added
- **AES-256-GCM Anti-Tamper Encryption:** Tokens cannot be read or forged without the server encryption key; tamper attempts fail authenticated tag verification.
- **Client Zero-Exposure Rule:** Refresh tokens and encrypted tokens are never transmitted to client devices or returned in any API response.
- **Strict IDOR Enforcement:** Google disconnect and retry routes strictly enforce that the caller owns the mentor profile or session.
- **Meeting Link Quarantine:** `meetLink` is never exposed or populated until Google API confirms successful conference creation with a valid video entry point.

---

## 10. Environment Variables
```env
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-google-oauth-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/google/callback
GOOGLE_TOKEN_ENCRYPTION_KEY=your-32-byte-hex-encryption-key-for-aes-256-gcm-64chars
```

---

## 11. Packages Added
- `googleapis`: Official Google API client library for Node.js (v3 Calendar API and v2 OAuth2 UserInfo).

---

## 12. How to Test Manually
1. **Google OAuth Connection:**
   - Log in as Mentor (`mentor1@anx.club`).
   - Navigate to `/mentor-dashboard/profile`.
   - Click "Connect with Google" (with valid `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`).
   - Complete Google consent screen; verify redirect to `/mentor-dashboard/profile?google=connected` with "Connected" badge.
2. **Scheduling Session with Google Meet:**
   - Go to `/mentor-dashboard`, find an accepted request in Inbox, click "Schedule Session".
   - Select date and time. Click "Confirm & Schedule Session".
   - Verify that session document has `conferenceStatus === 'confirmed'`, `syncStatus === 'synced'`, and authentic `meetLink`.
3. **Reschedule & Patch Event:**
   - On `/mentor-dashboard`, click "Reschedule" on an upcoming session.
   - Pick a new time. Submit. Verify Google Calendar event time updates automatically.
4. **Retry Google Meet on Unconnected Mentor:**
   - If scheduled without Google connected, verify status displays "Meet Link Pending" with "Retry Google Meet" button.
   - Connect Google account, click "Retry Google Meet", and verify the link confirms.

---

## 13. Tests and Results
- **TypeScript Static Verification:**
  - Ran `./node_modules/.bin/tsc.cmd --noEmit`.
  - Result: 0 errors across all routes, models, and UI pages.

---

## 14. Bugs Fixed
- Eliminated fake random Meet strings (`meet.google.com/anx-...`).
- Fixed type mismatch in Google OAuth client instance typing by exporting unified client type.
- Resolved missing `saving` and `toast` bindings in mentor profile settings.
- Corrected Firestore admin import reference (`adminDb` vs `db`).

---

## 15. Known Limitations / Deferred
- Google OAuth testing mode requires adding test user email addresses in Google Cloud Console. Tokens generated in testing mode expire after 7 days; production deployment requires publishing the OAuth consent screen.
- Synchronous calendar polling is capped at 3 attempts (1.8s) to prevent Next.js serverless execution timeouts.

---

## 16. Suggested Commit Messages
- `feat(phase5): implement real Google Calendar and Meet integration with encrypted OAuth tokens`
- `fix(phase5): enforce authentic Meet conference validation and patch/delete event lifecycle`
