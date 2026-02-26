import { z } from "zod";
import { emptyToUndefined } from "@/lib/utils/validators/schemas";
import { CONSTANTS } from "@/lib/constants";

/**
 * Common validation rules shared across the system
 */

const MIN_ID_LENGTH = 3;
export const idSchema = z.string().min(MIN_ID_LENGTH, `ID deve ter pelo menos ${MIN_ID_LENGTH} caracteres`);
export const optionalIdSchema = z.preprocess(
  emptyToUndefined,
  idSchema.optional().nullable(),
);

export const paginationQuerySchema = z.object({
  page: z.preprocess(
    (schemaInput) => schemaInput === null || schemaInput === "" || schemaInput === "undefined" ? undefined : schemaInput,
    z.coerce.number().int().min(1).default(CONSTANTS.API.PAGINATION.DEFAULT_PAGE),
  ),
  limit: z.preprocess(
    (schemaInput) => schemaInput === null || schemaInput === "" || schemaInput === "undefined" || schemaInput === "0"
        ? undefined
        : schemaInput,
    z.coerce.number().int().min(1).max(CONSTANTS.API.BATCH.EXTREME).default(CONSTANTS.API.PAGINATION.DEFAULT_LIMIT),
  ),
  sortBy: z.preprocess(emptyToUndefined, z.string().optional().nullable()),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});
