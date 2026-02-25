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

export async function POST(request: NextRequest) {
  try {
    // Blidagem de segurança: Apenas administradores do sistema
    try {
      await requireAdmin();
    } catch (authError: any) {
      return ApiResponse.forbidden(authError.message || "Acesso restrito");
    }

    const { query } = await request.json();

    if (!query || typeof query !== "string") {
      return ApiResponse.badRequest(
        "A query SQL é obrigatória e deve ser uma string.",
      );
    }

    const trimmedQuery = query.trim().toLowerCase();

    // SEGURANÇA: Bloquear comandos destrutivos — apenas leitura permitida
    const ALLOWED_PREFIXES = [
      "select",
      "show",
      "describe",
      "explain",
      "with",
    ] as const;
    const BLOCKED_KEYWORDS = [
      "drop",
      "truncate",
      "alter",
      "grant",
      "revoke",
      "create",
    ] as const;

    const isReadOnly = ALLOWED_PREFIXES.some((prefix) =>
      trimmedQuery.startsWith(prefix),
    );
    const hasBlockedKeyword = BLOCKED_KEYWORDS.some((kw) =>
      trimmedQuery.includes(kw),
    );

    if (!isReadOnly || hasBlockedKeyword) {
      logger.warn("SQL bloqueado por segurança", {
        query: query.substring(0, 100),
      });
      return ApiResponse.forbidden(
        "Apenas queries de leitura (SELECT/SHOW/EXPLAIN) são permitidas pelo console SQL.",
      );
    }

    let result;

    logger.info("Executando query SQL manual (somente leitura)", {
      query: query.substring(0, 100),
    });

    // Usando $queryRawUnsafe para queries ad-hoc de leitura (admin-only)
    result = await prisma.$queryRawUnsafe(query);

    return ApiResponse.json(result);
  } catch (error: any) {
    logger.error("Erro na execução de SQL manual", { error: error.message });
    // No Database Hub, retornamos a mensagem real mesmo em produção para ajudar no debug do SQL
    return ApiResponse.errorJson(
      error.message || "Erro desconhecido na execução do SQL",
      HTTP_STATUS.INTERNAL_ERROR,
      undefined,
      "DATABASE_ERROR",
    );
  }
}

/**
 * Endpoint GET opcional para introspecção básica (listagem de tabelas)
 */
export async function GET() {
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
