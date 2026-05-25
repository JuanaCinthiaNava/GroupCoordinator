// Custom Access Token Hook integration test.
//
// Per RESEARCH §Area 1, the hook reads claims.app_metadata.plan_id and promotes
// it to a top-level claim. The most robust way to assert this without depending
// on the Supabase Studio UI toggle is to call the function directly via SQL —
// it's a stable PL/pgSQL function with a known signature.
//
// This test uses `postgres` (the driver used by drizzle/db.ts) to open a
// direct connection and SELECT public.custom_access_token_hook(...).

import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DATABASE_MIGRATION_URL, SEED_PLAN_ID, getSkipReason } from './_helpers';

describe('Custom Access Token Hook (SQL-level)', () => {
  let skip: string | null = null;
  let sql: ReturnType<typeof postgres> | null = null;

  beforeAll(async () => {
    skip = await getSkipReason();
    if (skip) {
      console.warn(`[skip] ${skip}`);
      return;
    }
    if (!DATABASE_MIGRATION_URL) {
      skip = 'DATABASE_MIGRATION_URL missing — cannot reach Postgres directly';
      console.warn(`[skip] ${skip}`);
      return;
    }
    sql = postgres(DATABASE_MIGRATION_URL, { max: 1 });
  });

  afterAll(async () => {
    if (sql) await sql.end({ timeout: 2 });
  });

  it('promotes app_metadata.plan_id to a top-level claim', async () => {
    if (skip || !sql) return;
    const event = {
      user_id: '00000000-0000-0000-0000-000000000088',
      claims: {
        sub: '00000000-0000-0000-0000-000000000088',
        app_metadata: { plan_id: SEED_PLAN_ID },
        user_metadata: {},
      },
    };
    const rows = await sql<Array<{ result: { claims: Record<string, unknown> } }>>`
      select public.custom_access_token_hook(${sql.json(event)}::jsonb) as result
    `;
    expect(rows).toHaveLength(1);
    const claims = rows[0].result.claims;
    expect(claims.plan_id).toBe(SEED_PLAN_ID);
  });

  it('omits plan_id when app_metadata.plan_id is missing', async () => {
    if (skip || !sql) return;
    const event = {
      user_id: '00000000-0000-0000-0000-000000000088',
      claims: {
        sub: '00000000-0000-0000-0000-000000000088',
        app_metadata: {},
        user_metadata: {},
      },
    };
    const rows = await sql<Array<{ result: { claims: Record<string, unknown> } }>>`
      select public.custom_access_token_hook(${sql.json(event)}::jsonb) as result
    `;
    expect(rows).toHaveLength(1);
    const claims = rows[0].result.claims;
    expect(claims.plan_id).toBeUndefined();
  });
});
