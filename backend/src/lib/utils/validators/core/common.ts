import { z } from "zod";
import { CONSTANTS, ROLE_LEVELS, ACCOUNT_STATUS } from "@/lib/constants";
import { emptyToUndefined } from "./base";

/**
 * Maps legacy ROLE_LEVELS keys → Prisma Role enum values.
 * The 8 standard roles are identity-mapped (lowercase → UPPERCASE).
 * Legacy names are mapped to the closest standard equivalent.
 */
const ROLE_TO_PRISMA: Record<string, string> = {
  // Standard 8 roles (identity mapping)
  helper_system: "HELPER_SYSTEM",
  admin: "ADMIN",
  ti_software: "TI_SOFTWARE",
  company_admin: "COMPANY_ADMIN",
  project_manager: "PROJECT_MANAGER",
  site_manager: "SITE_MANAGER",
  supervisor: "SUPERVISOR",
  operational: "OPERATIONAL",
  viewer: "VIEWER",
  // Legacy names → standard mapping
  super_admin_god: "HELPER_SYSTEM",
  system_admin: "ADMIN",
  super_admin: "ADMIN",
  socio_diretor: "COMPANY_ADMIN",
  moderator: "ADMIN",
  manager: "PROJECT_MANAGER",
  gestor_project: "PROJECT_MANAGER",
  gestor_canteiro: "SITE_MANAGER",
  technician: "OPERATIONAL",
  operator: "OPERATIONAL",
  worker: "VIEWER",
  user: "VIEWER",
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
      return roles.every((r) => {
        const val = r.trim().toLowerCase();
        return Object.keys(ROLE_LEVELS).includes(val) || !!ROLE_TO_PRISMA[val];
      });
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
