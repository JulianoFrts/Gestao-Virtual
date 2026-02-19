import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { ProductionService } from "@/modules/production/application/production.service";
import { ProductionFactory } from "@/modules/production/application/production.factory";

const productionService = ProductionFactory.create();

export async function GET(_request: NextRequest) {
  try {
    await requireAuth();
    const iaps = await productionService.listIAPs();
    return ApiResponse.json(iaps);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/list_iap/route.ts#GET");
  }
}
