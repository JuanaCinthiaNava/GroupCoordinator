// Zod schemas for plan-lifecycle Server Actions.
// Shared between client (react-hook-form resolver) and server (Server Action
// safeParse). Per D-15 / STACK.md: validation lives in src/lib/validation/*.

import { z } from 'zod';

// PLAN-01: D-06 — title required; dates + description optional.
export const createPlanSchema = z.object({
  title: z
    .string()
    .min(1, 'El título del plan es obligatorio.')
    .max(200, 'El título debe tener como máximo 200 caracteres.'),
  startDate: z.string().datetime({ offset: true }).optional().or(z.literal('')),
  endDate: z.string().datetime({ offset: true }).optional().or(z.literal('')),
  description: z
    .string()
    .max(1000, 'La descripción debe tener como máximo 1000 caracteres.')
    .optional()
    .or(z.literal('')),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;

// PLAN-05: D-05 soft-delete. The button labelled "Eliminar plan" sets archived_at;
// no hard delete in v1 (RESEARCH §Open Question 5).
export const archivePlanSchema = z.object({
  planId: z.string().uuid(),
});

export type ArchivePlanInput = z.infer<typeof archivePlanSchema>;

// PLAN-04: owner revokes invite token (UPDATE invite_tokens SET revoked_at = now()).
export const revokeTokenSchema = z.object({
  tokenId: z.string().uuid(),
});

export type RevokeTokenInput = z.infer<typeof revokeTokenSchema>;
