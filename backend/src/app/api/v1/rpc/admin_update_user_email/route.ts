import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { UserService } from "@/modules/users/application/user.service";
import { PrismaUserRepository } from "@/modules/users/infrastructure/prisma-user.repository";
import { PrismaSystemAuditRepository } from "@/modules/audit/infrastructure/prisma-system-audit.repository";

// DI
const userRepository = new PrismaUserRepository();
const auditRepository = new PrismaSystemAuditRepository();
const userService = new UserService(userRepository, auditRepository);

import { adminUpdateEmailSchema } from "@/lib/utils/validators/route-schemas";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const admin = await requireAdmin();
    const body = await request.json();

    // Supabase RPC calls often put arguments in the body directly or in a params object
    // The client might be sending { user_id: '...', new_email: '...' } or { params: { ... } }
    logger.debug("[RPC Update Email] Raw Body:", { keys: Object.keys(body) });

    const p = body.params || body;
    const schemaInput = {
      userId: p.userId || p.user_id || p.id,
      newEmail: p.email || p.new_email || p.newEmail,
    };

    logger.debug("[RPC Update Email] Parsed Input:", { userId: input.userId });

    const result = adminUpdateEmailSchema.safeParse(schemaInput);

    if (!result.success) {
      return ApiResponse.badRequest(
        "Invalid parameters. Expected userId/user_id and email/new_email.",
      );
    }

    const { userId, newEmail } = result.data;

    const updatedUser = await userService.adminUpdateEmail(
      userId,
      newEmail,
      admin.id,
    );

    return ApiResponse.json(updatedUser, "User email updated successfully");
  } catch (error) {
    return handleApiError(
      error,
      "src/app/api/v1/rpc/admin_update_user_email/route.ts#POST",
    );
  }
}
