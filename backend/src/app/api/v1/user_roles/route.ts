/**
 * Compatibility Route: user_roles
 *
 * Maps the new UserRole structure to what the frontend expects.
 */

import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { UserRoleService } from "@/modules/user-roles/application/user-role.service";
import { PrismaUserRoleRepository } from "@/modules/user-roles/infrastructure/prisma-user-role.repository";

// Dependency Injection (Manual)
const userRoleRepository = new PrismaUserRoleRepository();
const userRoleService = new UserRoleService(userRoleRepository);

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId") || user.id;

    const roles = await userRoleService.getRolesByUser(userId);

    return ApiResponse.json(roles);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/user_roles/route.ts#GET");
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();

    const newRole = await userRoleService.assignRole(body);

    return ApiResponse.created(newRole, "Role assigned successfully");
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/user_roles/route.ts#POST");
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();

    const updatedRole = await userRoleService.updateRole(body.id, body);

    return ApiResponse.json(updatedRole, "Role updated successfully");
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/user_roles/route.ts#PUT");
  }
}
