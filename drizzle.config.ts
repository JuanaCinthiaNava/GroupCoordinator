import { defineConfig } from 'drizzle-kit';

// Use DATABASE_MIGRATION_URL (port 5432 / 54322 direct connection),
// NOT DATABASE_URL (port 6543 connection pooler) — per RESEARCH §Area 3
export default defineConfig({
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_MIGRATION_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
  },
});
