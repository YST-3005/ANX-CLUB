import { NextResponse, NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { mentorsRepository } from '@/lib/turso/repositories/mentorsRepository';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/admin/mentors/invitations
 * Lists all mentor invitations for admin monitoring.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if ('response' in authResult) {
      return authResult.response;
    }

    const invitations = await mentorsRepository.listInvitations();
    return NextResponse.json({ success: true, invitations, data: invitations, count: invitations.length });
  } catch (error: any) {
    console.error('[GET /api/v1/admin/mentors/invitations] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to list invitations' }, { status: 500 });
  }
}
