import { NextRequest, NextResponse } from 'next/server';
import { requireMentorAuth } from '@/lib/mentoring-auth';
import { generateGoogleAuthUrl, isGoogleConfigured } from '@/lib/google-auth';

export async function GET(req: NextRequest) {
  try {
    if (!isGoogleConfigured()) {
      return NextResponse.json(
        { error: 'Google integration is not configured. Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.' },
        { status: 503 }
      );
    }

    const auth = await requireMentorAuth(req);
    if (auth.error) {
      return auth.error;
    }

    const { mentorDocId } = auth;
    const url = generateGoogleAuthUrl(mentorDocId);

    // If client requested JSON, return the URL; otherwise redirect directly
    const acceptHeader = req.headers.get('accept') || '';
    const wantsJson = acceptHeader.includes('application/json') || req.nextUrl.searchParams.get('format') === 'json';

    if (wantsJson) {
      return NextResponse.json({ url });
    }

    return NextResponse.redirect(url);
  } catch (error: any) {
    console.error('[GoogleConnect] Error initiating OAuth flow:', error?.message || error);
    return NextResponse.json({ error: 'Internal server error initiating Google OAuth' }, { status: 500 });
  }
}
