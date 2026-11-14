import { NextResponse, NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { mentorsRepository } from '@/lib/turso/repositories/mentorsRepository';
import { usersRepository } from '@/lib/turso/repositories/usersRepository';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/admin/mentors/[id]
 * Fetch single mentor profile with linked user details.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdmin(request);
    if ('response' in authResult) {
      return authResult.response;
    }

    const mentorId = params.id;
    const mentor = await mentorsRepository.getById(mentorId);
    if (!mentor) {
      return NextResponse.json({ success: false, error: 'Mentor not found' }, { status: 404 });
    }

    let linkedUser = null;
    if (mentor.user_id) {
      linkedUser = await usersRepository.getById(mentor.user_id);
    }

    const invitation = await mentorsRepository.getInvitationByMentorId(mentorId);

    return NextResponse.json({
      success: true,
      mentor: {
        ...mentor,
        skills: (() => {
          try {
            return JSON.parse(mentor.skills_json || '[]');
          } catch {
            return [];
          }
        })(),
        linkedUser,
        invitation,
      },
    });
  } catch (error: any) {
    console.error('[GET /api/v1/admin/mentors/[id]] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/v1/admin/mentors/[id]
 * Update mentor profile details.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdmin(request);
    if ('response' in authResult) {
      return authResult.response;
    }

    const mentorId = params.id;
    const existing = await mentorsRepository.getById(mentorId);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Mentor not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const updates: any = {};

    if (body.fullName || body.name) {
      updates.full_name = String(body.fullName || body.name).trim();
    }
    if (body.title || body.role) {
      updates.title = String(body.title || body.role).trim();
    }
    if (body.company !== undefined) {
      updates.company = String(body.company).trim();
    }
    if (body.bio !== undefined) {
      updates.bio = String(body.bio).trim();
    }
    if (body.avatarUrl !== undefined || body.imageUrl !== undefined) {
      updates.avatar_url = String(body.avatarUrl || body.imageUrl || '').trim();
    }
    if (body.hourlyRate !== undefined) {
      updates.hourly_rate = Number(body.hourlyRate);
    }
    if (body.isAvailable !== undefined) {
      updates.is_available = body.isAvailable ? 1 : 0;
    }
    if (body.isPremiumOnly !== undefined) {
      updates.is_premium_only = body.isPremiumOnly ? 1 : 0;
    }
    if (body.experienceYears !== undefined) {
      updates.experience_years = Number(body.experienceYears);
    }
    if (body.skills || body.topics) {
      const skills = Array.isArray(body.skills || body.topics)
        ? (body.skills || body.topics).map(String)
        : String(body.skills || body.topics).split(',').map((s) => s.trim());
      updates.skills_json = JSON.stringify(skills);
    }

    const updated = await mentorsRepository.update(mentorId, updates);

    // If name was updated and mentor is linked to a user, synchronize full_name in users table
    if (updates.full_name && existing.user_id) {
      await usersRepository.upsert({
        id: existing.user_id,
        email: existing.email,
        full_name: updates.full_name,
        role: 'Mentor',
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: 'Mentor updated successfully',
      mentor: updated,
      data: updated,
    });
  } catch (error: any) {
    console.error('[PATCH /api/v1/admin/mentors/[id]] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to update mentor' }, { status: 500 });
  }
}

/**
 * DELETE /api/v1/admin/mentors/[id]
 * Deactivates or removes a mentor from active booking.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdmin(request);
    if ('response' in authResult) {
      return authResult.response;
    }

    const mentorId = params.id;
    const success = await mentorsRepository.delete(mentorId);

    if (!success) {
      return NextResponse.json({ success: false, error: 'Mentor not found or already inactive' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Mentor deactivated successfully' });
  } catch (error: any) {
    console.error('[DELETE /api/v1/admin/mentors/[id]] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to delete mentor' }, { status: 500 });
  }
}
