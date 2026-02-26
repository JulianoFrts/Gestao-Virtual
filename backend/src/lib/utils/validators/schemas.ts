/**
 * Schemas de Validação Zod - GESTÃO VIRTUAL Backend
 * Centralized Exports (SRP Refactored)
 */

import { z } from "zod";

// Core Exports
export * from "./core/base";
export * from "./core/auth";
export * from "./core/user";
export * from "./core/common";

// Remaining specific schemas
export const updateProfileSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
});

export const anchorSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nome da âncora é obrigatório"),
  type: z.string().optional(),
  x: z.number(),
  y: z.number(),
  z: z.number(),
  towerId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

export const anchorListSchema = z.array(anchorSchema);

// Types
import { loginSchema, registerSchema } from "./core/auth";
import { createUserSchema, updateUserSchema, userFiltersSchema } from "./core/user";
import { paginationSchema } from "./core/common";

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type UserFiltersInput = z.infer<typeof userFiltersSchema>;

// Helper
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: string[] };

export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  return {
    success: false,
    errors: result.error.issues.map((e) =>
      e.path.length ? `${e.path.join(".")}: ${e.message}` : e.message,
    ),
  };
}

export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}
