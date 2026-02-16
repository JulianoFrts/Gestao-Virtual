import { requireAuth } from "@/lib/auth/session";
import { UserService } from "@/modules/users/application/user.service";
import { PrismaUserRepository } from "@/modules/users/infrastructure/prisma-user.repository";
import { PrismaSystemAuditRepository } from "@/modules/audit/infrastructure/prisma-system-audit.repository";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";

export async function GET() {
  try {
    const userId = await requireAuth().then(u => u.id);

    const userRepo = new PrismaUserRepository();
    const auditRepo = new PrismaSystemAuditRepository();
    const userService = new UserService(userRepo, auditRepo);

    // getProfile já busca dados aninhados e calcula permissões/flags de UI
    const profile = await userService.getProfile(userId);

    return ApiResponse.json(profile);
  } catch (error: any) {
    return handleApiError(error, "src/app/api/v1/users/me/route.ts#GET");
  }
}
