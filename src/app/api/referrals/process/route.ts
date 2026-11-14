import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { referralsRepository } from '@/lib/turso/repositories/referralsRepository';

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth(request);
    if ('response' in authResult) {
      return authResult.response;
    }
    const { user } = authResult;

    const result = await referralsRepository.claimReferralReward(user.uid, '3_referrals');

    return NextResponse.json({
      success: result.success,
      userId: user.uid,
      referralCount: result.referralCount,
      rewardGranted: result.rewardGranted,
      alreadyClaimed: result.alreadyClaimed,
      message: result.message,
      ...(result.newExpiry ? { newExpiry: result.newExpiry } : {}),
    });
  } catch (error: any) {
    console.error('[referrals/process]', error);
    return NextResponse.json({ success: false, message: 'Failed to process referral reward' }, { status: 500 });
  }
}
