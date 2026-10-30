# Incomplete and Deferred Features Registry

**Branch:** `feature/mentoring-workflow`  
**Repository Root:** `ANX-CLUB/` (Canonical path: `C:\Users\rajes\OneDrive\Desktop\INTERNSHIP PROJECT\ANX-CLUB`)  
**Last Updated:** October 30, 2026 (Phase 7 Audit)  
**Status:** Canonical Tracking Document  

This document provides an exhaustive, authoritative audit of incomplete, partially integrated, or deferred features across non-mentoring modules in the A.N.X Platform. Per project directives, these items are documented with exact file paths, root causes, architectural blueprints, and recommended fixes so they can be implemented sequentially without blocking core mentoring, calendar, and dashboard deliverables.

---

## 1. Challenges Module

- **Current Status:** Entirely Missing.
- **Affected File Paths:**
  - `src/app/(dashboard)/challenges/page.tsx` (missing)
  - `src/app/api/v1/challenges/route.ts` (missing)
  - `src/app/api/v1/challenges/[id]/submit/route.ts` (missing)
- **Root Cause & Gap Analysis:**
  - No frontend directory, filter, or challenge details page exists.
  - No Firestore collections (`challenges`, `challengeSubmissions`) exist in `firestore.rules`.
  - No automated test execution runner or mentor rubric grading interface.
  - No XP awarding trigger (+50 XP) connected to `src/lib/gamification.ts`.
- **Suggested Fix & Blueprint:**
  1. Add rules in `firestore.rules`:
     ```javascript
     match /challenges/{challengeId} {
       allow read: if isAuthenticated();
       allow write: if isAdmin();
     }
     match /challengeSubmissions/{submissionId} {
       allow read: if isAuthenticated() && (resource.data.studentId == request.auth.uid || isAdmin());
       allow write: if isAdmin();
     }
     ```
  2. Create `src/app/(dashboard)/challenges/page.tsx` with difficulty filtering (Easy/Medium/Hard) and tech tag search.
  3. Create `POST /api/v1/challenges/[id]/submit` supporting GitHub repository link or code snippet submission, awarding +50 XP via `awardXP(userId, 'challenge', 50, docId, 'Challenge Completed')`.

---

## 2. Portfolios & Showcase Module

- **Current Status:** Incomplete (Profile field only; showcase missing).
- **Affected File Paths:**
  - `src/app/(dashboard)/profile/page.tsx` (Lines 36, 120: simple string input)
  - `src/app/(dashboard)/career/page.tsx` (Option in review dropdown)
  - `src/types/index.ts` (Field `portfolioUrl?: string` on `UserProfile`)
  - `src/app/(dashboard)/portfolios/page.tsx` (missing)
  - `src/app/(dashboard)/u/[username]/page.tsx` (missing)
- **Root Cause & Gap Analysis:**
  - No dedicated portfolio builder or member showcase gallery.
  - Cannot pin incubated projects or certificates to a public developer profile.
  - No peer review or shareable portfolio view.
- **Suggested Fix & Blueprint:**
  1. Create `src/app/(dashboard)/portfolios/page.tsx` featuring a searchable gallery of verified student portfolios.
  2. Create public developer profile routes at `/u/[username]` displaying verified credentials, hackathon wins, GitHub activity, and incubated projects.
  3. Integrate portfolio review requests with the mentor review queue in `/career`.

---

## 3. Badges API & Automated Awarding

- **Current Status:** Partially Integrated (Dashboard surfaces live badges from `userBadges` / profile; public listing API missing).
- **Affected File Paths:**
  - `src/components/dashboard/GamificationWidget.tsx` (Wired in Phase 3)
  - `src/app/api/v1/badges/route.ts` (missing)
  - `src/lib/gamification.ts` (XP transaction engine exists, but no `awardBadge` helper)
  - `firestore.rules` (Lines 44–58: `match /badges/{badgeId}` and `match /userBadges/{userBadgeId}`)
- **Root Cause & Gap Analysis:**
  - No endpoint to list all available badges (`GET /api/v1/badges`).
  - No automated trigger when a user completes events, mentor sessions, or incubator milestones.
  - No badge inventory tab on `/profile`.
- **Suggested Fix & Blueprint:**
  1. Create `src/app/api/v1/badges/route.ts` querying the `badges` collection.
  2. Extend `src/lib/gamification.ts` with `awardBadge(userId: string, badgeId: string)`.
  3. Create an administrative seed script (`scripts/seed-badges.ts`) creating default badges: "First Session", "Code Pioneer", "Roadmap Completer", "5x Hackathon Veteran".

---

## 4. Student Certificates UI Locker

- **Current Status:** Partially Integrated (Phase 7 surfaced earned certificates on Student Dashboard linking to `/verify/[code]`; dedicated `/certificates` management page missing).
- **Affected File Paths:**
  - `src/app/(dashboard)/dashboard/page.tsx` (Integrated in Phase 7 to display verified certificates locker)
  - `src/app/api/v1/student/dashboard/route.ts` (Integrated in Phase 7 to query `certificates` collection)
  - `src/app/api/certificates/issue/route.ts` (Working backend PDF generation using `pdf-lib`)
  - `src/app/verify/[id]/page.tsx` (Working public cryptographic SHA-256 verifier)
  - `src/app/(dashboard)/certificates/page.tsx` (Dedicated management page missing)
- **Root Cause & Gap Analysis:**
  - Students can now view and verify certificates from the dashboard, but a full-featured certificate vault with "Download High-Res PDF" and 1-click "Add to LinkedIn" button is deferred.
- **Suggested Fix & Blueprint:**
  1. Create `src/app/(dashboard)/certificates/page.tsx` providing a visual card view for all issued credentials.
  2. Implement a 1-click "Share to LinkedIn" button using standard LinkedIn add-certification URL parameters (`https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME...`).

---

## 5. Tasks / Sprint Goals Persistence

- **Current Status:** Incomplete (Local React state only; no database persistence).
- **Affected File Paths:**
  - `src/app/(dashboard)/incubator/sprints/page.tsx`
  - `src/app/api/incubation/sprints/[id]/route.ts` (missing)
- **Root Cause & Gap Analysis:**
  - Checking off sprint milestones awards local UI feedback, but on page refresh, tasks reset to unchecked.
  - No Firestore write operation occurs when checkboxes are toggled.
- **Suggested Fix & Blueprint:**
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
- **Root Cause & Gap Analysis:**
  - Clicking "Comments" triggers a toast: `"Comments section coming soon..."`.
  - Upvote button increments local count only; not persisted to `communityTopics`.
- **Suggested Fix & Blueprint:**
  1. Add collection `communityReplies` in Firestore with rules allowing authenticated students to read and post.
  2. Implement `POST /api/v1/community/[id]/comments` and `POST /api/v1/community/[id]/upvote`.
  3. Add comment thread rendering in `src/app/(dashboard)/community/page.tsx`.

---

## 7. Project Incubator Milestones & Team Invitations

- **Current Status:** Incomplete (Idea submission works; team member invites and funding pipeline deferred).
- **Affected File Paths:**
  - `src/app/(dashboard)/incubator/page.tsx`
  - `src/app/api/v1/incubator/ideas/route.ts`
  - `src/app/api/v1/incubator/[id]/invite/route.ts` (missing)
- **Root Cause & Gap Analysis:**
  - Ideas can be submitted, and submitted ideas are counted on the Student Dashboard (`stats.projectsCount`).
  - However, inviting collaborators by email and progressing ideas through funding stages (Ideation -> Prototyping -> Pitch -> Funded) is not yet wired to Firestore.
- **Suggested Fix & Blueprint:**
  1. Create `teamInvites` collection with pending/accepted/rejected statuses.
  2. Create `POST /api/v1/incubator/[id]/invite` dispatching invitation emails.

---

## 8. Registry of Fake Google Meet Link Generators (RESOLVED)

Per explicit platform directives, **zero mock, random, or fake Meet/Jitsi links are permitted in the UI**. Meet links appear ONLY after real Google Calendar confirmation.

All 4 legacy fake link generators have been neutralized and replaced with the production Google Calendar API v3 implementation in Phase 5:

| Location | File Path | Original Code Pattern | Final Resolution |
| :--- | :--- | :--- | :--- |
| **1** | `src/app/api/v1/mentors/[id]/book/route.ts` | `https://meet.google.com/anx-${params.id}-${Math.floor(1000 + Math.random() * 9000)}` | **Resolved (Phase 2 & 5):** Replaced with real `mentorRequests` entry and Google Meet creation via `createGoogleCalendarEvent`. |
| **2** | `src/app/(dashboard)/mentors/page.tsx` | `https://meet.google.com/anx-${activeBookingMentor.id || 'mentor'}-${Math.floor(1000 + Math.random() * 9000)}` | **Resolved (Phase 2 & 3):** Replaced with verified request submission dialog; links remain null until confirmed. |
| **3** | `src/app/api/v1/admin/mentor-requests/[id]/route.ts` | `https://meet.jit.si/Mentorship-${params.id}-${Math.random().toString(36).substring(7)}` | **Resolved (Phase 2):** Eliminated arbitrary Jitsi generation; all conference data requires authenticated provider. |
| **4** | `src/modules/module3/app/api/mentors/[id]/book/route.ts` | `https://meet.google.com/anx-${params.id}-${Math.floor(1000 + Math.random() * 9000)}` | **Resolved (Phase 2):** Neutralized legacy duplicate booking endpoint. |
