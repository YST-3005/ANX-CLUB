import { adminAuth, adminDb } from './admin';
import { usersRepository } from '@/lib/turso/repositories/usersRepository';

export interface VerifiedUser {
  uid: string;
  email?: string;
  role?: string;
}

/**
 * Extracts and verifies the Firebase ID token from Authorization header or session cookies.
 * Authoritative role is strictly resolved from the Turso operational database.
 * Security principles:
 * - Fails closed on database lookup errors.
 * - Idempotently provisions new users as ordinary Members in Turso.
 * - Prohibits client-supplied roles, Firestore role fallbacks, and email pattern Admin promotions.
 */
export async function verifyAuthToken(request: Request): Promise<VerifiedUser | null> {
  try {
    const authHeader = request.headers.get('Authorization');
    let token = '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split('Bearer ')[1]?.trim();
    } else {
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        const match = cookieHeader.match(/(?:^|;\s*)(?:session|__session)=([^;]*)/);
        if (match) token = decodeURIComponent(match[1]).trim();
      }
    }

    if (!token) return null;

    let decodedToken: any = null;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (err: any) {
      console.warn(`[verifyAuthToken] Token verification failed: ${err?.message || err}`);
      return null;
    }

    if (!decodedToken || !decodedToken.uid) {
      return null;
    }

    const uid = decodedToken.uid;
    const email = decodedToken.email || '';

    // Authoritative role lookup from Turso database (fail closed on failure)
    let dbUser: any = null;
    try {
      dbUser = await usersRepository.getById(uid);
      if (!dbUser) {
        dbUser = await usersRepository.provisionMember({
          id: uid,
          email: email || `user_${uid}@anx.club`,
          full_name: decodedToken.name || decodedToken.display_name || (email ? email.split('@')[0] : 'Member'),
        });
      }
    } catch (dbErr: any) {
      console.error('[verifyAuthToken] Authoritative Turso role lookup failed (failing closed):', dbErr?.message || dbErr);
      return null;
    }

    if (!dbUser) {
      return null;
    }

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: dbUser.role || 'Member',
    };
  } catch (error: any) {
    console.warn(`[verifyAuthToken] Error: ${error?.message || error}`);
    return null;
  }
}
