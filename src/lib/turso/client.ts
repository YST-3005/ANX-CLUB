import { createClient, Client } from '@libsql/client';

export interface DatabaseConfig {
  url: string;
  authToken?: string;
  isProduction: boolean;
}

/**
 * Sanitizes error messages to ensure database tokens, passwords, or sensitive keys are never logged.
 */
export function sanitizeErrorMessage(message: string): string {
  if (!message || typeof message !== 'string') return '';
  return message
    .replace(/authToken=[^&\s]+/gi, 'authToken=***')
    .replace(/bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer ***')
    .replace(/:\/\/([^:]+):([^@]+)@/g, '://***:***@');
}

/**
 * Validates database environment configuration.
 * - In production: strictly requires TURSO_DATABASE_URL (remote libsql/https) and TURSO_AUTH_TOKEN.
 *   Prohibits local file fallback (file:...) in production.
 * - In development/test: allows TURSO_DATABASE_URL or safely falls back to 'file:anx_local.db'.
 * Never logs or exposes credentials in error messages.
 */
export function validateDatabaseConfig(): DatabaseConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  const rawUrl = process.env.TURSO_DATABASE_URL;
  const rawAuthToken = process.env.TURSO_AUTH_TOKEN;

  if (isProduction) {
    if (!rawUrl || rawUrl.trim().length === 0) {
      throw new Error(
        'Database configuration error: TURSO_DATABASE_URL is required when NODE_ENV=production. Local file databases are prohibited in production.'
      );
    }
    const trimmedUrl = rawUrl.trim();
    if (trimmedUrl.startsWith('file:') || trimmedUrl.startsWith('sqlite:')) {
      throw new Error(
        'Database configuration error: TURSO_DATABASE_URL cannot point to a local file (file:...) in production. A remote Turso URL (e.g. libsql://... or https://...) is required.'
      );
    }
    if (!rawAuthToken || rawAuthToken.trim().length === 0) {
      throw new Error(
        'Database configuration error: TURSO_AUTH_TOKEN is required when NODE_ENV=production.'
      );
    }
    return {
      url: trimmedUrl,
      authToken: rawAuthToken.trim(),
      isProduction: true,
    };
  }

  // Development / Test environment
  const url = rawUrl && rawUrl.trim().length > 0 ? rawUrl.trim() : 'file:anx_local.db';
  return {
    url,
    authToken: rawAuthToken && rawAuthToken.trim().length > 0 ? rawAuthToken.trim() : undefined,
    isProduction: false,
  };
}

export class TursoDatabase {
  private static instance: Client | null = null;
  private static pragmaPromise: Promise<void> | null = null;

  public static getInstance(): Client {
    if (!this.instance) {
      const config = validateDatabaseConfig();

      const rawClient = createClient({
        url: config.url,
        authToken: config.authToken,
      });

      // Bind original un-wrapped execution methods
      const originalExecute = rawClient.execute.bind(rawClient);
      const originalBatch = rawClient.batch.bind(rawClient);
      const originalTransaction = rawClient.transaction.bind(rawClient);

      // Eagerly and reliably initialize PRAGMAs using original un-wrapped method (no recursion)
      const initPragmas = async (): Promise<void> => {
        if (!this.pragmaPromise) {
          this.pragmaPromise = (async () => {
            try {
              // Enable foreign key enforcement on the connection
              await originalExecute('PRAGMA foreign_keys = ON;');

              // WAL mode and busy timeout are file/local-specific; omitted for remote Turso servers
              if (
                config.url.startsWith('file:') ||
                config.url.includes('127.0.0.1') ||
                config.url.includes('localhost')
              ) {
                await originalExecute('PRAGMA journal_mode = WAL;');
                await originalExecute('PRAGMA busy_timeout = 5000;');
              }
            } catch (err: any) {
              const safeMsg = sanitizeErrorMessage(err?.message || String(err));
              console.error(
                '[TursoDatabase] Critical failure: Failed to enforce database PRAGMAs (foreign_keys):',
                safeMsg
              );
              throw new Error(`Database PRAGMA initialization failed: ${safeMsg}`);
            }
          })();
        }
        return this.pragmaPromise;
      };

      // Wrap execution methods to guarantee foreign_keys is applied before any query or transaction executes
      rawClient.execute = (async (...args: any[]) => {
        await initPragmas();
        return (originalExecute as any)(...args);
      }) as any;

      rawClient.batch = (async (...args: any[]) => {
        await initPragmas();
        return (originalBatch as any)(...args);
      }) as any;

      rawClient.transaction = (async (...args: any[]) => {
        await initPragmas();
        return (originalTransaction as any)(...args);
      }) as any;

      this.instance = rawClient;
    }
    return this.instance;
  }

  public static resetInstance(): void {
    this.instance = null;
    this.pragmaPromise = null;
  }
}

export const getDb = (): Client => TursoDatabase.getInstance();

/**
 * Lazy proxy to TursoDatabase.getInstance().
 * Completely forwards all methods and properties of the libSQL Client
 * while ensuring validation and reliable PRAGMA initialization occur on first database operation.
 */
export const db: Client = new Proxy({} as Client, {
  get(_target, prop) {
    const client = TursoDatabase.getInstance();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
  has(_target, prop) {
    const client = TursoDatabase.getInstance();
    return prop in client;
  },
  ownKeys(_target) {
    const client = TursoDatabase.getInstance();
    return Reflect.ownKeys(client);
  },
  getOwnPropertyDescriptor(_target, prop) {
    const client = TursoDatabase.getInstance();
    return Object.getOwnPropertyDescriptor(client, prop) || {
      configurable: true,
      enumerable: true,
      writable: true,
      value: (client as any)[prop],
    };
  },
});
