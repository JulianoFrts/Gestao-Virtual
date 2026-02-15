import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api";
import { requireAuth } from "@/lib/auth/session";
import { GovernanceService } from "@/modules/audit/application/governance.service";
import { PrismaGovernanceRepository } from "@/modules/audit/infrastructure/prisma-governance.repository";

const governanceService = new GovernanceService(
  new PrismaGovernanceRepository(),
);

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all"; // all, architectural, routes
    const limit = parseInt(searchParams.get("limit") || "50");

    const results = await governanceService.getHistory(type, limit);

    return ApiResponse.json(results);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/audit/history/route.ts#GET");
  }
}
