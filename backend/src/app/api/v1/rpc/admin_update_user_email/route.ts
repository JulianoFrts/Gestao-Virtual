import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { z } from "zod";
import { UserService } from "@/modules/users/application/user.service";
import { PrismaUserRepository } from "@/modules/users/infrastructure/prisma-user.repository";
import { PrismaSystemAuditRepository } from "@/modules/audit/infrastructure/prisma-system-audit.repository";

// DI
const userRepository = new PrismaUserRepository();
const auditRepository = new PrismaSystemAuditRepository();
const userService = new UserService(userRepository, auditRepository);

const updateEmailSchema = z.object({
  userId: z.string(), // Accept UUID or string ID (CUID)
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();

    // Supabase RPC calls often put arguments in the body directly or in a params object
    // The client might be sending { user_id: '...', new_email: '...' } or { params: { ... } }
    console.log("[RPC Update Email] Raw Body:", JSON.stringify(body));

    const p = body.params || body;
    const input = {
      userId: p.userId || p.user_id || p.id,
      email: p.email || p.new_email,
    };

    console.log("[RPC Update Email] Parsed Input:", JSON.stringify(input));

    const result = updateEmailSchema.safeParse(input);

    if (!result.success) {
      return ApiResponse.badRequest(
        "Invalid parameters. Expected userId/user_id and email/new_email.",
      );
    }

    const { userId, email } = result.data;

    const updatedUser = await userService.adminUpdateEmail(
      userId,
      email,
      admin.id,
    );

    return ApiResponse.json(updatedUser, "User email updated successfully");
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/rpc/admin_update_user_email/route.ts#POST");
  }
}
