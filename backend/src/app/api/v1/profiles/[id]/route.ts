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

    const legacyProfile = mapToLegacyProfile(user);
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
    const mappedBody = mapLegacyToUnified(body);


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

    const legacyProfile = mapToLegacyProfile(updatedUser);
    return ApiResponse.json(legacyProfile, "Perfil atualizado com sucesso");
  } catch (error: any) {
    return handleApiError(error, "src/app/api/v1/profiles/[id]/route.ts#PATCH");
  }
}

export async function PUT(request: NextRequest, context: RouteParams) {
  return PATCH(request, context);
}

/**
 * Mapeador Anti-Corrupção: Model Unificado -> Perfil Legado
 */
function mapToLegacyProfile(user: any) {
  return {
    id: user.id,
    full_name: user.name,
    email: user.authCredential?.email,
    registration_number: user.registrationNumber,
    cpf: user.cpf,
    phone: user.phone,
    company_id: user.companyId,
    project_id: user.projectId,
    site_id: user.siteId,
    function_id: user.functionId,
    hierarchy_level: user.hierarchyLevel,
    is_blocked: user.status !== "ACTIVE",
    is_system_admin: user.role === Role.ADMIN,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  };
}

/**
 * Mapeador Anti-Corrupção: Perfil Legado -> Model Unificado
 */
function mapLegacyToUnified(body: any) {
  const mapped = {
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
  Object.keys(mapped).forEach(
    (key) => (mapped as any)[key] === undefined && delete (mapped as any)[key]
  );

  return mapped;
}
