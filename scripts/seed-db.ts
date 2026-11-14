import { loadEnvConfig } from '@next/env';

// Load environment variables matching Next.js runtime precedence (.env.local, .env, etc.)
loadEnvConfig(process.cwd());

import { getDb, validateDatabaseConfig } from '../src/lib/turso/client';
import { eventsRepository } from '../src/lib/turso/repositories/eventsRepository';
import { mentorsRepository } from '../src/lib/turso/repositories/mentorsRepository';
import { MOCK_EVENTS, MOCK_MENTORS } from '../src/lib/constants';

async function main() {
  console.log('[db:seed] Starting development database seeding...');

  // STRICT SECURITY CHECK: Never run in production
  if (process.env.NODE_ENV === 'production') {
    console.error('[db:seed] FATAL: Database seeding is strictly prohibited in production mode (NODE_ENV=production).');
    process.exit(1);
  }

  const config = validateDatabaseConfig();
  if (config.isProduction || config.url.includes('turso.io')) {
    console.error('[db:seed] FATAL: Database seeding is strictly prohibited against remote production Turso databases.');
    process.exit(1);
  }

  console.log(`[db:seed] Target: Local Development SQLite (${config.url})`);

  try {
    // 1. Seed sample events into Turso
    console.log('[db:seed] Seeding events into local database...');
    for (const evt of MOCK_EVENTS as any[]) {
      await eventsRepository.upsert({
        id: evt.id,
        title: evt.title,
        description: evt.description || '',
        date: evt.date || new Date().toISOString().split('T')[0],
        time: evt.time || '10:00 AM',
        duration_minutes: 120,
        venue: evt.venue || 'Online Stream',
        is_online: evt.venue?.toLowerCase?.().includes('online') ? 1 : 0,
        category: evt.category || 'workshop',
        event_type: evt.eventType || 'free',
        price: evt.price || 0,
        premium_price: evt.premiumPrice || 0,
        capacity: evt.capacity || 100,
        seats_booked: evt.seatsBooked || 0,
        poster_url: evt.posterUrl || evt.thumbnail || '',
        speaker: evt.speaker || 'Instructor',
        status: 'Published',
        is_published: 1,
        is_active: 1,
      });
    }
    console.log(`[db:seed] Successfully seeded ${MOCK_EVENTS.length} events.`);

    // 2. Seed sample mentors into Turso
    console.log('[db:seed] Seeding mentors into local database...');
    for (const mentor of MOCK_MENTORS as any[]) {
      await mentorsRepository.upsert({
        id: mentor.id,
        user_id: null,
        full_name: mentor.name,
        email: `${mentor.id}@anx.club`,
        title: mentor.role || 'Staff Engineer',
        company: mentor.company || 'Tech Leader',
        bio: mentor.bio || 'Experienced engineering leader.',
        avatar_url: mentor.avatar || '',
        hourly_rate: 1500,
        rating: mentor.rating || 4.9,
        review_count: mentor.sessionsCount || 10,
        skills_json: JSON.stringify(mentor.skills || mentor.availableTopics || ['System Design']),
        is_available: 1,
      });
    }
    console.log(`[db:seed] Successfully seeded ${MOCK_MENTORS.length} mentors.`);

    console.log('[db:seed] Development database seeding completed successfully! ✨');
  } catch (err: any) {
    console.error('[db:seed] Seeding failed:', err?.message || err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[db:seed] Fatal process failure:', err?.message || err);
  process.exit(1);
});
