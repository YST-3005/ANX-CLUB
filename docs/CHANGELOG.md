# Changelog
All notable changes to the A.N.X Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Phase 4] - 2026-10-30

### Added
- **Mentor Request Lifecycle & Scheduling Workflow:**
  - Implemented `POST /api/v1/mentor/requests/[id]/accept` transitioning requests to `accepted_awaiting_scheduling` without premature meeting creation.
  - Implemented `POST /api/v1/mentor/requests/[id]/decline` with optional feedback reason, dispatching notification and email.
  - Implemented `POST /api/v1/mentor/requests/[id]/schedule` with strict validation (no past dates, 15–120 min duration range, UTC storage, and mentor interval conflict collision check preventing overlapping bookings with HTTP 409).
- **Session Mutation Endpoints:**
  - Implemented `POST /api/v1/mentor/sessions/[id]/reschedule` with conflict validation.
  - Implemented `POST /api/v1/mentor/sessions/[id]/duration` adjusting duration limits.
  - Implemented `POST /api/v1/mentor/sessions/[id]/cancel` with cancellation reason.
  - Implemented `POST /api/v1/mentor/sessions/[id]/complete` awarding +75 XP idempotently via `awardMentorSessionXP` and incrementing mentor metrics.
- **Mentor Dashboard Workspace:**
  - Rebuilt `/mentor-dashboard` with high-level KPI metrics (Pending Requests, Upcoming Sessions, Completed Sessions, Total Students), "Next Session" spotlight, tabbed Requests Inbox, Upcoming/History sessions with full modal action suite (Accept, Decline, Schedule, Reschedule, Change Duration, Cancel, Complete).
  - Rebuilt `/mentor-dashboard/profile` with bio, company, skills, topics tag editor, timezone dropdown, weekly availability hours editor, and Google Calendar connection card.
- **Phase 4 Specification Documentation:**
  - Generated comprehensive `docs/phase4.md` following the strict 16-section standard.

---

## [Phase 3] - 2026-10-29

### Added
- **Student Dashboard All-Real Data Integration:**
  - Implemented dynamic greeting, role/XP badges, and live KPI stats (Events Registered, Upcoming Sessions, Projects Submitted, Community Discussions) on `/dashboard`.
  - Implemented "My Mentoring" bento widget displaying live requests in review and upcoming sessions with confirmed Google Meet button or "Pending" indicators.
  - Connected gamification widget to live XP total and earned badges.
  - Replaced dead `#` links with active functional page routes (`/events`, `/mentors`, `/mentors/my-sessions`, `/incubator`, `/community`, `/career`).
  - Added 1-click referral link generator.
- **Dedicated Student API Layer:**
  - Built `GET /api/v1/student/dashboard` returning user metrics, events, announcements, mentoring requests/sessions, and activity feed.
  - Built `GET /api/v1/student/sessions` returning student's requests, upcoming sessions, and history.
  - Built `POST /api/v1/student/requests/[id]/cancel` with IDOR validation.
  - Built `POST /api/v1/student/sessions/[id]/cancel` with IDOR validation.
- **Student Sessions Workspace (`/mentors/my-sessions`):**
  - Implemented dedicated three-tab interface: "Upcoming Sessions", "Requests in Review", and "History & Completed".
  - Added self-service cancellation modals with optional cancellation reason.
  - Converted UTC timestamps into student's local timezone.
- **Mentor Discovery Upgrades (`/mentors`):**
  - Added multi-criteria search by keyword, company, expertise, and rate.
  - Added detailed mentor profile inspection modal.
  - Added validated mentoring request form modal with client validation.

---

## [Phase 2] - 2026-10-29

### Added
- **Mentor Dashboard Foundation:**
  - Implemented `/mentor-dashboard` overview page with KPI metrics, read-only requests queue, and confirmed sessions list.
  - Implemented `/mentor-dashboard/profile` page with interactive tag-based skill and topic editors.
  - Implemented secure API route `GET /api/v1/mentor/dashboard` with role enforcement (`role === 'Mentor' || role === 'Admin'`) and strict UID isolation.
  - Implemented secure API route `GET` and `PATCH` `/api/v1/mentor/profile`.
- **Role-Gated Sidebar:**
  - Added "Mentor Portal" navigation link in `DashboardSidebar.tsx` visible strictly to users with `Mentor` or `Admin` role.
- **Security & Data Isolation:**
  - Updated `firestore.rules` for `/mentorRequests`, `/mentoringSessions`, `/mentorBookings`, and `/mentorSessions` enforcing data isolation and blocking client-side writes.
  - Implemented centralized IDOR-safe server helper `src/lib/mentoring-auth.ts`.
  - Added composite indexes for mentoring collections in `firestore.indexes.json`.

### Changed
- **Auth Context:**
  - Fixed role coercion bug in `AuthContext.tsx` ensuring `Mentor` role is preserved on Firestore snapshot loads and preventing expiry downgrades.
- **Fake Links Neutralization:**
  - Cataloged and neutralized all 4 legacy fake Google Meet / Jitsi link generators across the codebase.
- **Notification Center:**
  - Connected notification bell in `DashboardHeader.tsx` to `GET` and `PATCH` `/api/v1/notifications` with unread badge counter.

---

## [Phase 1] - 2026-10-29

### Added
- Created `feature/mentoring-workflow` branch for isolated development.
- Completed comprehensive Phase 1 architectural and component audit (`docs/AUDIT_REPORT.md` and `docs/phase1.md`).
- Established `docs/INCOMPLETE_FEATURES.md` cataloging deferred features (Challenges, Portfolios, Badges API, Certificates UI) and fake Meet link generators.
- Cleaned duplicate docs directories, designating `ANX-CLUB/` as the single canonical repository root.
