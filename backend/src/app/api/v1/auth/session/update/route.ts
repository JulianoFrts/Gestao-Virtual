import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { getCurrentSession, requireAuth } from "@/lib/auth/session";
import { updateSession } from "@/lib/auth/auth";

import { z } from "zod";

const updateSessionSchema = z.object({
  companyId: z.string().optional(),
  projectId: z.string().optional(),
  siteId: z.string().optional(),
});

/**
 * Rota para atualizar manualmente o contexto da sessão (Projeto/Canteiro)
 * Essencial para o "Isolamento de Segurança" sem deslogar o usuário.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return ApiResponse.unauthorized();
    }

    const body = await request.json();
    const validation = updateSessionSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.validationError(validation.error.issues.map(i => i.message));
    }

    const { companyId, projectId, siteId } = validation.data;

    // Dispara a atualização do token JWT via NextAuth
    // Isso chamará o callback 'jwt' com trigger 'update' que configuramos no config.ts
    await updateSession({
      user: {
        ...user,
        companyId,
        projectId,
        siteId,
      },
    });

    return ApiResponse.json({
      success: true,
      message: "Contexto da sessão atualizado com sucesso",
      context: {
        companyId,
        projectId,
        siteId: siteId === "all" ? "" : siteId,
      },
    });
  } catch (error: unknown) {
    return handleApiError(
      error,
      "src/app/api/v1/auth/session/update/route.ts#POST",
    );
  }
}
