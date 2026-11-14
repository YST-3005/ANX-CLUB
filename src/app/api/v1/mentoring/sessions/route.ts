import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { sessionsRepository } from '@/lib/turso/repositories/sessionsRepository';
import { mentorsRepository } from '@/lib/turso/repositories/mentorsRepository';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/mentoring/sessions
 * Returns sessions for the authenticated user (student or mentor) with strict tenant isolation.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const viewAs = searchParams.get('as'); // 'mentor' or 'student'
    const status = searchParams.get('status') || undefined;

    // Check if user is a mentor
    let mentor = await mentorsRepository.getByUserId(user.uid);
    if (!mentor && user.email) {
      mentor = await mentorsRepository.getByEmail(user.email);
    }

    if (viewAs === 'mentor' || (mentor && viewAs !== 'student')) {
      if (!mentor) {
        return NextResponse.json({ success: false, error: 'User is not registered as a mentor.' }, { status: 403 });
      }
      const sessions = await sessionsRepository.listByMentor(mentor.id, status);
      return NextResponse.json({ success: true, sessions });
    }

    // Default: view as student
    const sessions = await sessionsRepository.listByStudent(user.uid, status);
    return NextResponse.json({ success: true, sessions });
  } catch (error: any) {
    console.error('[GET /api/v1/mentoring/sessions] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
