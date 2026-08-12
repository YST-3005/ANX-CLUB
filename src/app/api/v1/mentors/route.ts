import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

    const snapshot = await adminDb
      .collection('mentors')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const mentors = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const response = NextResponse.json(mentors, { status: 200 });
    response.headers.set("Cache-Control", "public, s-maxage=120, stale-while-revalidate=600");
    return response;
  } catch (error: any) {
    console.error('Error fetching mentors:', error);
    return NextResponse.json({ error: error.message || 'Error fetching mentors' }, { status: 500 });
  }
}

