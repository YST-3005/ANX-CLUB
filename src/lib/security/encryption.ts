import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard recommended IV length for GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Derives a 32-byte AES key from the mandatory TOKEN_ENCRYPTION_KEY environment variable.
 * Fails securely if TOKEN_ENCRYPTION_KEY is missing or empty.
 * No hardcoded defaults or fallbacks to other keys (e.g. CRON_SECRET).
 */
export function getEncryptionKey(): Buffer {
  const secret = process.env.TOKEN_ENCRYPTION_KEY;
  if (!secret || secret.trim().length === 0) {
    throw new Error('TOKEN_ENCRYPTION_KEY is required and not configured.');
  }
  return crypto.createHash('sha256').update(secret.trim()).digest();
}

/**
 * Encrypts a sensitive string (e.g., OAuth refresh token, access token) using AES-256-GCM.
 * Output format: v1:iv_hex:tag_hex:ciphertext_hex
 * Fails securely if TOKEN_ENCRYPTION_KEY is missing.
 */
export function encryptToken(plainText: string): string {
  if (!plainText) return '';

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `v1:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted token.
 * Strictly rejects unencrypted/legacy strings. Silent plaintext acceptance is completely removed.
 * Never logs raw or decrypted tokens.
 */
export function decryptToken(cipherText: string | null | undefined): string | null {
  if (!cipherText || typeof cipherText !== 'string') return null;

  // Strict check: versioned encrypted format only
  if (!cipherText.startsWith('v1:')) {
    console.warn('[Encryption] Rejected unencrypted or legacy token. Explicit migration required.');
    return null;
  }

  try {
    const parts = cipherText.split(':');
    if (parts.length !== 4) {
      console.warn('[Encryption] Invalid token format parts.');
      return null;
    }

    const [, ivHex, tagHex, encryptedHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err: any) {
    console.error('[Encryption] Failed to decrypt token:', err?.message || 'Decryption error');
    return null;
  }
}

/**
 * Creates a cryptographically signed state token for OAuth CSRF protection.
 * Requires TOKEN_ENCRYPTION_KEY. Token expires in 15 minutes.
 */
export function signOAuthState(payload: { mentorId: string; userId: string; [key: string]: any }): string {
  const secret = process.env.TOKEN_ENCRYPTION_KEY;
  if (!secret || secret.trim().length === 0) {
    throw new Error('TOKEN_ENCRYPTION_KEY is required and not configured for OAuth state signing.');
  }

  const statePayload = {
    mentorId: payload.mentorId,
    userId: payload.userId,
    iat: Date.now(),
    exp: Date.now() + 15 * 60 * 1000, // 15 minutes
    nonce: crypto.randomBytes(16).toString('hex'),
  };

  const payloadBase64 = Buffer.from(JSON.stringify(statePayload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret.trim()).update(payloadBase64).digest('base64url');

  return `${payloadBase64}.${signature}`;
}

/**
 * Verifies and decodes a signed OAuth state token.
 * Rejects tampered, malformed, or expired states.
 * Fails securely if TOKEN_ENCRYPTION_KEY is missing.
 */
export function verifyOAuthState(
  stateString: string
): { mentorId: string; userId: string; exp: number; nonce: string } | null {
  if (!stateString || typeof stateString !== 'string') return null;

  const secret = process.env.TOKEN_ENCRYPTION_KEY;
  if (!secret || secret.trim().length === 0) {
    console.warn('[OAuthState] TOKEN_ENCRYPTION_KEY missing during state verification');
    return null;
  }

  const parts = stateString.split('.');
  if (parts.length !== 2) return null;

  const [payloadBase64, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', secret.trim()).update(payloadBase64).digest('base64url');

  // Constant-time comparison
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    console.warn('[OAuthState] Invalid state signature detected');
    return null;
  }

  try {
    const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf8');
    const data = JSON.parse(payloadJson);

    // Expiry check
    if (!data.exp || typeof data.exp !== 'number' || Date.now() > data.exp) {
      console.warn('[OAuthState] OAuth state has expired');
      return null;
    }

    if (!data.mentorId || !data.userId) {
      return null;
    }

    return {
      mentorId: data.mentorId,
      userId: data.userId,
      exp: data.exp,
      nonce: data.nonce || '',
    };
  } catch (err: any) {
    console.warn('[OAuthState] Failed to parse state payload:', err?.message || 'Parse error');
    return null;
  }
}
