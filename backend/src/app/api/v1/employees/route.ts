/**
 * Compatibility Route: employees -> users
 */

import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { UserService } from "@/modules/users/application/user.service";
import { PrismaUserRepository } from "@/modules/users/infrastructure/prisma-user.repository";
import { requireAuth } from "@/lib/auth/session";

const service = new UserService(new PrismaUserRepository());

export async function GET(request: NextRequest): Promise<Response> {
  try {
    await requireAuth();
    const legacyEmployees = await service.listLegacyEmployees();
    return ApiResponse.json(legacyEmployees);
  } catch (error: unknown) {
    console.error("Error in /api/v1/employees:", error);
    return handleApiError(error, "src/app/api/v1/employees/route.ts#GET");
  }
}
