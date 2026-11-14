import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import { usersRepository } from '@/lib/turso/repositories/usersRepository';
const db = adminDb;

export async function POST(request: Request) {
  try {
    const verifiedUser = await verifyAuthToken(request);
    if (!verifiedUser || verifiedUser.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized: Admins only' }, { status: 403 });
    }

    const { targetUid, membershipType, membershipExpiry } = await request.json();

    if (!targetUid) {
      return NextResponse.json({ error: 'Missing targetUid' }, { status: 400 });
    }

    // 1. Prepare and apply Firestore update
    const updateData: any = {};
    if (membershipType !== undefined) updateData.membershipType = membershipType;
    if (membershipExpiry !== undefined) updateData.membershipExpiry = membershipExpiry;

    await db.collection('users').doc(targetUid).update(updateData).catch((err: any) => {
      console.warn('[admin/users/update] Firestore update notice:', err?.message || err);
    });

    // 2. Synchronize to authoritative Turso database
    if (membershipType !== undefined || membershipExpiry !== undefined) {
      try {
        const expiryTimestamp = membershipExpiry
          ? typeof membershipExpiry === 'number'
            ? membershipExpiry
            : new Date(membershipExpiry).getTime()
          : null;

        await usersRepository.updateMembership(
          targetUid,
          membershipType || 'free',
          expiryTimestamp
        );
      } catch (tursoErr) {
        console.error('[admin/users/update] Turso membership sync failed:', tursoErr);
        return NextResponse.json({ error: 'Failed to update user in authoritative database' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, message: 'User updated successfully' });
  } catch (error: any) {
    console.error('Admin User Update Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

