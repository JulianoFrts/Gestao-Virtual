import { z } from "zod";

/**
 * Common validation rules shared across the system
 */

export const idSchema = z.string().uuid("ID deve ser um UUID válido");
export const optionalIdSchema = idSchema.optional().nullable();

export const paginationQuerySchema = z.object({
  page: z.preprocess(
    (val) => (val === null || val === "" ? undefined : val),
    z.coerce.number().int().min(1).default(1),
  ),
  limit: z.preprocess(
    (val) => (val === null || val === "" ? undefined : val),
    z.coerce.number().int().min(1).max(5000).default(100),
  ),
  sortBy: z.string().optional().nullable(),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
});

export const baseEntitySchema = z.object({
  id: optionalIdSchema,
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
