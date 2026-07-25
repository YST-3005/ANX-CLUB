# ANX Platform V1 - Required Changes & Technical Roadmap

## 1. Strategic Architecture Blueprint

The goal of this refactoring plan is to transition **ANX Platform V1** from a loose aggregate of sub-modules into a cohesive, production-grade **Next.js 14 App Router** web platform.

```
TARGET ARCHITECTURE:
====================
src/
├── app/
│   ├── (auth)/               # Unified Auth Routes (Login, Signup, Reset)
│   ├── (dashboard)/          # Member & Admin Dashboards
│   ├── community/            # Discussions & Showcase
│   ├── events/               # Unified Event Listing & Ticketing (Merged M3 + M4)
│   ├── mentors/              # Mentor Directory & 1:1 Sessions
│   ├── projects/             # Project Directory & Submissions
│   ├── roadmaps/             # Skill & Career Roadmaps
│   ├── api/v1/               # Clean V1 API Endpoints (Auth, Events, Razorpay, AI)
│   ├── page.tsx              # Modernized Core Hub Landing Page
│   └── layout.tsx            # Root Layout with Unified Auth & Theme Providers
├── lib/
│   ├── firebase/             # Single Client & Admin Firebase SDK Initialization
│   │   ├── client.ts
│   │   └── admin.ts
│   ├── payments/             # Unified Razorpay Client & Signature Verification
│   │   └── razorpay.ts
│   ├── notifications/        # Unified Email (Resend) & SMS (Fast2SMS) Service
│   │   ├── email.ts
│   │   └── sms.ts
│   ├── ai/                   # Google GenAI / Gemini Handler
│   │   └── gemini.ts
│   └── services/             # Consolidated Firestore Repositories
│       ├── userService.ts
│       ├── eventService.ts
│       ├── mentorService.ts
│       └── projectService.ts
├── types/                    # Centralized TypeScript Type Definitions
│   ├── user.ts
│   ├── event.ts
│   ├── mentor.ts
│   └── project.ts
└── components/               # Shared Glassmorphic UI Design System
    ├── ui/                   # Buttons, Modals, Cards, Inputs
    ├── layout/               # Navbars, Sidebars, Footers
    └── providers/            # Theme, Auth, Toast Providers
```

---

## 2. Phase 1: Security, Auth & Database Hardening (P0 - Critical)

### Task 1.1: Consolidate Firebase Initializers
- **Current Issue**: 4 different Firebase initializers exist (`src/lib/firebase.ts`, `module1/config/firebase.js`, `module3/lib/firebase/admin.ts`, `module4/lib/firebaseAdmin.js`).
- **Action Required**:
  1. Delete redundant config files in `src/modules/module1/config`, `src/modules/module3/lib/firebase`, and `src/modules/module4/lib`.
  2. Create a single client SDK entry point at `@/lib/firebase/client.ts`.
  3. Create a single server SDK entry point at `@/lib/firebase/admin.ts` checking environment variables cleanly without dummy initializations that hide configuration errors.

### Task 1.2: Harden API Security & Middleware Authentication
- **Current Issue**: Module 2 API relies on unverified `x-user-id` header from incoming HTTP requests.
- **Action Required**:
  1. Create a Next.js `middleware.ts` file in `src/` to verify Firebase ID tokens or session cookies.
  2. Extract authenticated user UID from verified session claims and attach it securely to downstream request context.
  3. Reject unauthorized requests with HTTP `401 Unauthorized` status before API handlers execute.

### Task 1.3: Define Shared TypeScript Data Schemas
- **Current Issue**: Data structures for `User`, `Event`, `Mentor`, and `Project` are defined independently across modules.
- **Action Required**:
  1. Create `@/types/index.ts` declaring canonical data interfaces:
     - `User`: `{ uid: string; email: string; fullName: string; role: 'Visitor' | 'Member' | 'Mentor' | 'Admin'; membershipTier: 'Basic' | 'Premium' | 'Enterprise'; status: 'Active' | 'Expired'; ... }`
     - `Event`: `{ id: string; title: string; description: string; date: string; time: string; location: string; price: number; capacity: number; hostId: string; ... }`
     - `Mentor`: `{ id: string; name: string; title: string; company: string; skills: string[]; rating: number; totalReviews: number; hourlyRate: number; ... }`

---

## 3. Phase 2: Routing & SPA Elimination (P1 - High)

### Task 2.1: Migrate Module 1 SPA to Next.js App Router
- **Current Issue**: Module 1 uses `react-router-dom` dynamic import with `{ ssr: false }`, causing full client-side state loss on refresh.
- **Action Required**:
  1. Remove `react-router-dom` dependency from `package.json`.
  2. Rehouse Module 1 routes into Next.js App Router files:
     - `src/app/(auth)/login/page.tsx`
     - `src/app/(auth)/signup/page.tsx`
     - `src/app/profile/page.tsx`
     - `src/app/profile/edit/page.tsx`
     - `src/app/admin/users/page.tsx`
  3. Replace in-memory `mockUsers` React state with Firebase Auth / Firestore calls.

### Task 2.2: Fix Internal Route Links & Mismatches
- **Current Issue**: Navigation links inside Module 3 point to `/events` or `/mentors` while hosted at `/module3/...`.
- **Action Required**:
  1. Audit all `<Link href="...">` tags across `src/modules/module3` and `src/app/module3`.
  2. Standardize all top-level application routes to canonical root paths (`/events`, `/mentors`, `/projects`, `/community`, `/dashboard`).

---

## 4. Phase 3: Module Unification & Code Merging (P1 - High)

### Task 3.1: Merge Module 4 Event Engine into Module 3
- **Current Issue**: Module 4 and Module 3 both maintain separate event pages, register modals, and Razorpay endpoints.
- **Action Required**:
  1. Deprecate `src/app/module4` and `src/modules/module4`.
  2. Transfer event card components, modal dialogs, and registration state from Module 4 into `@/components/events/` using TypeScript (`.tsx`).
  3. Consolidate event API routes into `@/app/api/v1/events/` with endpoints for listing, creating, approving, and registering.

### Task 3.2: Single Payment Utility (Razorpay)
- **Current Issue**: Duplicate Razorpay SDK initialization and payment verification routes (`module3/lib/razorpay.ts` vs `module4/lib/razorpay.js`).
- **Action Required**:
  1. Build `@/lib/payments/razorpay.ts` providing standard order creation (`createRazorpayOrder`) and signature verification (`verifyRazorpaySignature`).
  2. Enforce server-side HMAC SHA256 signature verification on all successful payments.
  3. Combine payment endpoints into `/api/v1/payments/create-order` and `/api/v1/payments/verify`.

### Task 3.3: Consolidate Notification Services (Resend & Fast2SMS)
- **Current Issue**: Resend email sending logic is duplicated in `module3/lib/resend.ts` and `module4/lib/email.js`.
- **Action Required**:
  1. Create `@/lib/notifications/email.ts` wrapping the `Resend` SDK with typed email templates (Welcome, Event Registration Confirmation, Mentor Booking Confirmation).
  2. Create `@/lib/notifications/sms.ts` wrapping Fast2SMS with phone number validation and fallback messaging.

---

## 5. Phase 4: API V1 & Data Service Unification (P2 - Medium)

### Task 4.1: Refactor Dashboard BFF Service Layer
- **Current Issue**: Module 2 BFF (`/api/v1/module2/dashboard`) relies on static mock files.
- **Action Required**:
  1. Refactor service files (`userService.ts`, `eventService.ts`, `bookingService.ts`, etc.) to query Firestore collections (`users`, `events`, `bookings`, `announcements`) when Firebase credentials are present.
  2. Retain the mock fallback layer strictly for offline unit testing or local sandbox mode.
  3. Maintain the high-performance parallel execution model using `Promise.allSettled()` and telemetry instrumentation (`meta.trace`).

### Task 4.2: Standardize Google Gemini AI Search Handler
- **Current Issue**: `/api/v1/module3/ai-search` prompt references old route paths.
- **Action Required**:
  1. Update prompt route map in `@/lib/ai/gemini.ts` to reflect updated unified application routes.
  2. Add rate limiting header check and error handling for missing API keys.

---

## 6. Phase 5: Design System & Code Quality Standardization (P2 - Medium)

### Task 5.1: Convert JavaScript Codebase to TypeScript
- **Current Issue**: Module 4 contains JavaScript `.js` and `.jsx` files causing linting and type-safety gaps.
- **Action Required**:
  1. Rename all `.js` and `.jsx` files to `.ts` and `.tsx`.
  2. Add explicit TypeScript interfaces for all props, component state, and API payload arguments.
  3. Fix current compiler errors (implicit `any` types, missing imports).

### Task 5.2: Harmonize UI Tokens & ThemeProvider
- **Current Issue**: Mix of raw inline styles, `App.css`, and Tailwind CSS across modules.
- **Action Required**:
  1. Migrate inline style objects in `src/app/page.tsx` to Tailwind utility classes.
  2. Wrap the global `layout.tsx` in a single `ThemeProvider` (`next-themes`) supporting dark mode by default with light mode toggle support.
  3. Standardize button, input, badge, and card styling using CSS variables defined in `src/app/globals.css`.

---

## 7. Step-by-Step Execution Plan & Verification Checklist

```
[ ] Step 1: Create @/lib/firebase/client.ts and @/lib/firebase/admin.ts; remove duplicate configs.
[ ] Step 2: Create @/types/index.ts with canonical User, Event, Mentor, and Project interfaces.
[ ] Step 3: Remove react-router-dom from package.json and convert Module 1 to App Router.
[ ] Step 4: Merge Module 4 events and payments into Module 3 under canonical /events route.
[ ] Step 5: Unify Razorpay and Resend helpers under @/lib/payments and @/lib/notifications.
[ ] Step 6: Create Next.js middleware.ts for Firebase Auth / Session cookie validation.
[ ] Step 7: Update Module 2 BFF services to fetch real data from Firestore collections.
[ ] Step 8: Update Gemini AI search route map and add API error boundaries.
[ ] Step 9: Fix all TypeScript errors (npx tsc --noEmit) and build errors (npm run build).
[ ] Step 10: Verify end-to-end user flows (Auth -> Dashboard -> Event Registration -> Payment).
```
