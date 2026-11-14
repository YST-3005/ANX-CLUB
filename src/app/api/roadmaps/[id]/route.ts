import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const doc = await adminDb.collection('roadmaps').doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Roadmap not found' }, { status: 404 });
    }
    return NextResponse.json({ id: doc.id, ...doc.data() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const authRes = await requireAdmin(request);
    if ('response' in authRes) return authRes.response;

    const { id } = params;
    await adminDb.collection('roadmaps').doc(id).delete();
    return NextResponse.json({ success: true, message: 'Roadmap deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
