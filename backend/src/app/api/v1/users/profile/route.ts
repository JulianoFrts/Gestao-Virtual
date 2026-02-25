import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { updateProfileSchema, validate } from "@/lib/utils/validators/schemas";
import { requireAuth, requireActiveAccount, invalidateSessionCache } from "@/lib/auth/session";
import { publicUserSelect } from "@/types/database";
import { MESSAGES } from "@/lib/constants";
import { UserService } from "@/modules/users/application/user.service";
import { PrismaUserRepository } from "@/modules/users/infrastructure/prisma-user.repository";
import { PrismaSystemAuditRepository } from "@/modules/audit/infrastructure/prisma-system-audit.repository";


// DI (Manual)
const userRepository = new PrismaUserRepository();
const auditRepository = new PrismaSystemAuditRepository();
const userService = new UserService(userRepository, auditRepository);

export async function GET() {
  try {
    const sessionUser = await requireAuth();
    const user = (await userService.getProfile(sessionUser.id)) as any;

    return ApiResponse.json({
      ...user,
      activeSessions: user._count?.sessions || 0,
      _count: undefined,
    });
  } catch (error: any) {
    if (error.message === "User not found")
      return ApiResponse.notFound(MESSAGES.ERROR.NOT_FOUND);
    return handleApiError(error, "src/app/api/v1/users/profile/route.ts#GET");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const sessionUser = await requireActiveAccount();
    const body = await request.json();

    // Password change logic
    if (
      body.currentPassword ||
      body.newPassword ||
      body.confirmPassword ||
      body.password
    ) {
      try {
        // Pass performerId (sessionUser.id) explicitly, though service defaults to userId if undefined for self-change
        await userService.changePassword(sessionUser.id, body, sessionUser.id);

        if (body.password && Object.keys(body).length === 1) {
          return ApiResponse.json(
            { message: "Senha alterada com sucesso" },
            MESSAGES.SUCCESS.UPDATED,
          );
        }

        if (body.currentPassword && !body.name && !body.image) {
          return ApiResponse.json(
            { message: "Senha alterada com sucesso" },
            "Senha alterada com sucesso",
          );
        }
      } catch (err: any) {
        return ApiResponse.badRequest(err.message);
      }
    }

    // Profile update logic
    const validationResult = validate(updateProfileSchema, body);
    if (!validationResult.success)
      return ApiResponse.validationError(validationResult.errors);

    const updateData = validationResult.data;
    if (Object.keys(updateData).length === 0)
      return ApiResponse.badRequest("Nenhum dado fornecido para atualização");

    // Service handles logging if auditRepository is injected
    const updatedUser = await userService.updateUser(
      sessionUser.id,
      updateData,
      publicUserSelect,
      sessionUser.id,
    );

    // Invalidar cache de sessão após atualização de perfil
    await invalidateSessionCache();

    return ApiResponse.json(updatedUser, MESSAGES.SUCCESS.UPDATED);
  } catch (error: any) {
    if (error.message === "User not found")
      return ApiResponse.notFound(MESSAGES.ERROR.NOT_FOUND);
    console.log(error);
    return handleApiError(error, "src/app/api/v1/users/profile/route.ts#PUT");
  }
}
