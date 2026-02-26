import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { QualityTestRunnerService } from "@/modules/audit/application/quality-test-runner.service";

export const dynamic = "force-dynamic";

const testRunnerService = new QualityTestRunnerService();

export async function GET(_request: NextRequest): Promise<Response> {
  try {
    // Garante que apenas administradores possam disparar o executor
    const user = await requireAdmin();

    logger.info("Backend Quality Test Runner invocado manualmente via API", {
      url: _request.url,
      userId: user.id
    });

    const stream = testRunnerService.runTestsStream();

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no", // Desabilita buffering para Nginx/Proxies
      },
    });

  } catch (error) {
    return handleApiError(error, "src/app/api/v1/audit/quality-tests/route.ts#GET");
  }
}
