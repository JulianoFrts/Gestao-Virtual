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

import { z } from "zod";

// Dependency Injection (Manual)
const userRoleRepository = new PrismaUserRoleRepository();
const userRoleService = new UserRoleService(userRoleRepository);

const assignRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.string().min(1),
  scope: z.string().optional(),
  scopeId: z.string().optional(),
  context: z.record(z.unknown()).optional(),
}).passthrough();

const updateRoleSchema = z.object({
  id: z.string().min(1),
  role: z.string().optional(),
  scope: z.string().optional(),
  scopeId: z.string().optional(),
  context: z.record(z.unknown()).optional(),
}).passthrough();

export async function GET(request: NextRequest): Promise<Response> {
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

export async function POST(request: NextRequest): Promise<Response> {
  try {
    await requireAuth();
    const body = await request.json();

    const validation = assignRoleSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.validationError(validation.error.issues.map(i => i.message));
    }

    const newRole = await userRoleService.assignRole(validation.data as unknown);

    return ApiResponse.created(newRole, "Role assigned successfully");
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/user_roles/route.ts#POST");
  }
}

export async function PUT(request: NextRequest): Promise<Response> {
  try {
    await requireAuth();
    const body = await request.json();

    const validation = updateRoleSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.validationError(validation.error.issues.map(i => i.message));
    }

    const updatedRole = await userRoleService.updateRole(validation.data.id, validation.data as unknown);

    return ApiResponse.json(updatedRole, "Role updated successfully");
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/user_roles/route.ts#PUT");
  }
}
