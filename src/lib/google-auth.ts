import crypto from 'crypto';
import { google } from 'googleapis';
import { adminDb } from '@/lib/firebase/admin';

export type GoogleOAuthClient = InstanceType<typeof google.auth.OAuth2>;

/**
 * Derives a 32-byte encryption key for AES-256-GCM.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || process.env.GOOGLE_CLIENT_SECRET || 'anx-mentoring-default-dev-encryption-key-32b';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts sensitive tokens using AES-256-GCM with authenticated tags.
 * Format: iv_hex:auth_tag_hex:ciphertext_hex
 */
export function encryptToken(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts AES-256-GCM ciphertexts. Throws if auth tag verification fails (anti-tamper).
 */
export function decryptToken(cipherPayload: string): string {
  const parts = cipherPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token payload format');
  }

  const [ivHex, tagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(tagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Verifies if Google OAuth environment variables are set.
 */
export function isGoogleConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET
  );
}

/**
 * Returns the configured OAuth2 redirect URI.
 */
export function getGoogleRedirectUri(): string {
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI;
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${appUrl}/api/v1/google/callback`;
}

/**
 * Instantiates a new OAuth2 client.
 */
export function createOAuth2Client(): GoogleOAuthClient {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID || 'dummy-client-id',
    process.env.GOOGLE_CLIENT_SECRET || 'dummy-client-secret',
    getGoogleRedirectUri()
  );
}

/**
 * Generates the Google Calendar OAuth 2.0 Consent URL.
 */
export function generateGoogleAuthUrl(mentorUid: string): string {
  const oauth2Client = createOAuth2Client();
  const scopes = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
    state: mentorUid,
  });
}

/**
 * Stores encrypted Google tokens in Firestore server-side only.
 * Client never receives encrypted tokens or refresh tokens.
 */
export async function saveMentorGoogleTokens(
  mentorUid: string,
  tokens: {
    refresh_token?: string | null;
    access_token?: string | null;
    expiry_date?: number | null;
  },
  email?: string
): Promise<void> {
  if (!adminDb) {
    console.warn('[GoogleAuth] Database connection unavailable.');
    return;
  }

  const tokenDocRef = adminDb.collection('mentorGoogleTokens').doc(mentorUid);
  const existingDoc = await tokenDocRef.get();
  const existingData = existingDoc.exists ? existingDoc.data() : null;

  // Preserve existing encrypted refresh token if not returned on re-auth
  let encryptedRefreshToken = existingData?.encryptedRefreshToken || null;
  if (tokens.refresh_token) {
    encryptedRefreshToken = encryptToken(tokens.refresh_token);
  }

  const encryptedAccessToken = tokens.access_token ? encryptToken(tokens.access_token) : null;

  await tokenDocRef.set({
    mentorUid,
    encryptedRefreshToken,
    encryptedAccessToken,
    expiryDate: tokens.expiry_date || null,
    email: email || existingData?.email || null,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  // Update public mentor status (safe for clients to see)
  const statusUpdate = {
    googleCalendarConnected: Boolean(encryptedRefreshToken),
    googleCalendarEmail: email || existingData?.email || null,
    googleCalendarNeedsReconnect: false,
    updatedAt: new Date().toISOString(),
  };

  await Promise.allSettled([
    adminDb.collection('mentors').doc(mentorUid).set(statusUpdate, { merge: true }),
    adminDb.collection('users').doc(mentorUid).set(statusUpdate, { merge: true }),
  ]);
}

/**
 * Loads and decrypts tokens, returning an authenticated OAuth2 client.
 * If credentials are invalid or revoked, flags the mentor account as needing reconnect.
 */
export async function getMentorOAuthClient(mentorUid: string): Promise<GoogleOAuthClient | null> {
  if (!isGoogleConfigured() || !adminDb) {
    return null;
  }

  try {
    const tokenDoc = await adminDb.collection('mentorGoogleTokens').doc(mentorUid).get();
    if (!tokenDoc.exists) {
      return null;
    }

    const data = tokenDoc.data();
    if (!data?.encryptedRefreshToken) {
      return null;
    }

    const refreshToken = decryptToken(data.encryptedRefreshToken);
    const oauth2Client = createOAuth2Client();

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    // Auto-listen for new tokens to save refreshed credentials
    oauth2Client.on('tokens', async (newTokens) => {
      try {
        if (newTokens.refresh_token || newTokens.access_token) {
          await saveMentorGoogleTokens(mentorUid, newTokens, data.email);
        }
      } catch (err) {
        console.error('[GoogleAuth] Error saving auto-refreshed tokens:', err);
      }
    });

    return oauth2Client;
  } catch (error: any) {
    console.error(`[GoogleAuth] Error initializing OAuth client for mentor ${mentorUid}:`, error?.message || error);
    
    // Check if revoked or expired
    if (error?.message?.includes('invalid_grant') || error?.message?.includes('revoked')) {
      await markMentorNeedsReconnect(mentorUid);
    }
    return null;
  }
}

/**
 * Marks a mentor's Google integration as needing reconnection.
 */
export async function markMentorNeedsReconnect(mentorUid: string): Promise<void> {
  if (!adminDb) return;
  const update = {
    googleCalendarConnected: false,
    googleCalendarNeedsReconnect: true,
    updatedAt: new Date().toISOString(),
  };

  await Promise.allSettled([
    adminDb.collection('mentors').doc(mentorUid).set(update, { merge: true }),
    adminDb.collection('users').doc(mentorUid).set(update, { merge: true }),
  ]);
}

/**
 * Disconnects Google Calendar and revokes tokens.
 */
export async function disconnectMentorGoogle(mentorUid: string): Promise<void> {
  if (!adminDb) return;

  try {
    const tokenDoc = await adminDb.collection('mentorGoogleTokens').doc(mentorUid).get();
    if (tokenDoc.exists) {
      const data = tokenDoc.data();
      if (data?.encryptedRefreshToken) {
        try {
          const refreshToken = decryptToken(data.encryptedRefreshToken);
          const oauth2Client = createOAuth2Client();
          await oauth2Client.revokeToken(refreshToken);
        } catch (revokeErr) {
          console.warn('[GoogleAuth] Non-fatal token revocation error:', revokeErr);
        }
      }
      await adminDb.collection('mentorGoogleTokens').doc(mentorUid).delete();
    }
  } catch (err) {
    console.error('[GoogleAuth] Error during disconnect:', err);
  }

  const resetData = {
    googleCalendarConnected: false,
    googleCalendarEmail: null,
    googleCalendarNeedsReconnect: false,
    updatedAt: new Date().toISOString(),
  };

  await Promise.allSettled([
    adminDb.collection('mentors').doc(mentorUid).set(resetData, { merge: true }),
    adminDb.collection('users').doc(mentorUid).set(resetData, { merge: true }),
  ]);
}
