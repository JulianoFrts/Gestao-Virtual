import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { auth, updateSession } from "@/lib/auth/auth";

/**
 * Rota para atualizar manualmente o contexto da sessão (Projeto/Canteiro)
 * Essencial para o "Isolamento de Segurança" sem deslogar o usuário.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized();
    }

    const body = await request.json();
    const { companyId, projectId, siteId } = body;

    // Dispara a atualização do token JWT via NextAuth
    // Isso chamará o callback 'jwt' com trigger 'update' que configuramos no config.ts
    await updateSession({
      user: {
        ...session.user,
        companyId,
        projectId,
        siteId,
      },
    });

    return ApiResponse.json({
      success: true,
      message: "Contexto da sessão atualizado com sucesso",
      context: { companyId, projectId, siteId },
    });
  } catch (error: any) {
    return handleApiError(
      error,
      "src/app/api/v1/auth/session/update/route.ts#POST",
    );
  }
}
