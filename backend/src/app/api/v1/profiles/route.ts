/**
 * Compatibility Route: profiles -> users
 *
 * Maps legacy 'Employee' and 'Profile' fields to the unified 'User' model.
 */

import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { UserService } from "@/modules/users/application/user.service";
import { PrismaUserRepository } from "@/modules/users/infrastructure/prisma-user.repository";

const service = new UserService(new PrismaUserRepository());

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100");

    const legacyProfiles = await service.listLegacyProfiles({ page, limit });

    return ApiResponse.json(legacyProfiles);
  } catch (error: any) {
    return handleApiError(error, "src/app/api/v1/profiles/route.ts#GET");
  }
}
