import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { ROLE_LEVELS } from "@/lib/constants";
import { requireAuth } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/user_roles/hierarchy
 *
 * Retorna os níveis de hierarquia de cargos para uso no frontend.
 * Fonte única de verdade.
 */
export async function GET(): Promise<Response> {
  try {
    await requireAuth();
    // Retorna a constante ROLE_LEVELS definida no constants/index.ts
    return ApiResponse.json(ROLE_LEVELS);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/user_roles/hierarchy/route.ts#GET");
  }
}
