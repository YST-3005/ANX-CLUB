import { loadEnvConfig } from '@next/env';

// Load environment variables matching Next.js runtime precedence
loadEnvConfig(process.cwd());

import { mentorsRepository } from '../src/lib/turso/repositories/mentorsRepository';
import { validateDatabaseConfig } from '../src/lib/turso/client';

async function main() {
  console.log('[db:migrate-tokens] Starting explicit legacy plaintext token migration...');

  const config = validateDatabaseConfig();
  console.log(`[db:migrate-tokens] Target database: ${config.url.startsWith('file:') ? config.url : 'Remote Turso'}`);

  if (!process.env.TOKEN_ENCRYPTION_KEY) {
    console.error('[db:migrate-tokens] Aborted: TOKEN_ENCRYPTION_KEY is required to encrypt legacy tokens.');
    process.exit(1);
  }

  const result = await mentorsRepository.migrateLegacyPlaintextTokens();
  console.log(`[db:migrate-tokens] Migration completed:
  - Migrated tokens: ${result.migratedCount}
  - Skipped (already encrypted or malformed): ${result.skippedCount}
  - Errors: ${result.errors}`);

  if (result.errors > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[db:migrate-tokens] Fatal process failure:', err?.message || err);
  process.exit(1);
});
