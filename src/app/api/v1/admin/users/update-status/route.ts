import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { usersRepository } from '@/lib/turso/repositories/usersRepository';
import { db } from '@/lib/turso/client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authRes = await requireAdmin(request);
    if ('response' in authRes) return authRes.response;

    const body = await request.json().catch(() => ({}));
    const { userId, status } = body;

    if (!userId || !status) {
      return NextResponse.json({ success: false, error: 'userId and status are required' }, { status: 400 });
    }

    const now = Date.now();
    await db.execute({
      sql: `UPDATE users SET role = CASE WHEN ? = 'suspended' THEN 'Suspended' ELSE role END, updated_at = ? WHERE id = ?`,
      args: [status, now, userId],
    });

    return NextResponse.json({
      success: true,
      message: `User status updated to ${status}`,
      userId,
      status,
    });
  } catch (error: any) {
    console.error('[POST /api/v1/admin/users/update-status] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
