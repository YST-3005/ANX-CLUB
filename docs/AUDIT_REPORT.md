# Comprehensive Technical Audit Report & Implementation Plan
**Project:** A.N.X Platform (Student Community Operating System)  
**Assigned Scope:** Student Dashboard, Mentor Dashboard & Mentoring Workflow Modules  
**Git Branch:** `feature/mentoring-workflow`  
**Date:** October 29, 2026  
**Auditor:** Senior Full-Stack Engineer  

---

## Executive Summary

An exhaustive architectural and codebase audit was conducted across the A.N.X Platform repository. The platform is built on Next.js 14 (App Router) with Firebase (Client & Admin SDK) and Tailwind CSS. 

Key findings across the assigned scope:
1. **Student Dashboard:** The UI layout and glassmorphism styling are high quality, but data integration is largely reliant on hardcoded fallbacks and mock datasets. A critical schema discrepancy causes booked mentor sessions to never appear on the Student Dashboard.
2. **Mentor Dashboard:** **Completely missing (Does not exist).** References exist in AI search prompts and notification action URLs (`/mentor-dashboard`), but accessing it results in a 404. Mentors have no interface to view requests, set availability, or manage sessions.
3. **Mentor Role & Auth Bug:** A bug in `AuthContext.tsx` coerces any user whose Firestore role is `'Mentor'` to `'Member'`, locking mentors out from role-specific features. Additionally, Firestore security rules currently restrict request approvals strictly to `'Admin'`, preventing mentors from accepting or completing their own sessions.
4. **Google Integration:** True Google Calendar and Google Meet API integrations **do not exist**. Meeting links are generated via dummy string interpolation (`https://meet.google.com/anx-...`), and calendar invites are basic text `.ics` file attachments.
5. **Architectural Legacy:** Historical multi-team folders (`src/modules/module1` through `module7`) exist alongside modern `src/app` routes. Active code depends on `module2` for BFF dashboard aggregation and `module3` for AuthContext.

---

## 1. Project-Wide Architectural Scan

### 1.1 Tech Stack Summary
| Layer | Technology | Details / Version |
| :--- | :--- | :--- |
| **Framework** | Next.js 14.2.35 | React 18, TypeScript 5, App Router with dynamic server & client components |
| **Styling** | Tailwind CSS 3.4.19 | Glassmorphism system, Framer Motion 12.42.2, Lucide React icons, Radix UI primitives |
| **Client Database / Auth** | Firebase Client SDK 12.14.0 | Firebase Auth (Email/Password & Google Popup), Client Firestore, Firebase Storage |
| **Server Database / Auth** | Firebase Admin SDK 13.10.0 | Server-side Firestore operations, Token verification, Admin Storage bucket |
| **Data Visualization** | Recharts 3.8.1 | AreaCharts for weekly and monthly student activity telemetry |
| **Document Generation** | pdf-lib 1.17.1 | Cryptographic PDF certificate and credential generation |
| **Payments** | Razorpay SDK 2.9.6 | Order creation, webhook validation, HMAC-SHA256 signature verification |
| **Communications** | Resend SDK & Fast2SMS | Email notifications with iCalendar (.ics) generation, OTP SMS verification |
| **AI / Machine Learning** | @google/genai 2.8.0 | Google Gemini API integration for platform search and recommendations |

### 1.2 Folder Structure & Code Organization
```text
ANX-CLUB/
├── docs/                           # Documentation and technical reports
├── public/                         # Public static assets, brand marks, and icons
├── scripts/                        # Database seeding & administrative CLI utilities
│   ├── create-admin.ts             # Admin account provisioning script
│   └── backfill-v1-users.ts        # Data migration helper
├── src/
│   ├── app/                        # Next.js App Router root
│   │   ├── (admin)/admin/*         # Executive Admin Portal (analytics, events, curriculum, roadmaps)
│   │   ├── (auth)/*                # Authentication gates (login, signup, admin login)
│   │   ├── (dashboard)/*           # Student / Member Portal (dashboard, mentors, events, incubator)
│   │   ├── api/                    # Legacy unversioned API routes
│   │   ├── api/v1/                 # Production versioned API routes (mentors, community, events, etc.)
│   │   ├── ambassador/             # Campus Ambassador referral tracking
│   │   ├── partners/               # Partner enterprise portal
│   │   └── verify/[id]/            # Public certificate hash verification portal
│   ├── components/                 # Shared UI component library
│   │   ├── dashboard/              # DashboardSidebar, DashboardHeader, GamificationWidget
│   │   ├── ui/                     # Card, Badge, Button, Avatar, ThemeToggle primitives
│   │   └── common/                 # PremiumGateModal, CommandPalette, Modals
│   ├── lib/                        # Core system utilities and services
│   │   ├── firebase/               # client.ts, admin.ts (singleton proxy), admin-auth.ts
│   │   ├── api.ts                  # Axios client (baseURL: /api/v1, token interceptor)
│   │   ├── auth.ts & auth-helpers  # Server token resolution & client token retrieval
│   │   ├── gamification.ts         # Idempotent XP transaction engine (awardXP, stages)
│   │   ├── email-templates.ts      # HTML transactional emails & generateICS helper
│   │   └── constants.ts            # Mock datasets (MOCK_USER, MOCK_MENTORS, MOCK_EVENTS, etc.)
│   ├── modules/                    # Legacy multi-team modules (module1 to module7)
│   │   ├── module2/                # Active BFF aggregator (services/ & data/)
│   │   └── module3/                # Active AuthContext.tsx
│   └── types/                      # TypeScript domain definitions (index.ts)
├── firestore.rules                 # Cloud Firestore security rules
├── firestore.indexes.json          # Firestore composite indexes
└── package.json                    # Dependencies and build scripts
```

### 1.3 Authentication, Authorization & Roles
The platform defines 5 logical roles in `src/types/index.ts`:
- `Visitor`: Unauthenticated guest.
- `Member`: Authenticated free student member.
- `Premium Member`: Paying member with priority bookings and exclusive access.
- `Mentor`: Verified industry mentor (Google, Vercel, Stripe, etc.).
- `Admin`: System administrator.

#### Critical Authentication & Role Gaps Identified:
1. **Role Coercion Bug in `AuthContext.tsx` (Lines 150–157):**
   ```typescript
   if (isOfficialAdmin || data.role === 'Admin') {
     data.role = 'Admin';
     data.membershipType = 'premium';
   } else {
     if (data.role !== 'Premium Member') {
       data.role = 'Member'; // BUG: Automatically demotes 'Mentor' to 'Member' in client state!
     }
   }
   ```
2. **Missing Mentor Routing / Middleware:**
   `(dashboard)/layout.tsx` detects Admins and redirects them to `/admin`. However, it has no routing logic for Mentors, treating them as regular students.
3. **Hardcoded Admin Email Assumptions:**
   Admin status is hardcoded in client utilities to `admin@algorithmaliens.com`, `admin@anx.club`, or emails with `admin@` prefix.

### 1.4 Database Models & Firestore Collections
The database is Cloud Firestore (NoSQL). The key collections relevant to our modules include:
- `users`: Member and mentor profile documents (`uid`, `email`, `fullName`, `role`, `membershipType`, `xpTotal`, `leadershipStage`, `skills`, `bio`, etc.).
- `mentors`: Public mentor profiles (`name`, `role`, `company`, `skills[]`, `rating`, `sessions`, `hourlyRate`, `ownerEmail`, `isPremiumOnly`).
- `mentorRequests`: Active booking requests created by students (`mentorId`, `mentorName`, `memberId`, `memberName`, `memberEmail`, `topic`, `preferredDate`, `preferredTime`, `message`, `isPaid`, `amount`, `meetingLink`, `status`).
- `mentorBookings`: Legacy collection used by `module2/services/bookingService.ts` creating a critical query mismatch.
- `xpLedger`: Transaction ledger tracking all XP gains with idempotency protection.
- `notifications`: In-app notification queue (`recipientId`, `title`, `body`, `actionUrl`, `isRead`, `createdAt`).
- `reviewRequests`: Career preparation submissions (resumes, portfolios, mock interviews).

### 1.5 Frontend to Backend Communication
The frontend communicates through three distinct patterns:
1. **Central Axios API Client (`src/lib/api.ts`):** Targets `/api/v1/*`. Uses request interceptors to inject `Authorization: Bearer <token>`.
2. **Direct Server-Side Routes (`fetch` calls):** In pages like `/incubator` and `/career`, components make direct `fetch('/api/...')` calls with custom authorization headers.
3. **Client Firestore Listeners (`onSnapshot`):** Used in real-time listeners for profile data, incubator ideas, and sprint goals.

---

## 2. Student Dashboard Audit (`/dashboard`)

The Student Dashboard is located at `src/app/(dashboard)/dashboard/page.tsx`. It fetches aggregated data from `/api/v1/module2/dashboard`.

### Detailed Component Audit Table
| Component / Widget | UI Section | Data Source | Current Status | Detailed Finding / Impact |
| :--- | :--- | :--- | :--- | :--- |
| **Hero Greeting** | Top Banner | `profile?.fullName`, `user?.displayName` | **Working with real data** | Correctly extracts and displays the student's first name with fallback to `'Member'`. |
| **Auth Action Buttons** | Top Banner | Client auth state (`!user`) | **Working with real data** | Shows "Sign In" and "Join Free" for visitors; shows daily motivational quote for logged-in members. |
| **AI Assistant Beta Widget** | Top Banner | Dispatches `open-command-palette` | **Incomplete** | UI banner with static beta badge. "Ask Anything" triggers the global command palette event. |
| **Stat: Events Registered** | Top Stats Bar | `upcomingEvents.length` | **Using mock data** | Relies on `upcomingEvents` which falls back to `MOCK_EVENTS` (4 items) when empty. Increment is hardcoded (`+20%`). |
| **Stat: Mentor Sessions** | Top Stats Bar | `mentorBookings.length` | **Broken / Using mock** | Backend query looks in `mentorBookings` collection instead of `mentorRequests`. Returns 0 or falls back to `MOCK_MENTORS` (4 items). Hardcoded `+50%`. |
| **Stat: Projects In Progress** | Top Stats Bar | `projects.length` | **Using mock data** | Falls back to mock projects from `module2/data/projects.ts` if user has none. Increment is hardcoded (`+25%`). |
| **Stat: Community Posts** | Top Stats Bar | Hardcoded literal `'8'` | **Hardcoded** | Number `'8'` and `+35% this month` are static hardcoded strings. Not connected to `communityTopics`. |
| **Upcoming Events Card** | Bento Column 1 | `upcomingEvents.slice(0, 3)` | **Using mock data** | When no live registrations exist, renders fake events with static "Registered" badge for every single item. |
| **Announcements Card** | Bento Column 1 | `announcements.slice(0, 3)` | **Working with fallback** | Reads from `/api/v1/announcements`. Falls back to `MOCK_ANNOUNCEMENTS` if empty. |
| **Gamification Widget** | Bento Column 2 | `profile?.xpTotal`, `leadershipStage` | **Incomplete / Using mock** | Real `xpTotal` and `leadershipStage` update correctly via `awardXP`. However, recent badges always fall back to 2 hardcoded static badge icons. |
| **Learning Progress Card** | Bento Column 2 | Hardcoded SVG / static text | **Hardcoded** | "72% Overall", "Full Stack Web Development - Advanced", and "12 Completed / 4 In Progress / 3 Upcoming" are completely hardcoded. Not connected to `roadmapProgress`. |
| **Weekly Activity Chart** | Bento Column 2 | Hardcoded `activityData` array | **Hardcoded** | Recharts `AreaChart` uses static data (`Jan-Jul`). Period dropdown only fires a cosmetic toast notification. |
| **Recent Activity Feed** | Bento Column 2 | Hardcoded static list | **Hardcoded** | 4 static hardcoded timeline events ("You registered for AI Workshop", etc.). "View All" triggers "Coming soon" toast. |
| **Upcoming Mentor Sessions** | Bento Column 3 | `mentorBookings.slice(0, 3)` | **Broken / Using mock** | Due to collection name mismatch (`mentorBookings` vs `mentorRequests`), user bookings are never found. Renders `MOCK_MENTORS` as booked sessions! Clicking only fires a toast. |
| **AI Recommendations Card** | Bento Column 3 | Static promo card | **Incomplete** | Hardcoded visual banner promoting roadmaps. Link navigates to `/resources`. |
| **Quick Actions Grid** | Bento Column 3 | Static icon links | **Incomplete** | 3 work (`/events`, `/mentors`, `/community`). 2 are dummy buttons (`Explore Projects` and `Start Chat` link to `#` with a toast). |
| **Refer & Earn Rewards** | Bento Column 3 | `navigator.clipboard` | **Working with real data** | Generates valid referral link with student's UID (`/signup?ref=${user.uid}`) and copies to clipboard. |

---

## 3. Audit of Other Assigned & Related Modules

### 3.1 Community Hub (`/community`)
- **Status:** **Partially working with mock fallback**
- **Findings:** Students can post new discussion threads via `POST /api/v1/community`, which saves to the `communityTopics` Firestore collection. Posts fetch from `GET /api/v1/community`. 
- **Gaps:** Upvoting (`handleLike`) is client-side state only (does not persist to Firestore). The comments drawer displays "Comments section coming soon...".

### 3.2 Tasks & Weekly Sprints (`/incubator/sprints`)
- **Status:** **Incomplete / Fragmented**
- **Findings:** There is no dedicated platform-wide "Tasks" module. However, within the Product Incubator, a "Weekly Sprint Tracker" exists at `/incubator/sprints`. Students can add sprint goal tickets to the `sprints` collection and receive +20 XP.
- **Gaps:** Goal completion toggling only updates local React state; it does not persist status updates back to Firestore via a PATCH endpoint.

### 3.3 Challenges
- **Status:** **Missing / Not Implemented**
- **Findings:** There is no "Challenges" page, component, or database collection. The only occurrence of the word "challenge" in the entire codebase is an agenda item inside a mock event string in `constants.ts`.

### 3.4 Project Submissions & Product Incubator (`/incubator`)
- **Status:** **Working with real data (Incubation) / Incomplete (Showcase)**
- **Findings:** The Incubation submission portal (`/incubator`) is fully functional. Students submit project proposals with title, problem statement, architecture, tech stack, and PDF attachments (uploaded as base64 or link). Submissions write to `ideas`, award +30 XP, and are reviewed in Admin Submissions (`/admin/submissions`).
- **Gaps:** The public "Project Showcase" gallery (for finished projects shipped from incubation) only exists as a mockup in `ProjectCard.tsx` and has no dedicated student dashboard view.

### 3.5 Portfolios
- **Status:** **Incomplete (Field only)**
- **Findings:** "Portfolio" exists solely as a string field (`portfolioUrl`) on user profiles (`/profile`) and as a selectable review type in Career Prep (`/career`).
- **Gaps:** No standalone portfolio builder, portfolio showcase gallery, or peer portfolio review page exists.

### 3.6 XP Engine & Gamification (`src/lib/gamification.ts`)
- **Status:** **Working with real data**
- **Findings:** High-quality transaction-safe gamification engine. Uses `adminDb.runTransaction()` to record XP ledger transactions in `xpLedger` with idempotency checks (preventing duplicate awards for the same event or booking). Correctly updates `users.xpTotal` and recalculates `leadershipStage` (Member -> Associate -> Lead -> Dept Head -> Core Team -> Director).
- **Supported XP Triggers:** Event attendance (+50 XP), Mentor session booking (+40 XP), Mentor session completion (+75 XP), Idea pitch (+30 XP), Shipped product (+250 XP), Roadmap milestone (+40 XP), Referral (+100 XP).

### 3.7 Badges
- **Status:** **Incomplete / Hardcoded**
- **Findings:** `badges` and `userBadges` collections are specified in the PRD and configured in `firestore.rules`. 
- **Gaps:** No backend endpoints exist to award or query earned badges. The `GamificationWidget` on the dashboard renders two hardcoded static badge icons (`Early Bird`, `Product Builder`).

### 3.8 Certificates & Verification (`/verify/[id]` & `/api/certificates/issue`)
- **Status:** **Working with real data (Backend & Verification Portal)**
- **Findings:** Admin route `POST /api/certificates/issue` generates a cryptographic SHA-256 hash ID (`ANX-CERT-XXXX`), embeds a verification QR code via public QR API, compiles a high-res PDF via `pdf-lib`, stores it in Firebase Storage, and saves metadata to `certificates` collection. The public route `/verify/[id]` verifies authenticity against Firestore and displays student name, title, and PDF link.
- **Gaps:** Students currently have no certificate showcase in their dashboard or profile to view or download their earned certificates.

### 3.9 Notifications
- **Status:** **Incomplete / Disconnected in UI**
- **Findings:** The backend endpoint `/api/v1/notifications` (GET and PATCH) is fully implemented and reads from the `notifications` Firestore collection. Transactions like mentor bookings create notifications.
- **Gaps:** `DashboardHeader.tsx` does not fetch from `/api/v1/notifications`. Instead, opening the notification bell renders static `MOCK_ANNOUNCEMENTS`! "Mark all read" simply triggers a dummy toast.

---

## 4. Mentor Dashboard, Profiles, Requests & Google Integration Audit

### 4.1 Mentor Dashboard
- **Current State:** **MISSING / 404**
- **Findings:** 
  - There is no `/mentor-dashboard` page in `src/app`.
  - There are references to `/mentor-dashboard` in AI search prompts (`src/app/api/ai-search/route.ts`), AI system prompts (`src/lib/ai/gemini.ts`), and booking notification action URLs (`src/app/api/v1/mentors/[id]/book/route.ts`).
  - When a mentor logs in, they are treated as a regular member and routed to `/dashboard`.
  - The left sidebar (`DashboardSidebar.tsx`) has no navigation link for a Mentor Dashboard.

### 4.2 Mentor Profiles
- **Current State:** **Partially Implemented (Student Directory Only)**
- **Findings:**
  - Mentor records exist in the Firestore `mentors` collection and in `MOCK_MENTORS` (`src/lib/constants.ts`).
  - Students can browse mentors at `/mentors`, filter by skill tags, and view hourly rates.
  - Admin endpoint `POST /api/v1/admin/mentors` allows admins to create mentor records with `ownerEmail`.
- **Gaps:**
  - Mentors have no interface to edit their own profile, bio, hourly rate, expertise tags, or available calendar time slots.
  - No connection exists between a logged-in user with role `'Mentor'` and their corresponding `mentors` document.

### 4.3 Mentoring Requests Lifecycle & Disconnection Bug
- **Current Lifecycle:**
  1. **Student Books Session:** On `/mentors`, student selects date, slot time, and enters topic. Submits to `POST /api/v1/mentors/[id]/book`.
  2. **Database Record Created:** Saved to Firestore collection `mentorRequests` with status `'Pending'` (or `'Approved'` if paid).
  3. **XP Awarded:** Student receives +40 XP.
  4. **Email Dispatched:** Confirmation email sent via Resend with an attached `.ics` iCalendar file.
  5. **Notification Created:** In-app notification added for mentor's UID.
  6. **Admin Review:** Only an admin can approve/reject via `PATCH /api/v1/admin/mentor-requests/[id]`.
- **CRITICAL FLAWS:**
  1. **Dashboard Query Mismatch:**
     - `src/modules/module2/services/bookingService.ts` queries:
       `db.collection('mentorBookings').where('userId', '==', userId)`
     - But bookings are written to:
       `db.collection('mentorRequests')` with field `memberId: actualUserId`
     - **Result:** The Student Dashboard **never** displays the student's real bookings; it always falls back to fake mock mentors disguised as sessions!
  2. **Mentors Cannot Manage Their Own Sessions:**
     - Mentors have no view to see who booked them.
     - `firestore.rules` and `PATCH /api/v1/admin/mentor-requests/[id]` require `role == 'Admin'`. Mentors are forbidden from approving, rejecting, or completing sessions themselves.
  3. **No Student "My Sessions" View:**
     - Students have no screen to see their active sessions, meeting links, or session history other than the broken 3-item widget on `/dashboard`.

### 4.4 Google Integration Audit
- **Authentication:** Working. Firebase Auth uses `GoogleAuthProvider` for Google sign-in.
- **AI (Gemini):** Working. `@google/genai` is configured for search/assistant.
- **Google Meet & Google Calendar:** **MOCK / SIMULATED ONLY.**
  - Meeting links are generated via random string concatenation:
    `meetingLink = https://meet.google.com/anx-${params.id}-${Math.floor(1000 + Math.random() * 9000)}`
    or Jitsi fallback:
    `https://meet.jit.si/Mentorship-${params.id}-${Math.random().toString(36).substring(7)}`
  - There is no Google Workspace API, OAuth 2.0 calendar scope, or Google Calendar API client installed.
  - Calendar invites work via iCalendar (`.ics`) MIME attachments generated in `src/lib/email-templates.ts`.

---

## 5. Comprehensive Findings Matrix

| Scope Area | Component / Subsystem | Current Status | Blocker / Severity | Remediation Priority |
| :--- | :--- | :--- | :--- | :--- |
| **Auth / Roles** | `AuthContext.tsx` | Role `'Mentor'` coerced to `'Member'` | **Critical Bug** | **P0** (Phase 2) |
| **Auth / Roles** | `firestore.rules` | Mentors cannot read/update their sessions | **Critical Blocker** | **P0** (Phase 2) |
| **Student Dashboard** | Mentor Sessions Widget | Broken collection query (`mentorBookings` vs `mentorRequests`) | **Critical Bug** | **P0** (Phase 2) |
| **Student Dashboard** | Learning & Activity Charts | Completely hardcoded static mock data | Moderate Gap | **P1** (Phase 2) |
| **Student Dashboard** | Header Notifications | Bell dropdown displays mock announcements | Moderate Gap | **P1** (Phase 2) |
| **Mentor Module** | Mentor Dashboard | Completely missing (`/mentor-dashboard` 404) | **Critical Blocker** | **P0** (Phase 2) |
| **Mentor Module** | Mentor Request Management | No mentor endpoint to accept/reject/complete sessions | **Critical Blocker** | **P0** (Phase 2) |
| **Mentor Module** | Mentor Profile Management | Mentors cannot edit profile, bio, skills, or rates | Major Gap | **P1** (Phase 2) |
| **Mentoring Workflow** | Student Sessions Portal | No dedicated page for students to view/join sessions | Major Gap | **P1** (Phase 2) |
| **Google Integration** | Google Calendar / Meet | Fake links & ICS attachment only; no Google API | Architecture Decision | **P2** (Phase 2) |
| **Gamification** | Badges System | Collections exist in schema, but no APIs or seed data | Minor Gap | **P2** (Phase 3) |
| **Incubation** | Sprint Goal Persistence | Toggle goal completion does not write to DB | Minor Gap | **P2** (Phase 3) |

---

## 6. Proposed Implementation Plan (Phase 2)

### 6.1 Architectural Principles
1. **Preserve Existing Tech Stack & Patterns:** Follow Next.js App Router, Tailwind glassmorphism design tokens, Firebase Client/Admin SDK, and Axios API layer.
2. **Zero-Trust Backend Security:** Ensure role validation occurs server-side via Firebase Admin SDK.
3. **Graceful Fallbacks:** Maintain backward compatibility with in-memory store and offline mode.
4. **Minimal Shared File Changes:** Only modify shared files strictly necessary for the assigned modules (`AuthContext.tsx`, `DashboardSidebar.tsx`, `firestore.rules`, `.env.example`).

---

### 6.2 File-by-File Changes & New Files

```
INTERNSHIP PROJECT/
└── ANX-CLUB/
    ├── firestore.rules                             [MODIFY] Allow mentors to read/update sessions where mentorId == auth.uid
    ├── .env.example                                [MODIFY] Document Google Calendar API & Meet config variables
    ├── src/
    │   ├── types/index.ts                          [MODIFY] Extend Mentor & MentorBooking interfaces
    │   ├── modules/module3/components/
    │   │   └── AuthContext.tsx                     [MODIFY] Fix role coercion bug (preserve 'Mentor' role)
    │   ├── modules/module2/services/
    │   │   └── bookingService.ts                   [MODIFY] Fix collection query to read from 'mentorRequests'
    │   ├── lib/
    │   │   ├── api.ts                              [MODIFY] Add mentorApi and studentSessionsApi helpers
    │   │   └── google-calendar.ts                  [NEW] Google Calendar & Meet link generator / 1-click sync
    │   ├── components/
    │   │   ├── dashboard/
    │   │   │   ├── DashboardSidebar.tsx            [MODIFY] Add "Mentor Portal" link for users with Mentor role
    │   │   │   └── DashboardHeader.tsx             [MODIFY] Connect notification bell to live /api/v1/notifications
    │   │   └── mentor/
    │   │       ├── MentorSessionCard.tsx           [NEW] Actionable session card (Accept, Decline, Meet Link, Complete)
    │   │       ├── MentorAvailabilityPicker.tsx    [NEW] Slot timing & rate configuration component
    │   │       └── MentorStatsRow.tsx              [NEW] Overview stats (Completed sessions, Earnings, Ratings)
    │   └── app/
    │       ├── (dashboard)/
    │       │   ├── dashboard/
    │       │   │   └── page.tsx                    [MODIFY] Render real booked sessions, join call button, live stats
    │       │   ├── mentors/
    │       │   │   └── my-sessions/
    │       │   │       └── page.tsx                [NEW] Student "My Mentorship Sessions" management page
    │       │   └── mentor-dashboard/
    │       │       ├── page.tsx                    [NEW] Mentor Dashboard overview (requests queue, upcoming calls)
    │       │       ├── sessions/
    │       │       │   └── page.tsx                [NEW] Full session history, past notes & completion actions
    │       │       └── profile/
    │       │           └── page.tsx                [NEW] Mentor profile editor (bio, company, hourly rate, slots)
    │       └── api/v1/
    │           ├── mentor/
    │           │   ├── dashboard/
    │           │   │   └── route.ts                [NEW] GET mentor stats, pending requests, and upcoming bookings
    │           │   ├── sessions/
    │           │   │   └── [id]/
    │           │   │       └── route.ts            [NEW] PATCH accept/reject/reschedule/complete session + XP trigger
    │           │   └── profile/
    │           │       └── route.ts                [NEW] GET & PATCH mentor profile settings and availability
    │           └── student/
    │               └── sessions/
    │                   └── route.ts                [NEW] GET student's own booked sessions with live statuses
```

---

### 6.3 Detailed Step-by-Step Execution Stages

#### Stage 1: Auth & Database Foundation (P0)
1. **Fix `AuthContext.tsx`:** Ensure `profile.role === 'Mentor'` is preserved upon Firestore snapshot loads.
2. **Update `firestore.rules`:** Update rules for `match /mentorRequests/{requestId}` allowing read and update if `resource.data.mentorId == request.auth.uid` or if user's registered email matches mentor's `ownerEmail`.
3. **Fix `bookingService.ts`:** Update query to read from `mentorRequests` with `where('memberId', '==', userId)`, ordering by `preferredDate` and falling back to memory store.

#### Stage 2: Student Dashboard & Sessions View (P0)
1. **Refactor `src/app/(dashboard)/dashboard/page.tsx`:**
   - Display real booked sessions with tutor name, date, time slot, topic, status badge (`Pending`, `Approved`, `Completed`).
   - Add direct "Join Meeting" button for sessions with active meeting links.
   - Replace hardcoded fake mentors fallback with a helpful empty state ("No upcoming sessions booked yet — Browse Mentors").
   - Connect "Mentor Sessions" stat card to live booking count.
2. **Build Student Sessions Page (`/mentors/my-sessions`):**
   - Provide a dedicated tab on `/mentors` or sub-route allowing students to view all active, past, and pending session requests.
   - Allow students to view meeting details and calendar links.

#### Stage 3: Dedicated Mentor Dashboard (`/mentor-dashboard`) (P0)
1. **Build Mentor Dashboard Shell (`/mentor-dashboard/page.tsx`):**
   - Protected route verifying role is `'Mentor'` or `'Admin'`.
   - Overview metrics: Pending Requests, Upcoming Sessions Today, Total Sessions Completed, Community Rating.
   - Pending Requests Queue: Cards displaying student name, college, topic, requested date/time slot.
   - One-click actions: **Accept Request**, **Decline Request**, **Provide Meeting Link**.
2. **Build Mentor Session Management API (`/api/v1/mentor/sessions/[id]`):**
   - Validates that the requesting user is the mentor assigned to the session.
   - Supports status transitions: `Approved`, `Rejected`, `Completed`.
   - On `Approved`: generates Google Meet / Calendar link, sends confirmation email with ICS to student.
   - On `Completed`: triggers `awardMentorSessionXP` (+75 XP to student) and updates mentor's completed sessions count.
3. **Build Mentor Profile Editor (`/mentor-dashboard/profile/page.tsx`):**
   - Mentors can update bio, role, company, hourly rate, expertise skills tags, and active slot timings.

#### Stage 4: Google Calendar & Meet Integration Strategy (P1)
We propose a pragmatic two-tier Google Calendar / Meet integration:
1. **1-Click Google Calendar Sync Link:** Generate pre-filled Google Calendar web URL:
   `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Mentorship+with+Mentor&dates=YYYYMMDDTHHMMSSZ/YYYYMMDDTHHMMSSZ&details=Topic&location=MeetLink`
   This allows instant addition to the user's Google Calendar with zero OAuth friction.
2. **Google Meet Link Generation:**
   - Option A (Direct / Clean): Integrated Google Meet room URL generator tied to session IDs with fallback to Google Meet web room.
   - Option B (Service Account): Google Calendar API with service account domain-wide delegation for automated Google Meet link creation (configured via environment variables in `.env.example`).

#### Stage 5: Polish Shared UI & Header Notifications (P1)
1. **Sidebar Integration (`DashboardSidebar.tsx`):** Add "Mentor Portal" navigation item with an icon for users who have the Mentor role.
2. **Header Notifications (`DashboardHeader.tsx`):** Connect notification bell to `/api/v1/notifications` so real session updates appear in the dropdown.

---

## 7. Verification & Testing Checklist

- [ ] **Role Verification:** Log in as mentor (`mentor@anx.club`); verify profile role remains `'Mentor'` without coercion to `'Member'`.
- [ ] **Student Booking Flow:** Book a session with a mentor from `/mentors`; verify session writes to `mentorRequests` with status `Pending` and +40 XP is granted.
- [ ] **Student Dashboard Reflection:** Verify the booked session immediately displays in the Student Dashboard's "Upcoming Mentor Sessions" widget with status badge.
- [ ] **Mentor Dashboard Access:** Access `/mentor-dashboard`; verify the pending session appears in the mentor's inbox.
- [ ] **Mentor Accept Action:** Mentor accepts session; verify status updates to `Approved`, meeting link is generated, notification is created for student, and approval email is sent.
- [ ] **Session Completion:** Mentor marks session as `Completed`; verify student receives +75 XP and `xpLedger` reflects the transaction.
- [ ] **Security Boundaries:** Verify regular students cannot access `/mentor-dashboard` or approve sessions via `/api/v1/mentor/sessions/[id]`.

---

> [!IMPORTANT]
> **Audit Complete. Awaiting Approval.**  
> In accordance with Phase 1 instructions, all findings have been documented and no application source code has been altered yet. Please review this audit report and implementation plan. Once approved, Phase 2 execution will begin on branch `feature/mentoring-workflow`.
