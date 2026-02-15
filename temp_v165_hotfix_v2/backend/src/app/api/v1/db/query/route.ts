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

    // Determina se a query deve retornar dados ou apenas executar
    const isReadOnly =
      trimmedQuery.startsWith("select") ||
      trimmedQuery.startsWith("show") ||
      trimmedQuery.startsWith("describe") ||
      trimmedQuery.startsWith("explain") ||
      trimmedQuery.startsWith("with");

    let result;

    logger.info("Executando query SQL manual", {
      query: query.substring(0, 100),
    });

    if (isReadOnly) {
      // queryRawUnsafe retorna o array de resultados
      result = await prisma.$queryRawUnsafe(query);
    } else {
      // executeRawUnsafe retorna o número de linhas afetadas
      const affectedRows = await prisma.$executeRawUnsafe(query);
      result = { affectedRows };
    }

    return ApiResponse.json(result);
  } catch (error: any) {
    logger.error("Erro na execução de SQL manual", { error: error.message });
    // No Database Hub, retornamos a mensagem real mesmo em produção para ajudar no debug do SQL
    return ApiResponse.errorJson(
      error.message || "Erro desconhecido na execução do SQL",
      500,
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
