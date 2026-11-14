import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { usersRepository } from '@/lib/turso/repositories/usersRepository';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('response' in authResult) {
      return authResult.response;
    }
    const { user: authUser } = authResult;

    const user = await usersRepository.getById(authUser.uid);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User profile not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        uid: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        membershipType: user.membership_type,
        membershipExpiry: user.membership_expiry ? new Date(user.membership_expiry).toISOString() : null,
        phoneNumber: user.phone_number,
        collegeName: user.college_name,
        graduationYear: user.graduation_year,
        xpTotal: user.xp_total,
        leadershipStage: user.leadership_stage,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        referralCode: user.referral_code,
      },
    });
  } catch (error: any) {
    console.error('[GET /api/v1/users/me]', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch user profile' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('response' in authResult) {
      return authResult.response;
    }
    const { user: authUser } = authResult;

    const body = await request.json().catch(() => ({}));

    // Prevent privilege escalation: strip role, membership, and XP fields
    const safeUpdate = {
      full_name: typeof body.fullName === 'string' ? body.fullName.trim() : typeof body.full_name === 'string' ? body.full_name.trim() : undefined,
      phone_number: typeof body.phoneNumber === 'string' ? body.phoneNumber.trim() : typeof body.phone_number === 'string' ? body.phone_number.trim() : undefined,
      college_name: typeof body.collegeName === 'string' ? body.collegeName.trim() : typeof body.college_name === 'string' ? body.college_name.trim() : undefined,
      graduation_year: typeof body.graduationYear === 'string' ? body.graduationYear.trim() : typeof body.graduation_year === 'string' ? body.graduation_year.trim() : undefined,
      bio: typeof body.bio === 'string' ? body.bio.trim() : undefined,
      avatar_url: typeof body.avatarUrl === 'string' ? body.avatarUrl.trim() : typeof body.avatar_url === 'string' ? body.avatar_url.trim() : undefined,
    };

    const existing = await usersRepository.getById(authUser.uid);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Update in Turso
    const updatedUser = await usersRepository.upsert({
      id: authUser.uid,
      email: existing.email,
      full_name: safeUpdate.full_name !== undefined ? safeUpdate.full_name : existing.full_name,
      phone_number: safeUpdate.phone_number !== undefined ? safeUpdate.phone_number : existing.phone_number,
      college_name: safeUpdate.college_name !== undefined ? safeUpdate.college_name : existing.college_name,
      graduation_year: safeUpdate.graduation_year !== undefined ? safeUpdate.graduation_year : existing.graduation_year,
      bio: safeUpdate.bio !== undefined ? safeUpdate.bio : existing.bio,
      avatar_url: safeUpdate.avatar_url !== undefined ? safeUpdate.avatar_url : existing.avatar_url,
      role: existing.role, // immutable by non-admin
      membership_type: existing.membership_type, // immutable by non-admin
      xp_total: existing.xp_total,
    });

    // Synchronize to Firestore
    try {
      const firestoreUpdate: any = {};
      if (safeUpdate.full_name) firestoreUpdate.fullName = safeUpdate.full_name;
      if (safeUpdate.phone_number) firestoreUpdate.phoneNumber = safeUpdate.phone_number;
      if (safeUpdate.college_name) firestoreUpdate.collegeName = safeUpdate.college_name;
      if (safeUpdate.bio) firestoreUpdate.bio = safeUpdate.bio;
      if (safeUpdate.avatar_url) firestoreUpdate.avatar = safeUpdate.avatar_url;

      if (Object.keys(firestoreUpdate).length > 0) {
        await adminDb.collection('users').doc(authUser.uid).update(firestoreUpdate).catch(() => {});
      }
    } catch (fsErr) {
      console.warn('[PATCH /api/v1/users/me] Firestore sync notice:', fsErr);
    }

    return NextResponse.json({
      success: true,
      user: {
        uid: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.full_name,
        role: updatedUser.role,
        membershipType: updatedUser.membership_type,
        phoneNumber: updatedUser.phone_number,
        collegeName: updatedUser.college_name,
        bio: updatedUser.bio,
      },
    });
  } catch (error: any) {
    console.error('[PATCH /api/v1/users/me]', error);
    return NextResponse.json({ success: false, error: 'Failed to update user profile' }, { status: 500 });
  }
}
