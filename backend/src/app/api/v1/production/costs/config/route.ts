import { NextRequest } from "next/server";
import { PrismaProductionRepository } from "@/modules/production/infrastructure/prisma-production.repository";
import { ProductionConfigService } from "@/modules/production/application/production-config.service";
import { getCurrentSession } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { HTTP_STATUS, MESSAGES } from "@/lib/constants";

const repository = new PrismaProductionRepository();
const configService = new ProductionConfigService(repository);

// GET: Fetch unit costs for a project
export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.user) {
      return ApiResponse.unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return ApiResponse.badRequest("Project ID required");
    }

    // Multitenancy Check
    const { isUserAdmin } = await import("@/lib/auth/session");
    if (!isUserAdmin(session.user.role)) {
      const { prisma } = await import("@/lib");
      const project = await (prisma as any).project.findFirst({
        where: { id: projectId, companyId: (session.user as any).companyId },
      });
      if (!project) {
        return ApiResponse.forbidden();
      }
    }

    const costs = await configService.listUnitCosts(projectId);

    return ApiResponse.json(costs);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/production/costs/config/route.ts#GET");
  }
}

// POST: Upsert unit costs
export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.user) {
      return ApiResponse.unauthorized();
    }

    const body = await req.json();
    const { projectId, costs } = body;

    if (!projectId || !Array.isArray(costs)) {
      return ApiResponse.badRequest("Invalid data");
    }

    // Multitenancy Check
    const { isUserAdmin } = await import("@/lib/auth/session");
    if (!isUserAdmin(session.user.role)) {
      const { prisma } = await import("@/lib");
      const project = await (prisma as any).project.findFirst({
        where: { id: projectId, companyId: (session.user as any).companyId },
      });
      if (!project) {
        return ApiResponse.forbidden();
      }
    }

    const result = await configService.upsertUnitCosts(projectId, costs);

    return ApiResponse.json(result);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/production/costs/config/route.ts#POST");
  }
}
