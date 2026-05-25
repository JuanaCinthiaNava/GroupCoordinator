// Phase 1 Drizzle schema — plans, plan_members, invite_tokens.
//
// CONTRACT:
// - Drizzle owns DDL ONLY. RLS policies live in supabase/policies/*.sql.
//   Never add `sql\`create policy ...\`` here (RESEARCH §Area 3, Pitfall 4 — DROP POLICY clash).
// - Cross-schema FKs to auth.users(id) are NOT declared on the Drizzle side
//   (Drizzle introspection breaks across schemas). The columns are plain uuid.
// - The `(plan_id, user_id)` unique constraint on plan_members is required
//   for the OAuth callback upsert (RESEARCH §Open Question 3).

import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

// Member role enum — shared by plan_members.role AND invite_tokens.role.
// 'owner' is implicit for plan creators; tokens never mint owners.
export const planMemberRoleEnum = pgEnum('plan_member_role', [
  'owner',
  'editor',
  'viewer',
]);

export const plans = pgTable('plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(), // 8-char nanoid lowercase-alphanumeric
  title: text('title').notNull(),
  description: text('description'),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  ownerId: uuid('owner_id').notNull(), // FK to auth.users(id); cross-schema (declared in SQL, not here)
  // D-05 soft-delete: archive sets this; no hard delete in v1.
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  // updatedAt is auto-touched by a trigger added in supabase/migrations/002_rls_enable.sql
  // (Drizzle does not emit triggers from schema.ts).
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const planMembers = pgTable(
  'plan_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(), // FK to auth.users(id)
    role: planMemberRoleEnum('role').notNull().default('viewer'),
    joinedViaTokenId: uuid('joined_via_token_id'), // nullable — owner row has no token
    joinedAt: timestamp('joined_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // RESEARCH §Open Question 3 — required for the OAuth callback upsert in 01-05.
    planUserUnique: unique('plan_members_plan_user_unique').on(
      table.planId,
      table.userId,
    ),
  }),
);

export const inviteTokens = pgTable('invite_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  planId: uuid('plan_id')
    .notNull()
    .references(() => plans.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(), // 22-char nanoid, no-lookalike alphabet
  role: planMemberRoleEnum('role').notNull().default('viewer'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  // Soft-delete (revoke). No hard delete — audit trail.
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdBy: uuid('created_by').notNull(), // FK to auth.users(id)
  useCount: integer('use_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
