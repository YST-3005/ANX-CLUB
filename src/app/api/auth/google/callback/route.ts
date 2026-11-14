import { NextRequest, NextResponse } from 'next/server';
import { verifyOAuthState } from '@/lib/security/encryption';
import { exchangeCodeForTokens } from '@/lib/google/calendar';
import { mentorsRepository } from '@/lib/turso/repositories/mentorsRepository';
import { oauthStatesRepository } from '@/lib/turso/repositories/oauthStatesRepository';
import { authenticateUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const origin = new URL(request.url).origin;
  const dashboardRedirect = (params: Record<string, string>) => {
    const url = new URL('/mentor/dashboard', origin);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const response = NextResponse.redirect(url.toString());
    response.cookies.delete('anx_google_oauth_state');
    return response;
  };

  // 1. Handle user cancellation or OAuth error from Google
  if (error) {
    console.warn(`[GoogleCallback] OAuth error from provider: ${error}`);
    return dashboardRedirect({
      calendar: 'error',
      message: error === 'access_denied' ? 'Authorization cancelled by user.' : (errorDescription || error),
    });
  }

  // 2. Validate mandatory parameters
  if (!code || !state) {
    return dashboardRedirect({
      calendar: 'error',
      message: 'Missing authorization code or state parameter.',
    });
  }

  // 3. Require the anx_google_oauth_state HTTP-only cookie
  const stateCookie = request.cookies.get('anx_google_oauth_state')?.value;
  if (!stateCookie) {
    console.warn('[GoogleCallback] Missing anx_google_oauth_state cookie. CSRF validation failed.');
    return dashboardRedirect({
      calendar: 'error',
      message: 'Missing state cookie. CSRF validation failed.',
    });
  }

  // Reject if the cookie differs from the returned state
  if (stateCookie !== state) {
    console.warn('[GoogleCallback] State cookie mismatch detected.');
    return dashboardRedirect({
      calendar: 'error',
      message: 'State cookie mismatch. CSRF validation failed.',
    });
  }

  // 4. Verify HMAC signature and expiry
  const verifiedState = verifyOAuthState(state);
  if (!verifiedState) {
    console.error('[GoogleCallback] Invalid, expired, or tampered OAuth state.');
    return dashboardRedirect({
      calendar: 'error',
      message: 'OAuth security check failed: Invalid or expired state.',
    });
  }

  // 5. One-time state consumption to prevent replay attacks
  const wasConsumed = await oauthStatesRepository.consume(state, verifiedState);
  if (!wasConsumed) {
    console.warn('[GoogleCallback] OAuth state replay attempt detected.');
    return dashboardRedirect({
      calendar: 'error',
      message: 'OAuth security check failed: State has already been used (replay detected).',
    });
  }

  // 6. Verify mentor profile exists in Turso and database ownership
  const { mentorId, userId } = verifiedState;
  const mentor = await mentorsRepository.getById(mentorId);
  if (!mentor) {
    return dashboardRedirect({
      calendar: 'error',
      message: 'Mentor profile not found in database.',
    });
  }

  // Strict ownership check: verifiedState.userId must match mentor's user_id in database
  if (!mentor.user_id || mentor.user_id !== userId) {
    console.error('[GoogleCallback] Mentor ownership mismatch between state and database.');
    return dashboardRedirect({
      calendar: 'error',
      message: 'Unauthorized: State user does not match mentor profile owner.',
    });
  }

  // If active user session exists on callback request, verify UID matches
  const currentUser = await authenticateUser(request).catch(() => null);
  if (currentUser && currentUser.uid !== userId) {
    console.error('[GoogleCallback] Active session user does not match OAuth state user.');
    return dashboardRedirect({
      calendar: 'error',
      message: 'Unauthorized: Active user session does not match OAuth initiator.',
    });
  }

  try {
    // 7. Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens) {
      throw new Error('Failed to retrieve OAuth tokens from Google.');
    }

    // 8. Refresh-token handling
    // Google may omit refresh_token if the user has previously granted consent
    const hasNewRefreshToken = Boolean(tokens.refresh_token && tokens.refresh_token.trim().length > 0);
    const existingProfile = await mentorsRepository.getProfile(mentorId);
    const hasExistingRefreshToken = Boolean(
      existingProfile?.google_refresh_token && existingProfile.google_refresh_token.trim().length > 0
    );

    if (!hasNewRefreshToken && !hasExistingRefreshToken) {
      console.warn(`[GoogleCallback] Neither new nor existing refresh token available for mentor ${mentorId}`);
      return dashboardRedirect({
        calendar: 'error',
        message: 'Google did not provide an offline refresh token and no previous token exists. Please disconnect Google Calendar and re-authorize with consent.',
      });
    }

    // 9. Store tokens securely (both access token and refresh token are encrypted in mentorsRepository)
    // Preserves existing refresh token if Google omitted a new one
    await mentorsRepository.saveGoogleOAuthTokens(mentorId, {
      refreshToken: tokens.refresh_token || undefined,
      accessToken: tokens.access_token || undefined,
      expiryDate: tokens.expiry_date || undefined,
    });

    // 10. Verify that the account is legitimately connected and decryptable
    const isConnected = await mentorsRepository.isGoogleCalendarConnected(mentorId);
    if (!isConnected) {
      return dashboardRedirect({
        calendar: 'error',
        message: 'Failed to verify stored Google Calendar credentials.',
      });
    }

    console.log(`[GoogleCallback] Successfully connected Google Calendar for mentor ${mentorId}`);

    return dashboardRedirect({
      calendar: 'connected',
    });
  } catch (err: any) {
    console.error('[GoogleCallback] Error exchanging authorization code:', err?.message || 'Exchange failed');
    return dashboardRedirect({
      calendar: 'error',
      message: err?.message || 'Failed to exchange authorization code for credentials.',
    });
  }
}
