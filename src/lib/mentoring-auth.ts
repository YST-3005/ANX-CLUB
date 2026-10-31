import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { authenticate } from '@/lib/auth';
import { MentorRequest, MentoringSession } from '@/types/mentoring';

export interface AuthenticatedUser {
  uid: string;
  email: string;
  role: string;
  fullName: string;
  isOfficialAdmin: boolean;
}

/**
 * Resolves the authenticated user from the incoming request.
 * Returns null if not authenticated.
 */
export async function getAuthenticatedUser(req: NextRequest | Request): Promise<AuthenticatedUser | null> {
  const uid = await authenticate(req);
  if (!uid) return null;

  try {
    let email = '';
    let fullName = 'Member';
    let role = 'Member';

    try {
      const userSnap = await adminDb.collection('users').doc(uid).get();
      if (userSnap.exists) {
        const data = userSnap.data() || {};
        email = (data.email || '').toLowerCase().trim();
        fullName = data.fullName || data.displayName || 'Member';
        role = data.role || 'Member';
      }
    } catch (dbErr: any) {
      console.warn(`[getAuthenticatedUser] Firestore profile unavailable: ${dbErr?.message || dbErr}`);
    }

    // If profile not found in Firestore or Firestore unavailable, fall back to Firebase Auth record
    if (!email) {
      try {
        const authRecord = await adminAuth.getUser(uid);
        if (authRecord) {
          email = (authRecord.email || '').toLowerCase().trim();
          fullName = authRecord.displayName || (email ? email.split('@')[0] : fullName);
          if (authRecord.customClaims?.role) {
            role = authRecord.customClaims.role;
          }
        }
      } catch (authErr) {
        // UID could be a mock or test user
        if (uid.includes('@')) {
          email = uid.toLowerCase();
          fullName = uid.split('@')[0];
        }
      }
    }

    const isOfficialAdmin = email === 'admin@algorithmaliens.com' ||
      email === 'admin@anx.club' ||
      email.startsWith('admin@') ||
      role === 'Admin';

    return {
      uid,
      email,
      role: isOfficialAdmin ? 'Admin' : role,
      fullName,
      isOfficialAdmin,
    };
  } catch (error) {
    console.error('[getAuthenticatedUser] Error resolving user profile:', error);
    return null;
  }
}

/**
 * Enforces that the caller has 'Mentor' or 'Admin' role.
 * Returns { user, mentorDocId } or an immediate NextResponse error (401/403).
 */
export async function requireMentorAuth(req: NextRequest | Request): Promise<
  | { user: AuthenticatedUser; mentorDocId: string; error?: never }
  | { error: NextResponse; user?: never; mentorDocId?: never }
> {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required' },
        { status: 401 }
      ),
    };
  }

  const isMentor = user.role === 'Mentor' || user.isOfficialAdmin;
  if (!isMentor) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Forbidden: Mentor privileges required' },
        { status: 403 }
      ),
    };
  }

  // Resolve mentor profile doc ID if different from uid
  let mentorDocId = user.uid;
  if (user.email) {
    try {
      const mentorSnap = await adminDb
        .collection('mentors')
        .where('ownerEmail', '==', user.email)
        .limit(1)
        .get();
      if (!mentorSnap.empty) {
        mentorDocId = mentorSnap.docs[0].id;
      }
    } catch (mentorErr) {
      console.warn('[requireMentorAuth] Could not query mentor profile from Firestore:', mentorErr);
    }
  }

  return { user, mentorDocId };
}

/**
 * Enforces that the caller is authenticated as a student (or admin).
 */
export async function requireStudentAuth(req: NextRequest | Request): Promise<
  | { user: AuthenticatedUser; error?: never }
  | { error: NextResponse; user?: never }
> {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required' },
        { status: 401 }
      ),
    };
  }

  return { user };
}

interface VerificationOptions {
  allowStudent?: boolean;
  allowMentor?: boolean;
}

/**
 * IDOR-safe access verification for mentorRequests.
 * Returns 404 (preventing resource existence leaking) if user does not have permission.
 */
export async function verifyRequestAccess(
  req: NextRequest | Request,
  requestId: string,
  options: VerificationOptions = { allowStudent: true, allowMentor: true }
): Promise<
  | {
      user: AuthenticatedUser;
      request: MentorRequest;
      isMentor: boolean;
      isStudent: boolean;
      isAdmin: boolean;
      error?: never;
    }
  | { error: NextResponse; user?: never; request?: never; isMentor?: never; isStudent?: never; isAdmin?: never }
> {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      ),
    };
  }

  const docRef = adminDb.collection('mentorRequests').doc(requestId);
  const snap = await docRef.get();

  if (!snap.exists) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Mentoring request not found' },
        { status: 404 }
      ),
    };
  }

  const data = snap.data() || {};
  const request: MentorRequest = {
    id: snap.id,
    ...(data as any),
  };

  const isAdmin = user.isOfficialAdmin;
  const isStudent =
    request.studentId === user.uid ||
    request.memberId === user.uid ||
    request.userId === user.uid;
  const isMentor =
    request.mentorId === user.uid ||
    Boolean(request.mentorEmail && request.mentorEmail.toLowerCase() === user.email.toLowerCase());

  // Check authorization with strict IDOR prevention: return 404 so caller cannot deduce resource existence
  const authorized =
    isAdmin ||
    (options.allowStudent && isStudent) ||
    (options.allowMentor && isMentor);

  if (!authorized) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Mentoring request not found' },
        { status: 404 }
      ),
    };
  }

  return {
    user,
    request,
    isMentor,
    isStudent,
    isAdmin,
  };
}

/**
 * IDOR-safe access verification for mentoringSessions.
 * Single source of truth for scheduled sessions.
 * Returns 404 if user does not have permission.
 */
export async function verifySessionAccess(
  req: NextRequest | Request,
  sessionId: string,
  options: VerificationOptions = { allowStudent: true, allowMentor: true }
): Promise<
  | {
      user: AuthenticatedUser;
      session: MentoringSession;
      isMentor: boolean;
      isStudent: boolean;
      isAdmin: boolean;
      error?: never;
    }
  | { error: NextResponse; user?: never; session?: never; isMentor?: never; isStudent?: never; isAdmin?: never }
> {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      ),
    };
  }

  // Check mentoringSessions, fallback to mentorSessions for backwards compatibility
  let snap = await adminDb.collection('mentoringSessions').doc(sessionId).get();
  if (!snap.exists) {
    snap = await adminDb.collection('mentorSessions').doc(sessionId).get();
  }

  if (!snap.exists) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Mentoring session not found' },
        { status: 404 }
      ),
    };
  }

  const data = snap.data() || {};
  const session: MentoringSession = {
    id: snap.id,
    ...(data as any),
  };

  const isAdmin = user.isOfficialAdmin;
  const isStudent =
    session.studentId === user.uid ||
    session.memberId === user.uid ||
    session.userId === user.uid;
  const isMentor =
    session.mentorId === user.uid ||
    Boolean(session.mentorEmail && session.mentorEmail.toLowerCase() === user.email.toLowerCase());

  const authorized =
    isAdmin ||
    (options.allowStudent && isStudent) ||
    (options.allowMentor && isMentor);

  if (!authorized) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Mentoring session not found' },
        { status: 404 }
      ),
    };
  }

  return {
    user,
    session,
    isMentor,
    isStudent,
    isAdmin,
  };
}
