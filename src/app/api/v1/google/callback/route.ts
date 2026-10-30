import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createOAuth2Client, saveMentorGoogleTokens, isGoogleConfigured } from '@/lib/google-auth';

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state'); // Contains mentorUid
  const error = url.searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${url.protocol}//${url.host}`;
  const profileUrl = `${appUrl}/mentor-dashboard/profile`;

  if (error) {
    console.warn('[GoogleCallback] OAuth access denied or cancelled by user:', error);
    return NextResponse.redirect(`${profileUrl}?google=cancelled&error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${profileUrl}?google=error&error=missing_code_or_state`);
  }

  if (!isGoogleConfigured()) {
    return NextResponse.redirect(`${profileUrl}?google=error&error=not_configured`);
  }

  try {
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    let email: string | undefined;
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client as any });
      const userInfo = await oauth2.userinfo.get();
      email = userInfo.data.email || undefined;
    } catch (profileErr) {
      console.warn('[GoogleCallback] Could not fetch Google user email:', profileErr);
    }

    const mentorUid = state.trim();
    await saveMentorGoogleTokens(mentorUid, tokens, email);

    return NextResponse.redirect(`${profileUrl}?google=connected`);
  } catch (err: any) {
    console.error('[GoogleCallback] Error exchanging OAuth code:', err?.message || err);
    return NextResponse.redirect(`${profileUrl}?google=error&error=${encodeURIComponent(err?.message || 'token_exchange_failed')}`);
  }
}
