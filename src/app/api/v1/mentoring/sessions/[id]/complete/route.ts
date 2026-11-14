import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { sessionsRepository } from '@/lib/turso/repositories/sessionsRepository';
import { mentorsRepository } from '@/lib/turso/repositories/mentorsRepository';
import { usersRepository } from '@/lib/turso/repositories/usersRepository';
import { db } from '@/lib/turso/client';
import { awardXP, calculateLeadershipStage } from '@/lib/gamification';
import { queuePushWebhook } from '@/lib/webhooks/dispatcher';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const session = await sessionsRepository.getById(params.id);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found.' }, { status: 404 });
    }

    // Authorize mentor strictly via user_id
    const mentor = await mentorsRepository.getByUserId(user.uid);
    if (!mentor || mentor.id !== session.mentor_id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only the assigned mentor can mark this session as completed.' },
        { status: 403 }
      );
    }

    // Complete session idempotently
    const { session: completed, newlyCompleted } = await sessionsRepository.complete(params.id, session.mentor_id, user.uid);

    let xpAwarded = 0;
    if (newlyCompleted) {
      xpAwarded = 75;

      // 1. Authoritatively record XP in Turso xp_ledger and update student profile
      try {
        const ledgerId = `xp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const now = Date.now();

        const tx = await db.transaction('write');
        try {
          await tx.execute({
            sql: `
              INSERT INTO xp_ledger (
                id, user_id, action_type, xp_value, source_ref_id, reason, awarded_by, created_at
              ) VALUES (?, ?, 'mentor', 75, ?, ?, 'system', ?)
            `,
            args: [
              ledgerId,
              session.student_id,
              session.id,
              `Completed 1-on-1 Mentorship session with ${session.mentor_name || 'Mentor'}`,
              now,
            ],
          });

          // Fetch student to get updated XP
          const studentRow = await usersRepository.getById(session.student_id);
          const currentXp = Number(studentRow?.xp_total || 0);
          const newXp = currentXp + 75;
          const newStage = calculateLeadershipStage(newXp);

          await tx.execute({
            sql: `
              UPDATE users
              SET xp_total = ?,
                  leadership_stage = ?,
                  version = version + 1,
                  updated_at = ?
              WHERE id = ?
            `,
            args: [newXp, newStage, now, session.student_id],
          });

          await tx.commit();
        } catch (tursoXpErr: any) {
          await tx.rollback().catch(() => {});
          if (tursoXpErr?.message?.includes('UNIQUE') || tursoXpErr?.message?.includes('PRIMARY')) {
            xpAwarded = 0;
          } else {
            console.warn('[completeSession] Turso XP award notice:', tursoXpErr?.message || tursoXpErr);
          }
        }
      } catch (err) {
        console.warn('[completeSession] XP award error:', err);
      }

      // 2. Also dual-sync to Firestore if available
      try {
        await awardXP(
          session.student_id,
          'mentor',
          75,
          session.id,
          `Completed 1-on-1 Mentorship session with ${session.mentor_name || 'Mentor'}`
        );
      } catch (fsXpErr) {
        console.warn('[completeSession] Firestore XP sync skipped:', fsXpErr);
      }

      // 3. Dispatch push notification webhook to student
      queuePushWebhook({
        recipientId: session.student_id,
        entity: 'mentoring_session',
        entity_id: completed.id,
        summary: `Mentoring Session Completed! (+${xpAwarded} XP)`,
        version: completed.version,
        updated_at: completed.updated_at,
        data: {
          sessionId: completed.id,
          status: 'completed',
          xpAwarded: String(xpAwarded),
          actionUrl: '/dashboard',
          message: `Your mentoring session with ${session.mentor_name || 'Mentor'} is complete! You earned +${xpAwarded} XP.`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: newlyCompleted ? `Session completed. +${xpAwarded} XP awarded to student.` : 'Session is already completed.',
      session: completed,
      xpAwarded,
    });
  } catch (error: any) {
    console.error(`[POST /api/v1/mentoring/sessions/${params.id}/complete] Error:`, error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to complete session.' },
      { status: 500 }
    );
  }
}
