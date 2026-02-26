import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { ContextValidationService } from "@/modules/auth/application/context-validation.service";

const contextService = new ContextValidationService();

export async function GET(): Promise<Response> {
  try {
    const sessionUser = await requireAuth();
    const options = await contextService.getAvailableContextOptions(sessionUser.id);

    return ApiResponse.json(options);
  } catch (error: unknown) {
    return handleApiError(error, "src/app/api/v1/auth/context/options/route.ts#GET");
  }
}
