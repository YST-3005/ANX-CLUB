# Phase 6: Notifications & Transactional Emails

## 1. Goal
Implement a resilient, multi-channel transactional notification and email system covering every stage of the mentoring workflow (request submitted, accepted, declined, session scheduled, rescheduled, duration updated, cancelled, and completed with +75 XP), paired with an idempotent 24-hour and 1-hour automated reminder mechanism, fail-safe delivery, and Firestore delivery logging.

---

## 2. Summary
Phase 6 connects the mentoring lifecycle events with in-app notification center alerts and Resend transactional emails. The email dispatch layer (`src/lib/resend.ts`) was overhauled to support live Resend API delivery when `RESEND_API_KEY` is provided, while falling back gracefully to virtual delivery without throwing exceptions or interrupting database transactions. Every email dispatch is recorded in a new Firestore collection (`emailLogs`) with delivery status (`delivered`, `virtual`, or `failed`). Furthermore, an automated session reminder cron route (`GET /api/v1/cron/session-reminders`) was developed to dispatch 24h and 1h alerts to students and mentors with idempotency safeguards (`reminder24hSent` and `reminder1hSent` flags).

---

## 3. Features Built
- **Comprehensive Lifecycle Event Triggers:**
  - **Request Submitted:** In-app notification to mentor + email notification to mentor and student.
  - **Request Accepted:** In-app notification to student + email notification informing student that scheduling will follow.
  - **Request Declined:** In-app notification to student with decline reason + email notification with suggestions to browse other mentors.
  - **Session Scheduled:** In-app notification to student + confirmation email to student with verified Google Meet link (only when confirmed; otherwise pending sync notice).
  - **Session Rescheduled:** In-app notification to student + update email with new date/time.
  - **Duration Changed:** In-app notification to student reflecting updated session length.
  - **Session Cancelled:** In-app notification + cancellation email with reason to the opposite party.
  - **Session Completed:** In-app notification + congratulatory email celebrating completion and +75 XP awarded.
- **Fail-Safe Email Dispatcher with Audit Logging:**
  - Dual-mode dispatcher: live HTTP POST to `https://api.resend.com/emails` when credentials exist, or virtual structured delivery.
  - Non-blocking try-catch wrappers prevent communication failures from rolling back core session states.
  - Persistent logging of every outbound communication in `emailLogs` collection.
- **Automated Session Reminders (Cron Worker):**
  - Secured via `CRON_SECRET` header or query parameter.
  - **24-Hour Reminder:** Dispatched when session start time is between 23h and 25h away.
  - **1-Hour Reminder:** Dispatched with urgent status and verified Google Meet link when session start is between 45m and 75m away.
  - Idempotent execution: marks `reminder24hSent = true` and `reminder1hSent = true` to prevent duplicate alerts.

---

## 4. Files Created
- `src/app/api/v1/cron/session-reminders/route.ts`:
  - Secured cron route that scans scheduled sessions and dispatches 24-hour and 1-hour email and in-app reminders.

---

## 5. Files Modified
- `src/lib/resend.ts`:
  - Upgraded to support live Resend API dispatch, virtual fallback, and Firestore audit logging in `emailLogs`.
- `src/app/api/v1/mentors/[id]/book/route.ts`:
  - Added mentor email dispatch on new booking requests.
- `src/app/api/v1/mentor/sessions/[id]/duration/route.ts`:
  - Added in-app notification to student when session duration is changed.
- `src/app/api/v1/mentor/requests/[id]/schedule/route.ts`:
  - Conditioned email template to show verified Google Meet link only upon Google API confirmation.

---

## 6. Firestore Changes
- **`emailLogs/{emailId}` Collection (New):**
  - `id` (string): Unique email dispatch ID.
  - `to` (string): Recipient email address.
  - `from` (string): Sender address.
  - `subject` (string): Subject line.
  - `status` (string): `'delivered' | 'virtual' | 'failed'`.
  - `virtual` (boolean): Whether virtual fallback was used.
  - `error` (string | null): Error details if failed.
  - `createdAt` (string): ISO 8601 timestamp.
- **`mentoringSessions/{sessionId}` Reminder Fields:**
  - `reminder24hSent` (boolean): Flag preventing duplicate 24-hour reminders.
  - `reminder1hSent` (boolean): Flag preventing duplicate 1-hour reminders.

---

## 7. API Endpoints
| Method | URL | Allowed Callers | Request Body / Query | Success Response | Error Responses |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/cron/session-reminders` | Cron Runner, System | Header: `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret` | `{ success: true, processedSessions: number, reminders24hSent: number, reminders1hSent: number, timestamp: string }` | `401 Unauthorized`, `503 Service Unavailable` |

---

## 8. Frontend Changes
- Notifications generated across all mentoring lifecycle events are surfaced in real-time in the `DashboardHeader` notification bell dropdown.
- Unread counter increments immediately upon event triggers and decrements when marked as read via `PATCH /api/v1/notifications`.

---

## 9. Security Checks Added
- **Cron Authentication:** `GET /api/v1/cron/session-reminders` is protected by `CRON_SECRET` to prevent unauthorized resource exhaustion or notification spam.
- **Recipient Email Sanitization:** Email addresses are normalized and validated before dispatch.
- **Non-Blocking Architecture:** Notification and email dispatch logic is isolated in individual try-catch blocks to guarantee zero side effects on transaction integrity.

---

## 10. Environment Variables
```env
RESEND_API_KEY=re_your_resend_api_key_here
EMAIL_FROM=notifications@anx.club
CRON_SECRET=your-random-cron-secret-32-chars
```

---

## 11. Packages Added
- None (native `fetch` is used for Resend API communication to keep bundle light and dependency-free).

---

## 12. How to Test Manually
1. **Request Lifecycle Notifications:**
   - As student, submit a mentoring request on `/mentors`.
   - Log in as mentor; verify in-app notification appears in the notification bell.
   - Accept the request; log in as student; verify acceptance notification appears.
   - Schedule the session; verify student receives session scheduled notification and email log is created in `emailLogs`.
2. **Reminder Cron Execution:**
   - Call `GET /api/v1/cron/session-reminders` with header `Authorization: Bearer <CRON_SECRET>`.
   - Verify JSON response returns `{ success: true, processedSessions: N, reminders24hSent: X, reminders1hSent: Y }`.
   - Re-running the request immediately returns 0 reminders sent due to idempotency flags.

---

## 13. Tests and Results
- **TypeScript Static Verification:**
  - Ran `./node_modules/.bin/tsc.cmd --noEmit`.
  - Result: 0 errors across all routes and services.

---

## 14. Bugs Fixed
- Missing mentor email notification on initial request submission.
- Missing student in-app notification on session duration updates.
- Absence of delivery tracking logs for outbound emails.

---

## 15. Known Limitations / Deferred
- Live email delivery requires setting `RESEND_API_KEY` in environment variables; otherwise virtual logging mode is active.
- Automated cron execution requires external trigger (Vercel Cron, GitHub Actions, or cron job) calling the secured endpoint every 15 minutes.

---

## 16. Suggested Commit Messages
- `feat(phase6): implement multi-channel mentoring notifications, resilient email dispatch, and reminder cron`
- `fix(phase6): add email delivery logging and idempotent reminder triggers`
