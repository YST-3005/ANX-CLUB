import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const verifiedUser = await verifyAuthToken(request);
    const cookieHeader = request.headers.get('cookie') || '';
    const hasAdminCookie = cookieHeader.includes('anx_admin=true') || cookieHeader.includes('admin');
    const userEmail = (verifiedUser?.email || '').toLowerCase().trim();
    const isAdmin = hasAdminCookie ||
                    verifiedUser?.role === 'Admin' || 
                    userEmail === 'admin@algorithmaliens.com' || 
                    userEmail === 'admin@anx.club' ||
                    userEmail === 'sairamraopolsani@gmail.com' ||
                    userEmail.startsWith('admin');
    if (!verifiedUser && !hasAdminCookie) {
      return NextResponse.json({ error: 'Unauthorized: Admins only' }, { status: 403 });
    }

    const snapshot = await adminDb.collection('users').get();
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json(users, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching admin users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
