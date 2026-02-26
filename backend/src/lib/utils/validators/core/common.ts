import { z } from "zod";
import { CONSTANTS, ROLE_LEVELS, ACCOUNT_STATUS } from "@/lib/constants";
import { emptyToUndefined, stripOperator } from "./base";

/**
 * Maps legacy ROLE_LEVELS keys → Prisma Role enum values.
 * Keys that already match Prisma (e.g. "operational") are identity-mapped.
 */
const ROLE_TO_PRISMA: Record<string, string> = {
  helper_system: "SUPER_ADMIN_GOD",
  super_admin_god: "SUPER_ADMIN_GOD",
  super_admin: "SYSTEM_ADMIN",
  socio_diretor: "COMPANY_ADMIN",
  admin: "SYSTEM_ADMIN",
  ti_software: "SYSTEM_ADMIN",
  moderator: "SYSTEM_ADMIN",
  manager: "PROJECT_MANAGER",
  gestor_project: "PROJECT_MANAGER",
  gestor_canteiro: "SITE_MANAGER",
  supervisor: "SUPERVISOR",
  technician: "OPERATIONAL",
  operator: "OPERATIONAL",
  operational: "OPERATIONAL",
  worker: "VIEWER",
  user: "VIEWER",
  // Direct Prisma enum names (lowercase) — identity mapping
  system_admin: "SYSTEM_ADMIN",
  company_admin: "COMPANY_ADMIN",
  project_manager: "PROJECT_MANAGER",
  site_manager: "SITE_MANAGER",
  viewer: "VIEWER",
};

export const roleSchema = z
  .string()
  .transform((v) => v.trim().toLowerCase())
  .refine((v) => Object.keys(ROLE_LEVELS).includes(v) || !!ROLE_TO_PRISMA[v], {
    message: "Role inválida",
  })
  .transform((v) => ROLE_TO_PRISMA[v] || v.toUpperCase());

export const roleFilterSchema = z
  .string()
  .transform((v) => v.trim())
  .refine(
    (v) => {
      if (!v) return true;
      const roles = v.split(",");
      return roles.every((r) =>
        Object.keys(ROLE_LEVELS).includes(r.trim().toLowerCase()),
      );
    },
    {
      message: "Uma ou mais roles são inválidas",
    },
  )
  .transform((v) =>
    v
      ? v
          .split(",")
          .map((r) => r.trim().toUpperCase())
          .join(",")
      : v,
  );

export const accountStatusSchema = z.nativeEnum(ACCOUNT_STATUS);

export const paginationSchema = z.object({
  page: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number()
      .int()
      .min(1)
      .default(CONSTANTS.API.PAGINATION.DEFAULT_PAGE),
  ),
  limit: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number()
      .int()
      .min(1)
      .max(CONSTANTS.API.BATCH.EXTREME)
      .default(CONSTANTS.API.PAGINATION.DEFAULT_LIMIT),
  ),
  sortBy: z.preprocess(emptyToUndefined, z.string().optional()),
  sortOrder: z.preprocess(
    emptyToUndefined,
    z.enum(["asc", "desc"]).default("asc"),
  ),
});
