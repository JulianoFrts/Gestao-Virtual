import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import {
  updateUserSchema,
  cuidSchema,
  validate,
} from "@/lib/utils/validators/schemas";
import {
  requireAdmin,
  requireOwnerOrAdmin,
  isUserAdmin,
} from "@/lib/auth/session";
import { publicUserSelect } from "@/types/database";
import { MESSAGES } from "@/lib/constants";
import { UserService } from "@/modules/users/application/user.service";
import { PrismaUserRepository } from "@/modules/users/infrastructure/prisma-user.repository";
import { PrismaSystemAuditRepository } from "@/modules/audit/infrastructure/prisma-system-audit.repository";


// DI (Manual)
const userRepository = new PrismaUserRepository();
const auditRepository = new PrismaSystemAuditRepository();
const userService = new UserService(userRepository, auditRepository);

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

function validateUserId(
  id: string,
):
  | { valid: true; id: string }
  | { valid: false; response: ReturnType<typeof ApiResponse.badRequest> } {
  const result = cuidSchema.safeParse(id);
  if (!result.success)
    return {
      valid: false,
      response: ApiResponse.badRequest("ID de usuário inválido"),
    };
  return { valid: true, id: result.data };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const idValidation = validateUserId(id);
    if (!idValidation.valid) return idValidation.response;

    await requireOwnerOrAdmin(idValidation.id);

    const user = await userService.getProfile(idValidation.id);
    return ApiResponse.json(user);
  } catch (error: any) {
    if (error.message === "User not found")
      return ApiResponse.notFound(MESSAGES.USER.NOT_FOUND);
    return handleApiError(error, "src/app/api/v1/users/[id]/route.ts#GET");
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const idValidation = validateUserId(id);
    if (!idValidation.valid) return idValidation.response;

    const currentUser = await requireOwnerOrAdmin(idValidation.id);
    const isAdmin = isUserAdmin(currentUser.role as string);

    const rawBody = await request.json();
    const body: any = { ...rawBody };

    // Transform snake_case to camelCase and normalize fields
    if (body.company_id !== undefined) body.companyId = body.company_id;
    if (body.project_id !== undefined) body.projectId = body.project_id;
    if (body.site_id !== undefined) body.siteId = body.site_id;
    if (body.function_id !== undefined) body.functionId = body.function_id;
    if (body.registration_number !== undefined)
      body.registrationNumber = body.registration_number;

    if (body.labor_type !== undefined) body.laborType = body.labor_type;
    if (body.iap_name !== undefined) body.iapName = body.iap_name;
    if (body.birth_date !== undefined) body.birthDate = body.birth_date;

    // Normalização de Nome (Frontend Gestão Virtual usa fullName)
    if (body.fullName !== undefined && body.name === undefined) {
      body.name = body.fullName;
    }

    const validationResult = validate(updateUserSchema, body);
    if (!validationResult.success) {
      console.warn(`[UserUpdate] Validation failed for user ${idValidation.id}:`, validationResult.errors);
      return ApiResponse.validationError(validationResult.errors);
    }

    const updateData: any = validationResult.data;

    // Role normalization
    if (updateData.role && typeof updateData.role === "string") {
      const r = updateData.role.toUpperCase();
      if (r === "ADMIN" || r === "ADMINISTRADOR") updateData.role = "ADMIN";
      else if (r === "USER") updateData.role = "USER";
    }

    if (!isAdmin && (updateData.role || updateData.status)) {
      return ApiResponse.forbidden(
        "Apenas administradores podem alterar cargo ou status",
      );
    }

    const updatedUser = await userService.updateUser(
      idValidation.id,
      updateData,
      publicUserSelect,
      currentUser.id,
    );

    return ApiResponse.json(updatedUser, MESSAGES.SUCCESS.UPDATED);
  } catch (error: any) {
    if (error.message === "User not found")
      return ApiResponse.notFound(MESSAGES.USER.NOT_FOUND);
    if (error.message === "Email already exists")
      return ApiResponse.conflict(MESSAGES.USER.EMAIL_EXISTS);

    return handleApiError(error, "src/app/api/v1/users/[id]/route.ts#PUT");
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const idValidation = validateUserId(id);
    if (!idValidation.valid) return idValidation.response;

    const admin = await requireAdmin();
    if (admin.id === idValidation.id)
      return ApiResponse.badRequest("Não é possível deletar sua própria conta");

    await userService.deleteUser(idValidation.id, admin.id);

    return ApiResponse.noContent();
  } catch (error: any) {
    if (error.message === "User not found")
      return ApiResponse.notFound(MESSAGES.USER.NOT_FOUND);
    if (error.message === "Cannot delete an administrator")
      return ApiResponse.forbidden(
        "Não é possível deletar outro administrador",
      );
    return handleApiError(error, "src/app/api/v1/users/[id]/route.ts#DELETE");
  }
}
