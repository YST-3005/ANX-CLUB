import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { mentorsRepository } from '@/lib/turso/repositories/mentorsRepository';
import { getGoogleAuthUrl } from '@/lib/google/calendar';
import { signOAuthState } from '@/lib/security/encryption';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Authentication required.' }, { status: 401 });
    }

    // Resolve authoritative mentor record
    let mentor = await mentorsRepository.getByUserId(user.uid);
    if (!mentor && user.email) {
      mentor = await mentorsRepository.getByEmail(user.email);
    }

    if (!mentor) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only registered mentors can connect a Google Calendar.' },
        { status: 403 }
      );
    }

    // Generate signed CSRF state binding the mentor ID and authenticated user UID
    const state = signOAuthState({ mentorId: mentor.id, userId: user.uid });

    // Generate authorization URL
    const authUrl = getGoogleAuthUrl(state);

    const isHtmlNavigation = request.headers.get('accept')?.includes('text/html');

    const response = isHtmlNavigation
      ? NextResponse.redirect(authUrl)
      : NextResponse.json({ success: true, url: authUrl });

    // Set secure httpOnly cookie with state for verification
    response.cookies.set('anx_google_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60, // 15 minutes
    });

    return response;
  } catch (error: any) {
    console.error('[GET /api/auth/google] Error initiating OAuth:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to initiate Google Calendar connection.' },
      { status: 500 }
    );
  }
}
