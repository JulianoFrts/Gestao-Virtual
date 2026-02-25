import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { UserService } from "@/modules/users/application/user.service";
import { PrismaUserRepository } from "@/modules/users/infrastructure/prisma-user.repository";
import { PrismaSystemAuditRepository } from "@/modules/audit/infrastructure/prisma-system-audit.repository";
import { Validator } from "@/lib/utils/api/validator";
import { deleteUserSafeSchema } from "@/lib/utils/validators/route-schemas";

const userService = new UserService(
  new PrismaUserRepository(),
  new PrismaSystemAuditRepository(),
);

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();

    // Aceitar tanto user_id quanto userId
    const normalizedBody = {
      userId: body.user_id || body.userId,
      confirmDelete: body.confirmDelete,
    };

    const validation = Validator.validate(deleteUserSafeSchema, normalizedBody);
    if (!validation.success) return validation.response;

    const { userId } = validation.data;

    // Prevent deleting self
    if (userId === admin.id) {
      return ApiResponse.badRequest("Não é possível deletar sua própria conta");
    }

    await userService.deleteUser(userId, admin.id);

    logger.info("User deleted safely", { userId, deletedBy: admin.id });

    return ApiResponse.json({
      success: true,
      message: "Usuário removido com sucesso",
    });
  } catch (error: any) {
    if (error.message === "User not found")
      return ApiResponse.notFound("Usuário não encontrado");
    if (error.message === "Cannot delete an administrator")
      return ApiResponse.forbidden(
        "Não é possível deletar outro administrador",
      );
    return handleApiError(
      error,
      "src/app/api/v1/rpc/delete_user_safe/route.ts#POST",
    );
  }
}
