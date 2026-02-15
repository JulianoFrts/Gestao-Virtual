/**
 * Compatibility Route: profiles/[id] -> users/[id]
 *
 * Maps legacy profile operations to unified User model
 */

import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { updateUserSchema, validate } from "@/lib/utils/validators/schemas";
import { requireOwnerOrAdmin } from "@/lib/auth/session";
import { publicUserSelect, Role } from "@/types/database";
import { logger } from "@/lib/utils/logger";
import { UserService } from "@/modules/users/application/user.service";
import { PrismaUserRepository } from "@/modules/users/infrastructure/prisma-user.repository";
import { PrismaSystemAuditRepository } from "@/modules/audit/infrastructure/prisma-system-audit.repository";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Inicialização rápida seguindo o padrão do projeto
const userRepository = new PrismaUserRepository();
const auditRepository = new PrismaSystemAuditRepository();
const userService = new UserService(userRepository, auditRepository);

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    await (requireOwnerOrAdmin as any)(id);

    const user = await userService.getUserById(id, publicUserSelect);

    if (!user) {
      return ApiResponse.notFound("Perfil não encontrado");
    }

    // Map to legacy profile structure (Anti-Corruption Layer)
    const legacyProfile = {
      id: user.id,
      full_name: user.name,
      email: (user as any).authCredential?.email,
      registration_number: (user as any).registrationNumber,
      cpf: (user as any).cpf,
      phone: (user as any).phone,
      company_id: (user as any).companyId,
      project_id: (user as any).projectId,
      site_id: (user as any).siteId,
      function_id: (user as any).functionId,
      hierarchy_level: (user as any).hierarchyLevel,
      is_blocked: (user as any).status !== "ACTIVE",
      is_system_admin: (user as any).role === Role.ADMIN,
      created_at: (user as any).createdAt,
      updated_at: (user as any).updatedAt,
    };

    return ApiResponse.json(legacyProfile);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/profiles/[id]/route.ts#GET");
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const currentUser = await (requireOwnerOrAdmin as any)(id);
    const isAdmin = currentUser.role === Role.ADMIN;

    const body = await request.json();

    // Map legacy field names to unified model
    const mappedBody = {
      name: body.full_name || body.name,
      email: body.email,
      phone: body.phone,
      registrationNumber: body.registration_number,
      cpf: body.cpf,
      companyId: body.company_id,
      projectId: body.project_id,
      siteId: body.site_id,
      functionId: body.function_id,
      hierarchyLevel: body.hierarchy_level,
      password: body.password,
      role: body.role,
      status: body.status,
    };

    // Remove undefined values
    Object.keys(mappedBody).forEach(
      (key) =>
        (mappedBody as any)[key] === undefined &&
        delete (mappedBody as any)[key],
    );

    const validationResult = validate(updateUserSchema, mappedBody);

    if (!validationResult.success) {
      return ApiResponse.validationError(validationResult.errors);
    }

    const updateData = validationResult.data as any;

    // Se não for admin, não pode alterar role ou status
    if (!isAdmin && (updateData.role || updateData.status)) {
      return ApiResponse.forbidden(
        "Apenas administradores podem alterar cargo ou status",
      );
    }

    // Delegação para o UserService (Encapsulamento de Regras de Negócio)
    // Passamos currentUser.id como performerId para auditoria automática
    const updatedUser = await userService.updateUser(
      id,
      updateData,
      publicUserSelect,
      currentUser.id,
    );

    // Map back to legacy profile structure
    const legacyProfile = {
      id: updatedUser.id,
      full_name: updatedUser.name,
      email: (updatedUser as any).authCredential?.email,
      registration_number: (updatedUser as any).registrationNumber,
      cpf: (updatedUser as any).cpf,
      phone: (updatedUser as any).phone,
      company_id: (updatedUser as any).companyId,
      project_id: (updatedUser as any).projectId,
      site_id: (updatedUser as any).siteId,
      function_id: (updatedUser as any).functionId,
      hierarchy_level: (updatedUser as any).hierarchyLevel,
      is_blocked: (updatedUser as any).status !== "ACTIVE",
      is_system_admin: (updatedUser as any).role === Role.ADMIN,
      created_at: (updatedUser as any).createdAt,
      updated_at: (updatedUser as any).updatedAt,
    };

    return ApiResponse.json(legacyProfile, "Perfil atualizado com sucesso");
  } catch (error: any) {
    return handleApiError(error, "src/app/api/v1/profiles/[id]/route.ts#PATCH");
  }
}

// Also support PUT for compatibility
export async function PUT(request: NextRequest, context: RouteParams) {
  return PATCH(request, context);
}
