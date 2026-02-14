import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { ProductionService } from "@/modules/production/application/production.service";
import { PrismaProductionRepository } from "@/modules/production/infrastructure/prisma-production.repository";

// DI (Manual)
const productionRepository = new PrismaProductionRepository();
const productionService = new ProductionService(productionRepository);

export async function GET(_request: NextRequest) {
  try {
    const iaps = await productionService.listIAPs();
    return ApiResponse.json(iaps);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/list_iap/route.ts#GET");
  }
}
