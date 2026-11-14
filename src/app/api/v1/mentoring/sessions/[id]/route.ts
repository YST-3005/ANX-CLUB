import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { sessionsRepository } from '@/lib/turso/repositories/sessionsRepository';
import { mentorsRepository } from '@/lib/turso/repositories/mentorsRepository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const session = await sessionsRepository.getById(params.id);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    let mentor = await mentorsRepository.getByUserId(user.uid);
    if (!mentor && user.email) {
      mentor = await mentorsRepository.getByEmail(user.email);
    }

    const isStudent = session.student_id === user.uid;
    const isMentor = mentor && session.mentor_id === mentor.id;
    const isAdmin = user.role.toLowerCase() === 'admin';

    if (!isStudent && !isMentor && !isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden: Access denied to this session.' }, { status: 403 });
    }

    const history = await sessionsRepository.getHistory(params.id);

    return NextResponse.json({
      success: true,
      session,
      history,
    });
  } catch (error: any) {
    console.error(`[GET /api/v1/mentoring/sessions/${params.id}] Error:`, error);
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
