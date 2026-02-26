/**
 * Compatibility Route: profiles -> users
 *
 * Maps legacy 'Employee' and 'Profile' fields to the unified 'User' model.
 */

import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { UserService } from "@/modules/users/application/user.service";
import { PrismaUserRepository } from "@/modules/users/infrastructure/prisma-user.repository";
import { API } from "@/lib/constants";
import { requireAuth } from "@/lib/auth/session";

const service = new UserService(new PrismaUserRepository());

export async function GET(request: NextRequest): Promise<Response> {
  try {
    await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || String(API.PAGINATION.DEFAULT_PAGE_SIZE));

    const legacyProfiles = await service.listLegacyProfiles({ page, limit });

    return ApiResponse.json(legacyProfiles);
  } catch (error: unknown) {
    return handleApiError(error, "src/app/api/v1/profiles/route.ts#GET");
  }
}
