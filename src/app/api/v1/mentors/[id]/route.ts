import { NextResponse, NextRequest } from 'next/server';
import { mentorsRepository } from '@/lib/turso/repositories/mentorsRepository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const mentor = await mentorsRepository.getById(params.id);

    if (!mentor) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Mentor not found' } },
        { status: 404 }
      );
    }

    let skills: string[] = [];
    try {
      skills = JSON.parse(mentor.skills_json);
    } catch {
      skills = [];
    }

    const profile = await mentorsRepository.getProfile(params.id);
    const availability = await mentorsRepository.getAvailability(params.id);

    return NextResponse.json({
      id: mentor.id,
      name: mentor.full_name,
      email: mentor.email,
      role: mentor.title,
      company: mentor.company || '',
      bio: mentor.bio || '',
      avatar: mentor.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(mentor.full_name)}&background=8b5cf6&color=fff`,
      hourlyRate: mentor.hourly_rate,
      rate: mentor.hourly_rate,
      rating: mentor.rating,
      reviewCount: mentor.review_count,
      skills,
      isAvailable: Boolean(mentor.is_available),
      isPremiumOnly: Boolean(mentor.is_premium_only),
      experienceYears: mentor.experience_years,
      headline: profile?.headline || mentor.title,
      availability,
    });
  } catch (error: any) {
    console.error(`[GET /api/v1/mentors/${params.id}] Error:`, error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Error fetching mentor' } },
      { status: 500 }
    );
  }
}
