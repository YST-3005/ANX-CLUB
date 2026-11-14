import { NextRequest, NextResponse } from 'next/server';
import { mentorsRepository } from '@/lib/turso/repositories/mentorsRepository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const skill = searchParams.get('skill') || undefined;
    const search = searchParams.get('search') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);

    // Seed default mentors if database is newly initialized
    await mentorsRepository.seedDefaultMentorsIfEmpty().catch(() => {});

    const rows = await mentorsRepository.list({ skill, search, limit });

    // Map to API DTO
    const mentors = rows.map((m) => {
      let skills: string[] = [];
      try {
        skills = JSON.parse(m.skills_json);
      } catch {
        skills = [];
      }

      return {
        id: m.id,
        name: m.full_name,
        email: m.email,
        role: m.title,
        company: m.company || 'Tech Leader',
        bio: m.bio || '',
        avatar: m.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.full_name)}&background=8b5cf6&color=fff`,
        hourlyRate: m.hourly_rate,
        rate: m.hourly_rate,
        rating: m.rating,
        reviewCount: m.review_count,
        skills,
        isAvailable: Boolean(m.is_available),
        isPremiumOnly: Boolean(m.is_premium_only),
        experienceYears: m.experience_years,
      };
    });

    const response = NextResponse.json(mentors, { status: 200 });
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return response;
  } catch (error: any) {
    console.error('[GET /api/v1/mentors] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch mentors' }, { status: 500 });
  }
}
