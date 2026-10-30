# Incomplete and Deferred Features Registry

**Branch:** `feature/mentoring-workflow`  
**Repository Root:** `ANX-CLUB/` (Canonical path: `C:\Users\rajes\OneDrive\Desktop\INTERNSHIP PROJECT\ANX-CLUB`)  
**Date:** October 29, 2026  
**Status:** Active Tracking Document  

This document tracks all incomplete, unintegrated, and missing platform features identified during codebase analysis. Per project directives, these items are explicitly cataloged with exact file paths, root causes, and suggested fixes so they do not block core mentoring and dashboard deliverables.

---

## 1. Challenges Module

- **Current Status:** Entirely Missing.
- **Affected File Paths:**
  - `src/app/(dashboard)/challenges/page.tsx` (missing)
  - `src/app/api/v1/challenges/route.ts` (missing)
  - `src/app/api/v1/challenges/[id]/submit/route.ts` (missing)
- **What is Missing:**
  - No frontend directory, filter, or challenge details page.
  - No Firestore collections (`challenges`, `challengeSubmissions`) exist in `firestore.rules`.
  - No automated test execution runner or mentor rubric grading interface.
  - No XP awarding trigger (+50 XP) connected to `src/lib/gamification.ts`.
- **Suggested Fix:**
  1. Add `match /challenges/{challengeId}` and `match /challengeSubmissions/{submissionId}` to `firestore.rules`.
  2. Implement `src/app/(dashboard)/challenges/page.tsx` with difficulty filtering (Easy/Medium/Hard) and tech tag search.
  3. Create `POST /api/v1/challenges/[id]/submit` supporting code uploads, GitHub repo links, and awarding XP upon automated validation or admin approval.

---

## 2. Portfolios Module

- **Current Status:** Incomplete (Field only; no showcase or viewer).
- **Affected File Paths:**
  - `src/app/(dashboard)/profile/page.tsx` (Lines 36, 120: simple string input)
  - `src/app/(dashboard)/career/page.tsx` (Option in review dropdown)
  - `src/types/index.ts` (Field `portfolioUrl?: string` on `UserProfile`)
  - `src/app/(dashboard)/portfolios/page.tsx` (missing)
  - `src/app/(dashboard)/u/[username]/page.tsx` (missing)
- **What is Missing:**
  - No dedicated portfolio builder or member showcase gallery.
  - Cannot pin incubated projects or certificates to a public developer profile.
  - No peer review or shareable portfolio view.
- **Suggested Fix:**
  1. Create `src/app/(dashboard)/portfolios/page.tsx` featuring a gallery of verified student portfolios.
  2. Create public developer profile routes at `/u/[username]` displaying verified credentials, hackathon wins, GitHub activity, and incubated projects.
  3. Integrate portfolio review requests with the mentor review queue in `/career`.

---

## 3. Badges API & Automated Awarding

- **Current Status:** Incomplete (Rules defined, no awarding engine or seeding).
- **Affected File Paths:**
  - `src/components/dashboard/GamificationWidget.tsx` (Falls back to empty state message)
  - `src/app/api/v1/badges/route.ts` (missing)
  - `src/lib/gamification.ts` (XP transaction engine exists, but no `awardBadge` helper)
  - `firestore.rules` (Lines 44–58: `match /badges/{badgeId}` and `match /userBadges/{userBadgeId}`)
- **What is Missing:**
  - No endpoint to list all available badges (`GET /api/v1/badges`).
  - No automated trigger when a user completes events, mentor sessions, or incubator milestones.
  - No badge inventory tab on `/profile`.
- **Suggested Fix:**
  1. Create `src/app/api/v1/badges/route.ts` querying the `badges` collection.
  2. Extend `src/lib/gamification.ts` with `awardBadge(userId: string, badgeId: string)`.
  3. Create an administrative seed script (`scripts/seed-badges.ts`) creating default badges: "First Session", "Code Pioneer", "Roadmap Completer", "5x Hackathon Veteran".

---

## 4. Student Certificates UI Locker

- **Current Status:** Incomplete (Backend PDF generation & public verification exist; Student UI missing).
- **Affected File Paths:**
  - `src/app/api/certificates/issue/route.ts` (Working backend PDF generation using `pdf-lib`)
  - `src/app/verify/[id]/page.tsx` (Working public cryptographic SHA-256 verifier)
  - `src/app/(dashboard)/dashboard/page.tsx` (No certificates display)
  - `src/app/(dashboard)/profile/page.tsx` (No issued credential list)
- **What is Missing:**
  - Students cannot see a list of their issued certificates on the dashboard or profile.
  - No "Download PDF" button or 1-click "Share to LinkedIn" button.
- **Suggested Fix:**
  1. Query `certificates.where('recipientId', '==', user.uid)` in `src/app/api/v1/student/dashboard` or a dedicated `GET /api/v1/student/certificates`.
  2. Add a "My Credentials" locker card on the Student Dashboard or `/profile` with direct PDF download links and verification links to `/verify/[id]`.

---

## 5. Tasks / Sprint Goals Persistence

- **Current Status:** Incomplete (Local React state only; no database persistence).
- **Affected File Paths:**
  - `src/app/(dashboard)/incubator/sprints/page.tsx`
  - `src/app/api/incubation/sprints/[id]/route.ts` (missing)
- **What is Missing:**
  - Checking off sprint milestones awards local UI feedback, but on page refresh, tasks reset to unchecked.
  - No Firestore write operation occurs when checkboxes are toggled.
- **Suggested Fix:**
  1. Create `PATCH /api/v1/incubator/sprints/[id]` accepting `{ taskId: string, completed: boolean }`.
  2. Update Firestore `sprints` collection with an updated tasks array.
  3. Persist checkbox toggles via `api.patch()` in `src/app/(dashboard)/incubator/sprints/page.tsx`.

---

## 6. Community Comments & Persistent Reactions

- **Current Status:** Incomplete (Frontend dummy toast; upvotes not saved).
- **Affected File Paths:**
  - `src/app/(dashboard)/community/page.tsx`
  - `src/app/api/v1/community/[id]/comments/route.ts` (missing)
  - `src/app/api/v1/community/[id]/upvote/route.ts` (missing)
- **What is Missing:**
  - Clicking "Comments" triggers a toast: `"Comments section coming soon..."`.
  - Upvote button increments local count only; not persisted to `communityTopics`.
- **Suggested Fix:**
  1. Add collection `communityReplies` in Firestore with rules allowing authenticated students to read and post.
  2. Implement `POST /api/v1/community/[id]/comments` and `POST /api/v1/community/[id]/upvote`.
  3. Add comment thread rendering in `src/app/(dashboard)/community/page.tsx`.

---

## 7. Registry of Fake Google Meet Link Generators

Per explicit platform directives, **no mock, random, or fake Meet/Jitsi links are permitted in the UI**. When a session is awaiting confirmation from the real Google Calendar API, the link must display as **"Pending"**.

The following 4 locations historically generated random dummy links and have been neutralized or slated for real Google Calendar API replacement:

| Location | File Path | Code Pattern | Status |
| :--- | :--- | :--- | :--- |
| **1** | `src/app/api/v1/mentors/[id]/book/route.ts` | `https://meet.google.com/anx-${params.id}-${Math.floor(1000 + Math.random() * 9000)}` | Neutralized: No fake link created |
| **2** | `src/app/(dashboard)/mentors/page.tsx` | `https://meet.google.com/anx-${activeBookingMentor.id || 'mentor'}-${Math.floor(1000 + Math.random() * 9000)}` | Removed: Replaced with real booking request submission |
| **3** | `src/app/api/v1/admin/mentor-requests/[id]/route.ts` | `https://meet.jit.si/Mentorship-${params.id}-${Math.random().toString(36).substring(7)}` | Neutralized: Meeting links require real conference provider |
| **4** | `src/modules/module3/app/api/mentors/[id]/book/route.ts` | `https://meet.google.com/anx-${params.id}-${Math.floor(1000 + Math.random() * 9000)}` | Neutralized: Mock generator eliminated |
