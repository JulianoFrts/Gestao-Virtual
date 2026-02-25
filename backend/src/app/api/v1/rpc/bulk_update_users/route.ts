import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { UserService } from "@/modules/users/application/user.service";
import { PrismaUserRepository } from "@/modules/users/infrastructure/prisma-user.repository";
import { PrismaSystemAuditRepository } from "@/modules/audit/infrastructure/prisma-system-audit.repository";
import { updateUserSchema, validate } from "@/lib/utils/validators/schemas";

// DI
const userRepository = new PrismaUserRepository();
const auditRepository = new PrismaSystemAuditRepository();
const userService = new UserService(userRepository, auditRepository);

/**
 * RPC: bulk_update_users
 *
 * Atualiza múltiplos usuários simultaneamente.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();

    const body = await request.json();
    const { ids, data } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return ApiResponse.badRequest("Lista de IDs é obrigatória");
    }

    if (!data || Object.keys(data).length === 0) {
      return ApiResponse.badRequest("Dados de atualização são obrigatórios");
    }

    // Validar os dados de atualização usando o schema existente
    // Como é uma atualização em massa, campos como email ou cpf digitados manualmente
    // geralmente não fazem sentido (pois seriam iguais para todos),
    // mas o schema permite validar Canteiro, Obra, Função, etc.
    const validationResult = validate(updateUserSchema, data);
    if (!validationResult.success) {
      return ApiResponse.validationError(validationResult.errors);
    }

    logger.info(
      `[bulk_update_users] Iniciando atualização de ${ids.length} usuários`,
      {
        performerId: admin.id,
        fields: Object.keys(data),
      },
    );

    const results = await userService.bulkUpdateUsers(
      ids,
      validationResult.data as any,
      admin.id,
    );

    return ApiResponse.json(results, "Atualização em massa concluída");
  } catch (error: any) {
    logger.error("[RPC ERR] Error in bulk_update_users:", {
      message: error.message,
    });
    return handleApiError(
      error,
      "src/app/api/v1/rpc/bulk_update_users/route.ts#POST",
    );
  }
}
