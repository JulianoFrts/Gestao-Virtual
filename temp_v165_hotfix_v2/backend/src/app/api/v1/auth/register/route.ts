/**
 * Auth Register API - GESTÃO VIRTUAL Backend
 *
 * Endpoint: POST /api/v1/auth/register
 */

import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { createUserSchema, validate } from "@/lib/utils/validators/schemas";
import { MESSAGES } from "@/lib/constants";
import { AuthService } from "@/modules/auth/application/auth.service";
import { UserService } from "@/modules/users/application/user.service";
import { PrismaUserRepository } from "@/modules/users/infrastructure/prisma-user.repository";
import { PrismaSystemAuditRepository } from "@/modules/audit/infrastructure/prisma-system-audit.repository";

// DI
const userRepository = new PrismaUserRepository();
const auditRepository = new PrismaSystemAuditRepository();
const userService = new UserService(userRepository, auditRepository);
const authService = new AuthService(userService);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Usamos createUserSchema pela compatibilidade (ou um registerSchema se existir)
    const validationResult = validate(createUserSchema, body);

    if (!validationResult.success) {
      return ApiResponse.validationError(validationResult.errors);
    }

    const {
      email,
      name,
      password,
      role,
      companyId,
      projectId,
      siteId,
      registrationNumber,
      ...otherFields
    } = validationResult.data as any;

    const user = await authService.register({
      email,
      name,
      password,
      role: role || "USER",
      companyId,
      projectId,
      siteId,
      registrationNumber,
      ...otherFields,
    });

    // Frontend expects { user: ... } structure
    return ApiResponse.created({ user }, MESSAGES.SUCCESS.CREATED);
  } catch (error: any) {
    if (error.message === "Email already exists") {
      return ApiResponse.conflict(MESSAGES.USER.EMAIL_EXISTS);
    }
    return handleApiError(error);
  }
}
