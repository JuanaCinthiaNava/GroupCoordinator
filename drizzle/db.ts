// Drizzle runtime client — used for service-role / seed / migration contexts.
//
// CONTRACT:
// - RLS-bound queries should go through the Supabase client (src/lib/supabase/*).
//   This client connects with the postgres role implicitly granted by Supavisor,
//   bypassing RLS — use it only from server contexts where that is intentional
//   (server actions running as service-role, seed scripts, migrations).
// - Runtime uses DATABASE_URL (connection pooler, port 6543 in production,
//   port 54322 on local Supabase Docker).
// - drizzle.config.ts uses DATABASE_MIGRATION_URL (direct connection, port 5432
//   in production, port 54322 locally).

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:54322/postgres';

// `prepare: false` is required for the Supabase connection pooler in transaction
// mode (port 6543). It is harmless on direct connections.
const queryClient = postgres(connectionString, { prepare: false });

export const db = drizzle(queryClient, { schema });
export type DB = typeof db;
