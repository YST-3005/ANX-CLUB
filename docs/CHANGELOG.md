# Changelog
All notable changes to the A.N.X Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased] - Phase 3 Planned
- **Mentoring Workflow Actions:** Mentor accept/decline actions for booking requests with notes.
- **Student Notifications:** Dynamic notification generation when requests are accepted or declined.
- **Calendar & Rescheduling:** Mentoring slot selection and rescheduling workflows.

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
  - Updated `firestore.rules` for `/mentorRequests`, `/mentorBookings`, and `/mentorSessions` to enforce strict student and mentor data isolation.

### Changed
- **Auth Context:**
  - Fixed role coercion bug in `AuthContext.tsx` ensuring `Mentor` role is preserved on Firestore snapshot loads and preventing expiry downgrades.
- **Student Dashboard & Services:**
  - Replaced broken `mentorBookings` query in `bookingService.ts` with `mentorRequests.where('memberId', '==', userId)` and eliminated fake mock session fallbacks.
  - Eliminated hardcoded mock data across Student Dashboard (`/dashboard`) including `MOCK_EVENTS`, `MOCK_ANNOUNCEMENTS`, `MOCK_MENTORS`, fake activity, and fake badges.
  - Replaced all missing or empty datasets with clean, responsive empty states with relevant call-to-actions.
  - Enforced `"Meeting Link: Pending"` policy in accordance with Google Meet guidelines (no fake Meet URLs).
  - Connected notification bell in `DashboardHeader.tsx` to `GET` and `PATCH` `/api/v1/notifications` with unread badge counter.
  - Updated dashboard BFF aggregator `/api/v1/module2/dashboard` to query real activity logs from `xpLedger` and real progress from `roadmapProgress`.

---

## [Phase 1] - 2026-10-29

### Added
- Created `feature/mentoring-workflow` branch for isolated development.
- Completed comprehensive Phase 1 architectural and component audit (`docs/AUDIT_REPORT.md` and `docs/phase1.md`).
- Established `docs/INCOMPLETE_FEATURES.md` cataloging deferred features (Challenges, Portfolios, Badges API, Certificates UI) and fake Meet link generators.
- Cleaned duplicate docs directories, designating `ANX-CLUB/` as the single canonical repository root.
