import { loadEnvConfig } from '@next/env';

// Load environment variables matching Next.js runtime precedence (.env.local, .env, etc.)
loadEnvConfig(process.cwd());

import { getDb, validateDatabaseConfig } from '../src/lib/turso/client';
import { initDatabase } from '../src/lib/turso/schema';

async function main() {
  console.log('[db:init] Starting database schema initialization...');

  // Validate configuration (enforces TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in production)
  const config = validateDatabaseConfig();
  const safeUrlDisplay = config.url.startsWith('file:')
    ? config.url
    : config.url.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');

  console.log(`[db:init] Target database: ${safeUrlDisplay}`);
  console.log(`[db:init] Mode: ${config.isProduction ? 'PRODUCTION (Turso)' : 'DEVELOPMENT/LOCAL (SQLite)'}`);

  const client = getDb();

  try {
    await initDatabase(client);
    console.log('[db:init] Database schema initialized successfully. All tables and indexes are verified.');
  } catch (err: any) {
    console.error('[db:init] Database schema initialization failed with error:');
    console.error('[db:init]', err?.message || err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[db:init] Fatal process failure:', err?.message || err);
  process.exit(1);
});
