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
import { UserService } from "@/modules/users/application/user.service";
import { PrismaUserRepository } from "@/modules/users/infrastructure/prisma-user.repository";
import { PrismaSystemAuditRepository } from "@/modules/audit/infrastructure/prisma-system-audit.repository";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Inicialização rápida seguindo o padrão do projeto
const userRepository = new PrismaUserRepository();
const systemAuditRepository = new PrismaSystemAuditRepository();
const userService = new UserService(userRepository, systemAuditRepository);

export async function GET(request: NextRequest, { params }: RouteParams): Promise<Response> {
  const { id } = await params;
  try {
    await requireOwnerOrAdmin(id, request);

    const user = await userService.getUserById(id, publicUserSelect);

    if (!user) {
      return ApiResponse.notFound("Perfil não encontrado");
    }

    const legacyProfile = mapToLegacyProfile(user);
    return ApiResponse.json(legacyProfile);
  } catch (error: unknown) {
    return handleApiError(error, "src/app/api/v1/profiles/[id]/route.ts#GET");
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<Response> {
  const { id } = await params;
  try {
    const currentUser = await requireOwnerOrAdmin(id, request);
    const isAdmin = currentUser.role === Role.SYSTEM_ADMIN || currentUser.role === Role.COMPANY_ADMIN;

    const body = await request.json();
    const mappedBody = mapLegacyToUnified(body);

    const validationResult = validate(updateUserSchema, mappedBody);

    if (!validationResult.success) {
      return ApiResponse.validationError(validationResult.errors);
    }

    const updateData = validationResult.data as unknown;

    // Se não for admin, não pode alterar role ou status
    if (!isAdmin && (updateData.role || updateData.status)) {
      return ApiResponse.forbidden(
        "Apenas administradores podem alterar cargo ou status",
      );
    }

    // Delegação para o UserService
    const updatedUser = await userService.updateUser(
      id,
      updateData,
      publicUserSelect,
      currentUser.id,
    );

    const legacyProfile = mapToLegacyProfile(updatedUser);
    return ApiResponse.json(legacyProfile, "Perfil atualizado com sucesso");
  } catch (error: unknown) {
    return handleApiError(error, "src/app/api/v1/profiles/[id]/route.ts#PATCH");
  }
}

export async function PUT(request: NextRequest, context: RouteParams): Promise<Response> {
  return PATCH(request, context);
}

/**
 * Mapeador Model Unificado -> Perfil Legado
 */
function mapToLegacyProfile(user: Record<string, any>) {
  const aff = user.affiliation || {};
  return {
    id: user.id,
    full_name: user.name,
    email: user.authCredential?.email,
    registration_number: aff.registrationNumber,
    cpf: user.cpf,
    phone: user.phone,
    company_id: aff.companyId,
    project_id: aff.projectId,
    site_id: aff.siteId,
    function_id: aff.functionId,
    hierarchy_level: aff.hierarchyLevel,
    is_blocked: user.authCredential?.status !== "ACTIVE",
    is_system_admin: user.authCredential?.role === Role.SYSTEM_ADMIN || user.authCredential?.isSystemAdmin,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  };
}

/**
 * Mapeador Perfil Legado -> Model Unificado
 */
function mapLegacyToUnified(body: Record<string, any>) {
  const mapped: Record<string, unknown> = {
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
    (key) => mapped[key] === undefined && delete mapped[key]
  );

  return mapped;
}
