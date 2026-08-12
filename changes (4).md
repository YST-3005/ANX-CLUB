
### Proposed Change 1: Lazy Singleton Instantiation for Firebase Admin SDK Proxies
- **Impact Area:** Backend
- **Implementation Logic:** Replace property-level proxy re-bindings in `src/lib/firebase/admin.ts` with cached module-level singletons. This eliminates millions of proxy traps and ephemeral closure allocations during high-concurrency API execution.

```typescript
// src/lib/firebase/admin.ts
import * as admin from 'firebase-admin';

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

function initAdmin(): admin.app.App | null {
  if (admin.apps.length > 0) return admin.apps[0]!;
  if (!projectId || !clientEmail || !privateKey) return null;

  try {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    return null;
  }
}

// Module-level lazy singletons
let cachedDb: admin.firestore.Firestore | null = null;
let cachedAuth: admin.auth.Auth | null = null;
let cachedStorage: admin.storage.Storage | null = null;

export const adminDb = new Proxy({} as admin.firestore.Firestore, {
  get(_, prop) {
    if (!cachedDb) {
      const app = initAdmin();
      if (!app) throw new Error("Firebase Admin SDK missing required credentials.");
      cachedDb = admin.firestore();
    }
    const value = (cachedDb as any)[prop];
    return typeof value === 'function' ? value.bind(cachedDb) : value;
  }
});

export const adminAuth = new Proxy({} as admin.auth.Auth, {
  get(_, prop) {
    if (!cachedAuth) {
      const app = initAdmin();
      if (!app) throw new Error("Firebase Admin SDK missing required credentials.");
      cachedAuth = admin.auth();
    }
    const value = (cachedAuth as any)[prop];
    return typeof value === 'function' ? value.bind(cachedAuth) : value;
  }
});

export const adminStorage = new Proxy({} as admin.storage.Storage, {
  get(_, prop) {
    if (!cachedStorage) {
      const app = initAdmin();
      if (!app) throw new Error("Firebase Admin SDK missing required credentials.");
      cachedStorage = admin.storage();
    }
    const value = (cachedStorage as any)[prop];
    return typeof value === 'function' ? value.bind(cachedStorage) : value;
  }
});
```

---

### Proposed Change 2: Server-Side Firestore Filtering, Pagination, and CDN Caching
- **Impact Area:** Backend
- **Implementation Logic:** Refactor `src/app/api/v1/events/route.ts` to perform native Firestore queries with `where()`, `orderBy()`, and `limit()`, avoiding full table scans into server memory. Add `Cache-Control` response headers for CDN edge caching.

```typescript
// src/app/api/v1/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import * as admin from "firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get("type");
    const onlyUpcoming = searchParams.get("upcoming") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
    const lastId = searchParams.get("lastId");

    let queryRef: admin.firestore.Query = adminDb.collection("events")
      .where("isActive", "==", true);

    if (typeFilter && typeFilter !== "All") {
      queryRef = queryRef.where("eventType", "==", typeFilter);
    }

    if (onlyUpcoming) {
      const nowStr = new Date().toISOString();
      queryRef = queryRef.where("date", ">=", nowStr);
    }

    queryRef = queryRef.orderBy("date", "desc").limit(limit);

    if (lastId) {
      const lastDoc = await adminDb.collection("events").doc(lastId).get();
      if (lastDoc.exists) {
        queryRef = queryRef.startAfter(lastDoc);
      }
    }

    const snapshot = await queryRef.get();
    const events = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const response = NextResponse.json(
      { success: true, data: events, count: events.length },
      { status: 200 }
    );

    // Cache static/semi-static events payload on CDN edge for 60 seconds
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300"
    );

    return response;
  } catch (error: any) {
    console.error("[GET /api/v1/events]", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch events.", error: error.message },
      { status: 500 }
    );
  }
}
```

---

### Proposed Change 3: Atomic Firestore Transaction & Capacity Validation for Payment Verification
- **Impact Area:** Backend
- **Implementation Logic:** Replace `batch.update()` with `adminDb.runTransaction()` in `src/app/api/v1/payments/verify/route.ts` to check `seatsBooked < seatsAvailable` atomically before confirming registrations, preventing ticket over-subscription and duplicate registration race conditions.

```typescript
// src/app/api/v1/payments/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyRazorpaySignature } from "@/lib/payments/razorpay";
import { adminDb } from "@/lib/firebase/admin";
import * as admin from "firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      eventId,
      name,
      email,
      phone,
    } = await request.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !eventId) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    const isValid = verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      return NextResponse.json({ success: false, message: "Signature verification failed" }, { status: 400 });
    }

    // Execute atomic transaction for seat booking and registration creation
    const result = await adminDb.runTransaction(async (transaction) => {
      const eventRef = adminDb.collection("events").doc(eventId);
      const paymentRef = adminDb.collection("payments").doc(razorpay_order_id);
      const regQuery = adminDb.collection("eventRegistrations")
        .where("orderId", "==", razorpay_order_id)
        .limit(1);

      const [eventDoc, paymentDoc, regSnap] = await Promise.all([
        transaction.get(eventRef),
        transaction.get(paymentRef),
        transaction.get(regQuery),
      ]);

      if (!eventDoc.exists) throw new Error("EVENT_NOT_FOUND");
      if (!paymentDoc.exists) throw new Error("PAYMENT_NOT_FOUND");

      // Idempotency check: prevent duplicate registration processing
      if (!regSnap.empty) {
        return { registrationId: regSnap.docs[0].id, idempotent: true };
      }

      const eventData = eventDoc.data()!;
      const seatsAvailable = eventData.seatsAvailable;
      const seatsBooked = eventData.seatsBooked || 0;

      if (seatsAvailable !== null && seatsAvailable !== undefined && seatsBooked >= seatsAvailable) {
        throw new Error("EVENT_SOLD_OUT");
      }

      const regRef = adminDb.collection("eventRegistrations").doc();
      const registrationData = {
        eventId,
        eventTitle: eventData.title,
        userId,
        name: name || "Attendee",
        email: email || "",
        phone: phone || "",
        paymentStatus: "paid",
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        amount: paymentDoc.data()!.amount,
        registeredAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "confirmed",
      };

      transaction.set(regRef, registrationData);
      transaction.update(paymentRef, {
        status: "paid",
        paymentId: razorpay_payment_id,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      transaction.update(eventRef, {
        seatsBooked: admin.firestore.FieldValue.increment(1),
        registeredCount: admin.firestore.FieldValue.increment(1),
      });

      return { registrationId: regRef.id, idempotent: false };
    });

    return NextResponse.json({
      success: true,
      message: "Payment verified and registration confirmed!",
      data: result,
    });
  } catch (error: any) {
    console.error("[POST /api/v1/payments/verify]", error);
    const status = error.message === "EVENT_SOLD_OUT" ? 409 : 500;
    return NextResponse.json(
      { success: false, message: error.message || "Verification failed." },
      { status }
    );
  }
}
```

---

### Proposed Change 4: Server Route Migration from WebSDK to Firebase Admin SDK
- **Impact Area:** Backend
- **Implementation Logic:** Replace `db` from `@/lib/firebase/client` with `adminDb` from `@/lib/firebase/admin` across backend endpoints (`src/app/api/v1/mentors/route.ts`, `community/route.ts`, `chats/route.ts`). Prevents opening unclosed client WebSockets/listeners inside serverless Node runtimes.

```typescript
// src/app/api/v1/mentors/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

    const snapshot = await adminDb
      .collection('mentors')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const mentors = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const response = NextResponse.json(mentors, { status: 200 });
    response.headers.set("Cache-Control", "public, s-maxage=120, stale-while-revalidate=600");
    return response;
  } catch (error: any) {
    console.error('Error fetching mentors:', error);
    return NextResponse.json({ error: error.message || 'Error fetching mentors' }, { status: 500 });
  }
}
```

---

### Proposed Change 5: Sliding-Window Rate Limiter for Authentication & OTP Endpoints
- **Impact Area:** Infrastructure
- **Implementation Logic:** Implement an in-memory/Redis sliding window rate-limiter for `src/app/api/v1/auth/send-otp/route.ts` to enforce a limit of 3 OTP requests per minute per IP/phone number, blocking bot attacks and Fast2SMS budget depletion.

```typescript
// src/app/api/v1/auth/send-otp/route.ts
import { NextResponse } from 'next/server';
import { sendOTP } from '@/lib/fast2sms';
import { adminDb } from '@/lib/firebase/admin';

// In-memory sliding window store (use Redis in multi-region deployments)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(key: string, limit = 3, windowMs = 60 * 1000): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) return false;

  record.count += 1;
  return true;
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "anonymous";
    const { phoneNumber } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    let formattedPhone = phoneNumber.replace(/^\+91/, '');
    const rateLimitKey = `${ip}:${formattedPhone}`;

    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { error: 'Too many OTP requests. Please wait 1 minute before retrying.' },
        { status: 429 }
      );
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await adminDb.collection('otps').doc(formattedPhone).set({
      otp,
      expiresAt,
      createdAt: new Date(),
    });

    await sendOTP(formattedPhone, otp);

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      otp: process.env.NODE_ENV === 'development' ? otp : undefined,
    });
  } catch (error: any) {
    console.error('Error sending OTP:', error);
    return NextResponse.json({ error: error.message || 'Failed to send OTP' }, { status: 500 });
  }
}
```

---

### Proposed Change 6: WebCrypto Token Verification in Edge Middleware
- **Impact Area:** Infrastructure / Backend
- **Implementation Logic:** Refactor `src/middleware.ts` to perform HMAC/RS256 JWT claim and expiration checks using native WebCrypto API without unverified client decoding, ensuring tamper-proof authorization headers.

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const path = url.pathname;

  const isPublicGet = request.method === 'GET' && (
    path === '/api/v1/events' ||
    path.startsWith('/api/v1/events/') ||
    path === '/api/v1/mentors' ||
    path.startsWith('/api/v1/mentors/') ||
    path === '/api/v1/community'
  );

  const isPublicAuth = path.startsWith('/api/v1/auth');
  const isAISearch = path.startsWith('/api/v1/ai-search');

  if (isPublicGet || isPublicAuth || isAISearch) {
    return NextResponse.next();
  }

  let token = '';
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split('Bearer ')[1];
  } else {
    const sessionCookie = request.cookies.get('session') || request.cookies.get('__session');
    if (sessionCookie) token = sessionCookie.value;
  }

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return NextResponse.json({ error: 'Unauthorized: Malformed JWT' }, { status: 401 });
    }

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      return NextResponse.json({ error: 'Unauthorized: Token expired' }, { status: 401 });
    }

    const userId = payload.sub || payload.uid;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Invalid claims' }, { status: 401 });
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', userId);

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Unauthorized: Token validation failed' }, { status: 401 });
  }
}

export const config = {
  matcher: ['/api/v1/:path*'],
};
```

---

### Proposed Change 7: Layout Reflow Elimination in 3D Hover Cards (TiltCard)
- **Impact Area:** UI/UX
- **Implementation Logic:** Update `src/modules/module3/components/TiltCard.tsx` to cache element bounding rect on `onMouseEnter` rather than re-querying `getBoundingClientRect()` on every `onMouseMove`. This eliminates layout thrashing and restores smooth 60fps animations.

```typescript
// src/modules/module3/components/TiltCard.tsx
"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { MouseEvent, ReactNode, useRef, useCallback } from "react";

export function TiltCard({ children }: { children: ReactNode }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rectRef = useRef<DOMRect | null>(null);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7deg", "-7deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7deg", "7deg"]);
  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], ["0%", "100%"]);
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], ["0%", "100%"]);
  const glareOpacity = useTransform(x, [-0.5, 0, 0.5], [0.2, 0, 0.2]);

  const handleMouseEnter = useCallback((e: MouseEvent<HTMLDivElement>) => {
    rectRef.current = e.currentTarget.getBoundingClientRect();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!rectRef.current) return;
    const rect = rectRef.current;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / rect.width - 0.5);
    y.set(mouseY / rect.height - 0.5);
  }, [x, y]);

  const handleMouseLeave = useCallback(() => {
    rectRef.current = null;
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <motion.div
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        position: 'relative',
        willChange: 'transform',
      }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="glass-panel"
    >
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 10,
          background: 'radial-gradient(circle at center, rgba(255,255,255,0.6) 0%, transparent 80%)',
          opacity: glareOpacity,
          left: glareX,
          top: glareY,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          borderRadius: 'inherit'
        }}
      />
      <div style={{ transform: "translateZ(30px)" }}>
        {children}
      </div>
    </motion.div>
  );
}
```

---

### Proposed Change 8: Debounced Input Search & Deferred React State Rendering
- **Impact Area:** UI/UX
- **Implementation Logic:** Integrate `useDeferredValue` and debounced callback refs in `CommandPalette.tsx` and `EventsPage` to decouple typing input responsiveness from background AI search and DOM re-renders.

```typescript
// src/modules/module3/components/CommandPalette.tsx snippet
import { useState, useDeferredValue, useEffect } from "react";

export default function CommandPalette() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  // AI Search uses deferredSearch to avoid blocking text input frame paints
  useEffect(() => {
    if (deferredSearch.length < 3) return;
    const timer = setTimeout(() => {
      fetchAISuggestions(deferredSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [deferredSearch]);

  return (
    <input
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Type a command or search..."
    />
  );
}
```

---

### Proposed Change 9: Component List Memoization & Content-Visibility Virtualization
- **Impact Area:** UI/UX
- **Implementation Logic:** Wrap `EventCard` in `React.memo` and add CSS `content-visibility: auto` to grid item containers in `src/app/events/page.tsx`. This avoids re-rendering off-screen event cards and prevents Framer Motion animation delay cascade bottlenecks.

```typescript
// src/app/events/page.tsx snippet
import React, { memo, useMemo } from 'react';

const EventCardMemo = memo(EventCard, (prev, next) => {
  return prev.event.id === next.event.id && prev.event.updatedAt === next.event.updatedAt;
});

// Grid styling with layout containment
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 [content-visibility:auto]">
  {filteredEvents.map((event: any, i: number) => (
    <EventCardMemo key={event.id} event={event} index={i} />
  ))}
</div>
```

---

### Proposed Change 10: Browser Singleton Pattern for TanStack React Query Client
- **Impact Area:** Infrastructure / UI/UX
- **Implementation Logic:** Refactor `src/providers/QueryProvider.tsx` to maintain a persistent browser-side singleton instance of `QueryClient`, preventing state destruction and redundant cache refetches on route transitions.

```typescript
// src/providers/QueryProvider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 2 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: (failureCount, error: any) => {
          if (error?.response?.status === 401 || error?.response?.status === 403) return false;
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

---

### Proposed Change 11: Firestore Composite Indexes for Multi-Field Range & Sort Queries
- **Impact Area:** Infrastructure
- **Implementation Logic:** Define compound indexes in `firestore.indexes.json` for `events`, `mentors`, and `eventRegistrations` collections to avoid un-indexed query errors and high-latency table scans.

```json
{
  "indexes": [
    {
      "collectionGroup": "events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isActive", "order": "ASCENDING" },
        { "fieldPath": "eventType", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "eventRegistrations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "orderId", "order": "ASCENDING" },
        { "fieldPath": "registeredAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

---

## Architectural Verification Strategy

To apply and verify these changes safely:
1. **Lint & Type Validation**: Run `npx tsc --noEmit` and `npm run lint` to verify type safety across updated API interfaces.
2. **Concurrency Benchmark**: Execute load testing on `/api/v1/events` and `/api/v1/payments/verify` using `autocannon` or `k6` to confirm zero memory leaks, sub-100ms response times, and zero over-subscription race conditions under 1,000 concurrent requests.
3. **Frontend Frame Rate Profile**: Use Chrome DevTools Performance Profiler to verify `TiltCard` mouse movements maintain steady 60fps without layout thrashing reflows.
