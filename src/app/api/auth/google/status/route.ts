import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { mentorsRepository } from '@/lib/turso/repositories/mentorsRepository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let mentor = await mentorsRepository.getByUserId(user.uid);
    if (!mentor && user.email) {
      mentor = await mentorsRepository.getByEmail(user.email);
    }

    if (!mentor) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: User is not a registered mentor.' },
        { status: 403 }
      );
    }

    const profile = await mentorsRepository.getProfile(mentor.id);
    const isConnected = await mentorsRepository.isGoogleCalendarConnected(mentor.id);

    return NextResponse.json({
      success: true,
      connected: isConnected,
      mentorId: mentor.id,
      updatedAt: profile?.updated_at || null,
    });
  } catch (error: any) {
    console.error('[GET /api/auth/google/status] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to check Google Calendar status.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let mentor = await mentorsRepository.getByUserId(user.uid);
    if (!mentor && user.email) {
      mentor = await mentorsRepository.getByEmail(user.email);
    }

    if (!mentor) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: User is not a registered mentor.' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    if (body.action === 'disconnect') {
      await mentorsRepository.clearGoogleOAuthTokens(mentor.id);
      return NextResponse.json({
        success: true,
        message: 'Google Calendar disconnected successfully.',
        connected: false,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('[POST /api/auth/google/status] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update Google Calendar connection.' },
      { status: 500 }
    );
  }
}
