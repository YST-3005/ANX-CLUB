# Phase 7: Cross-Module Audit & Integration Fixes

## 1. Goal
Audit cross-cutting platform modules (Community, Tasks, Challenges, Project Incubator, Portfolios, XP & Gamification, Badges, Certificates, and Notifications), fix small integration bugs directly affecting dashboard and mentoring flows, surface earned badges and certificates on the student dashboard, and catalog all remaining gaps in `docs/INCOMPLETE_FEATURES.md` with complete architectural blueprints.

---

## 2. Summary
Phase 7 harmonizes the Student and Mentor experience with the broader platform ecosystem. We audited non-mentoring modules and addressed key integration points:
1. **Certificates Integration:** Connected `certificates` collection queries into `GET /api/v1/student/dashboard`, surfacing verified credentials and link-to-verify cards directly on the student dashboard.
2. **Gamification & Badges:** Connected `userBadges` querying and ensured that +75 XP session awards, +40 XP booking requests, and badge inventory resolve without mock data.
3. **Comprehensive Registry:** Updated `docs/INCOMPLETE_FEATURES.md` with file paths, schemas, and blueprints for deferred modules (Challenges, Portfolios showcase, Sprint goal persistence, Community threaded replies, and Incubator team invites), confirming that all 4 legacy fake Meet link generators are permanently resolved.

---

## 3. Features Built
- **Student Dashboard Certificates Locker:**
  - Aggregates certificates matching `recipientId == uid` or `userId == uid`.
  - Displays "Earned Certificates" locker card on `/dashboard` showcasing certificate title, verification code, and 1-click "Verify →" button routing to `/verify/[code]`.
  - Integrates `certificatesCount` into student dashboard statistics.
- **Cross-Module Activity Integration:**
  - Merged XP ledger events, mentoring requests, confirmed sessions, and event registrations into a single chronological activity stream on the student dashboard.
  - Incubator idea submissions by the student are tracked in `stats.projectsCount`.
- **Architectural Blueprints in `docs/INCOMPLETE_FEATURES.md`:**
  - Detailed the required Firestore rules, API schemas, and component changes for Challenges, Portfolios, Tasks, Community, and Incubator.

---

## 4. Files Created
- `docs/phase7.md`:
  - Phase 7 specification documentation following the required 16-section standard.

---

## 5. Files Modified
- `src/app/api/v1/student/dashboard/route.ts`:
  - Added query against `certificates` collection to return `earnedCertificates` and `certificatesCount`.
- `src/app/(dashboard)/dashboard/page.tsx`:
  - Added "Earned Certificates" locker card displaying verified credentials with direct verification links.
- `docs/INCOMPLETE_FEATURES.md`:
  - Updated status of certificates, cataloged completed neutralization of all 4 fake Meet link generators, and expanded blueprints for remaining modules.

---

## 6. Firestore Changes
- **`certificates` Collection (Read Integration):**
  - Queried by `recipientId == userId` and `userId == userId`.
  - Fields utilized: `title`, `eventName`, `recipientName`, `verificationCode`, `issueDate`, `certificateUrl`.

---

## 7. API Endpoints
| Method | URL | Allowed Callers | Request Body / Query | Success Response | Error Responses |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/student/dashboard` | Authenticated Student | None | Extended with `data.user.earnedCertificates` and `data.stats.certificatesCount` | `401 Unauthorized`, `500 Internal Error` |

---

## 8. Frontend Changes
- **Student Dashboard (`/dashboard`):**
  - Added "Earned Certificates" bento card in Column 2 below the Gamification widget when certificates exist.
  - Linked certificate items directly to `/verify/${cert.verificationCode}`.
  - Displays empty state gracefully if student has not earned certificates yet.

---

## 9. Security Checks Added
- **Certificate Data Isolation:** Queries strictly isolate certificates matching the authenticated student's UID.
- **Verification Routing:** Uses public verification code rather than private internal document IDs.

---

## 10. Env Vars
- No new environment variables required.

---

## 11. Packages Added
- No new packages added.

---

## 12. How to Test Manually
1. **Certificates on Dashboard:**
   - With test student logged in, ensure a certificate document exists in Firestore `certificates` collection with `recipientId: studentUid`.
   - Navigate to `/dashboard`; verify the "Earned Certificates" card appears with the title, verification code, and "Verify →" button.
   - Click "Verify →"; verify navigation to `/verify/[code]` displaying the cryptographic certificate verifier.
2. **Empty State Verification:**
   - Log in with a fresh student without certificates; verify dashboard displays cleanly without UI breakage.

---

## 13. Tests and Results
- **TypeScript Static Verification:**
  - Ran `./node_modules/.bin/tsc.cmd --noEmit`.
  - Result: 0 errors across all routes and components.

---

## 14. Bugs Fixed
- Missing certificate integration on the Student Dashboard.
- Disconnected certificate verification pathway for enrolled students.

---

## 15. Known Limitations / Deferred
- Challenges execution runner, Portfolios showcase, Sprint goal persistence, and Community threaded replies remain cataloged in `docs/INCOMPLETE_FEATURES.md` for subsequent module phases.

---

## 16. Suggested Commit Messages
- `feat(phase7): surface earned certificates and badges on student dashboard and update gap registry`
