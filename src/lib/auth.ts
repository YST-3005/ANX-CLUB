import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { usersRepository, UserRow } from "@/lib/turso/repositories/usersRepository";
import { mentorsRepository, MentorRow } from "@/lib/turso/repositories/mentorsRepository";

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  role: string;
  membershipType: string;
  mentorId?: string;
}

/**
 * Extracts Bearer token from Request / NextRequest
 */
export function extractBearerToken(request: NextRequest | Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.split("Bearer ")[1].trim();
  }

  // NextRequest cookies fallback
  if ("cookies" in request) {
    const req = request as NextRequest;
    const sessionCookie = req.cookies.get("session") || req.cookies.get("__session");
    if (sessionCookie) return sessionCookie.value.trim();
  } else {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)(?:session|__session)=([^;]*)/);
      if (match) return decodeURIComponent(match[1]).trim();
    }
  }

  return null;
}

/**
 * Cryptographically verifies Firebase ID token and returns authenticated UID.
 * Rejects insecure mock tokens and backdoors.
 */
export async function authenticate(request: NextRequest | Request): Promise<string | null> {
  const token = extractBearerToken(request);
  if (!token) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid;
  } catch (err: any) {
    console.warn(`[authenticate] Token verification failed: ${err?.message || err}`);
    return null;
  }
}

/**
 * Returns full authenticated user profile with authoritative Turso role.
 * Security principles:
 * - Firebase establishes WHO the user is (UID).
 * - Turso authoritative database determines WHAT the user is allowed to do (role, membership).
 * - Fails closed when Turso lookups fail.
 * - Idempotently provisions new users as ordinary Members.
 * - Resolves mentor identity strictly via mentors.user_id matching the verified UID.
 */
export async function authenticateUser(request: NextRequest | Request): Promise<AuthenticatedUser | null> {
  const token = extractBearerToken(request);
  if (!token) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;
    const email = decoded.email || '';

    // Load authoritative user profile from Turso database
    let dbUser: UserRow | null = null;
    try {
      dbUser = await usersRepository.getById(uid);
      if (!dbUser) {
        // Idempotently provision verified Firebase user as an ordinary Member
        dbUser = await usersRepository.provisionMember({
          id: uid,
          email: email || `user_${uid}@anx.club`,
          full_name: decoded.name || decoded.display_name || (email ? email.split('@')[0] : 'Member'),
        });
      }
    } catch (dbErr: any) {
      console.error('[authenticateUser] Turso database query failed (failing closed):', dbErr?.message || dbErr);
      // Fail closed when Turso authorization lookups fail
      return null;
    }

    if (!dbUser) {
      return null;
    }

    // Role and membership are strictly authoritative from Turso
    const role = dbUser.role || 'Member';
    const membershipType = dbUser.membership_type || 'free';

    // If role is Mentor, resolve mentor profile strictly via mentors.user_id
    let mentorId: string | undefined;
    if (role.toLowerCase() === 'mentor') {
      try {
        const mentor = await mentorsRepository.getByUserId(uid);
        if (mentor) {
          mentorId = mentor.id;
        }
      } catch (mentorErr) {
        console.warn('[authenticateUser] Failed to fetch mentor profile for mentor user:', mentorErr);
      }
    }

    return {
      uid,
      email,
      role,
      membershipType,
      mentorId,
    };
  } catch (err: any) {
    console.warn(`[authenticateUser] Token verification failed: ${err?.message || err}`);
    return null;
  }
}

/**
 * Gate helper: requires authenticated user or returns 401
 */
export async function requireAuth(
  request: NextRequest | Request
): Promise<{ user: AuthenticatedUser } | { response: NextResponse }> {
  const user = await authenticateUser(request);
  if (!user) {
    return {
      response: NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authentication token.' } },
        { status: 401 }
      ),
    };
  }
  return { user };
}

/**
 * Gate helper: requires authenticated Admin or returns 403.
 * Strictly verifies authoritative Turso Admin role.
 * Prohibits email pattern matching, hardcoded UIDs, or token claim bypasses.
 */
export async function requireAdmin(
  request: NextRequest | Request
): Promise<{ user: AuthenticatedUser } | { response: NextResponse }> {
  const authRes = await requireAuth(request);
  if ('response' in authRes) return authRes;

  const user = authRes.user;
  const isAdmin = user.role.toLowerCase() === 'admin';

  if (!isAdmin) {
    return {
      response: NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin authorization required.' } },
        { status: 403 }
      ),
    };
  }

  return { user };
}

/**
 * Gate helper: requires authenticated Mentor or returns 403.
 * Strictly requires a genuine Mentor role in Turso and a mentor record whose user_id matches the Firebase UID.
 * Prohibits email matching alone and never creates synthetic mentor identities for Admin users.
 */
export async function requireMentor(
  request: NextRequest | Request
): Promise<{ user: AuthenticatedUser; mentor: MentorRow } | { response: NextResponse }> {
  const authRes = await requireAuth(request);
  if ('response' in authRes) return authRes;

  const user = authRes.user;
  if (user.role.toLowerCase() !== 'mentor') {
    return {
      response: NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Mentor role required to perform this action.' } },
        { status: 403 }
      ),
    };
  }

  const mentor = await mentorsRepository.getByUserId(user.uid);
  if (!mentor) {
    return {
      response: NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Active mentor profile not found for this account.' } },
        { status: 403 }
      ),
    };
  }

  return { user, mentor };
}
