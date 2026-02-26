/**
 * API DB Query - GESTÃO VIRTUAL Backend
 *
 * Endpoint para execução de SQL direto (Uso restrito para Administradores)
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { HTTP_STATUS } from "@/lib/constants";

import { z } from "zod";

const sqlQuerySchema = z.object({
  query: z.string().min(1, "A query SQL é obrigatória"),
});

export async function POST(request: NextRequest): Promise<Response> {
  try {
    await validateAdminAccess();

    const body = await request.json();
    const validation = sqlQuerySchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.badRequest(validation.error.issues[0].message);
    }

    const { query } = validation.data;
    validateSQLSafety(query);

    logger.info("Executando query SQL manual (somente leitura)", {
      query: query.substring(0, 100),
    });

    const result = await prisma.$queryRawUnsafe(query);
    return ApiResponse.json(result);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === "FORBIDDEN") return ApiResponse.forbidden("Acesso restrito");
    if (err.message.includes("queries de leitura")) return ApiResponse.forbidden(err.message);

    logger.error("Erro na execução de SQL manual", { error: err.message });
    return ApiResponse.errorJson(
      err.message || "Erro desconhecido na execução do SQL",
      HTTP_STATUS.INTERNAL_ERROR,
      undefined,
      "DATABASE_ERROR",
    );
  }
}

async function validateAdminAccess() {
  try {
    await requireAdmin();
  } catch (error) {
    throw new Error("FORBIDDEN");
  }
}

function validateSQLSafety(query: string) {
  const trimmedQuery = query.trim().toLowerCase();
  const ALLOWED_PREFIXES = ["select", "show", "describe", "explain", "with"];
  const BLOCKED_KEYWORDS = ["drop", "truncate", "alter", "grant", "revoke", "create", "delete", "update", "insert"];

  const isReadOnly = ALLOWED_PREFIXES.some((prefix) => trimmedQuery.startsWith(prefix));
  const hasBlockedKeyword = BLOCKED_KEYWORDS.some((kw) => trimmedQuery.includes(kw));

  if (!isReadOnly || hasBlockedKeyword) {
    logger.warn("SQL bloqueado por segurança", { query: query.substring(0, 100) });
    throw new Error("Apenas queries de leitura (SELECT/SHOW/EXPLAIN) são permitidas pelo console SQL.");
  }
}

/**
 * Endpoint GET opcional para introspecção básica (listagem de tabelas)
 */
export async function GET(): Promise<Response> {
  try {
    await requireAdmin();

    // Busca as tabelas do esquema público
    const tables = await prisma.$queryRawUnsafe(`
            SELECT 
                table_name as name,
                (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
            FROM information_schema.tables t
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);

    return ApiResponse.json(tables);
  } catch (error) {
    return handleApiError(error);
  }
}
