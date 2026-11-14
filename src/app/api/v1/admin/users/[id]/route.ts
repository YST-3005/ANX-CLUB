import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/turso/client';
import { syncRepository } from '@/lib/turso/repositories/syncRepository';

export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authRes = await requireAdmin(request);
    if ('response' in authRes) return authRes.response;

    const { id } = params;
    const now = Date.now();

    // Delete user from Turso
    const deleteRes = await db.execute({
      sql: `DELETE FROM users WHERE id = ?`,
      args: [id],
    });

    // Record deletion tombstone for delta sync
    await syncRepository.recordTombstone('users', id);

    return NextResponse.json({
      success: true,
      message: 'User removed successfully from database.',
      deletedId: id,
    });
  } catch (error: any) {
    console.error(`[DELETE /api/v1/admin/users/${params.id}] Error:`, error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to delete user' }, { status: 500 });
  }
}
