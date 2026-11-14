import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import { syncRepository } from '@/lib/turso/repositories/syncRepository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userId = await authenticate(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lastUpdatedAt = Number(searchParams.get('last_updated_at') || 0);
    const limit = Math.min(Number(searchParams.get('limit') || 250), 500);

    const delta = await syncRepository.getDelta(lastUpdatedAt, userId, limit);

    return NextResponse.json({
      success: true,
      server_timestamp: delta.server_timestamp,
      has_more: delta.has_more,
      changes: delta.changes,
    });
  } catch (error: any) {
    console.error('[GET /api/sync] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Delta sync failed.' },
      { status: 500 }
    );
  }
}
