import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { ContextValidationService } from "@/modules/auth/application/context-validation.service";
import { prisma } from "@/lib/prisma/client";

const contextService = new ContextValidationService();

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireAuth();
    const body = await request.json();

    const { companyId, projectId, siteId } = body;

    // 1. Validar Contexto
    const validation = await contextService.validateUserContext(sessionUser.id, {
      companyId,
      projectId,
      siteId
    });

    if (!validation.isValid) {
      return ApiResponse.badRequest(validation.error || "Contexto inválido para seu nível de acesso.");
    }

    // 2. Atualizar Affiliation (Ou garantir que existe se for fixo)
    // Se o usuário for Gestão Global ou Gestor, podemos querer salvar essa "seleção" temporária na sessão
    // ou atualizar o vínculo se ele não for fixo. 
    // Por regras de negócio, vamos apenas retornar sucesso para que o Frontend use esses dados no Cache/Signals.
    
    // Opcional: Registrar que este login foi vinculado a este contexto no AuditLog
    await prisma.auditLog.create({
        data: {
          userId: sessionUser.id,
          action: "CONTEXT_SELECTED",
          entity: "Auth",
          newValues: { companyId, projectId, siteId },
          ipAddress: "SystemAuth",
        },
      });

    return ApiResponse.json({ 
        success: true, 
        context: { companyId, projectId, siteId } 
    });
  } catch (error: any) {
    return handleApiError(error, "src/app/api/v1/auth/context/validate/route.ts#POST");
  }
}
