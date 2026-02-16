import { z } from "zod";
import { emptyToUndefined } from "@/lib/utils/validators/schemas";
import { CONSTANTS } from "@/lib/constants";

/**
 * Common validation rules shared across the system
 */

export const idSchema = z.string().uuid("ID deve ser um UUID válido");
export const optionalIdSchema = z.preprocess(
  emptyToUndefined,
  idSchema.optional().nullable(),
);

export const paginationQuerySchema = z.object({
  page: z.preprocess(
    (val) =>
      val === null || val === "" || val === "undefined" ? undefined : val,
    z.coerce.number().int().min(1).default(1),
  ),
  limit: z.preprocess(
    (val) =>
      val === null || val === "" || val === "undefined" || val === "0"
        ? undefined
        : val,
    z.coerce.number().int().min(1).max(CONSTANTS.API.BATCH.EXTREME).default(5000),
  ),
  sortBy: z.preprocess(emptyToUndefined, z.string().optional().nullable()),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});
