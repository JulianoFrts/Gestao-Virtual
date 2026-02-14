/**
 * Compatibility Route: employees -> users
 */

import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { UserService } from "@/modules/users/application/user.service";
import { PrismaUserRepository } from "@/modules/users/infrastructure/prisma-user.repository";

const service = new UserService(new PrismaUserRepository());

export async function GET(request: NextRequest) {
  try {
    const legacyEmployees = await service.listLegacyEmployees();
    return ApiResponse.json(legacyEmployees);
  } catch (error: any) {
    console.error("Error in /api/v1/employees:", error);
    return handleApiError(error, "src/app/api/v1/employees/route.ts#GET");
  }
}
