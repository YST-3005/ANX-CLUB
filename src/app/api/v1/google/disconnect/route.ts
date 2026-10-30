import { NextRequest, NextResponse } from 'next/server';
import { requireMentorAuth } from '@/lib/mentoring-auth';
import { disconnectMentorGoogle } from '@/lib/google-auth';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireMentorAuth(req);
    if (auth.error) {
      return auth.error;
    }

    const { mentorDocId } = auth;
    await disconnectMentorGoogle(mentorDocId);

    return NextResponse.json({
      success: true,
      message: 'Google Calendar disconnected successfully.',
    });
  } catch (error: any) {
    console.error('[GoogleDisconnect] Error disconnecting Google Calendar:', error?.message || error);
    return NextResponse.json({ error: 'Failed to disconnect Google Calendar' }, { status: 500 });
  }
}
