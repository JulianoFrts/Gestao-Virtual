import { NextRequest } from "next/server";
import { PrismaProductionConfigRepository } from "@/modules/production/infrastructure/prisma-production-config.repository";
import { PrismaProductionCatalogueRepository } from "@/modules/production/infrastructure/prisma-production-catalogue.repository";
import { ProductionConfigService } from "@/modules/production/application/production-config.service";
import { getCurrentSession } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { HTTP_STATUS, MESSAGES } from "@/lib/constants";

const configRepo = new PrismaProductionConfigRepository();
const catalogueRepo = new PrismaProductionCatalogueRepository();
const configService = new ProductionConfigService(configRepo, catalogueRepo);

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
    const userRole = session.user.role;
    const userHierarchy = (session.user as any).hierarchyLevel;
    const userCompanyId = (session.user as any).companyId;

    if (!isUserAdmin(userRole, userHierarchy)) {
      const { prisma } = await import("@/lib");

      const whereClause: any = { companyId: userCompanyId };
      if (projectId !== "all") {
        whereClause.id = projectId;
      }

      const project = await (prisma as any).project.findFirst({
        where: whereClause,
      });

      if (!project) {
        return ApiResponse.forbidden();
      }
    }

    // If projectId is "all", we might need to adjust configService.listUnitCosts
    // But usually for multitenancy we just need to confirm they OWN the right to see it.
    const costs = await configService.listUnitCosts(projectId);

    return ApiResponse.json(costs);
  } catch (error) {
    return handleApiError(
      error,
      "src/app/api/v1/production/costs/config/route.ts#GET",
    );
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
    return handleApiError(
      error,
      "src/app/api/v1/production/costs/config/route.ts#POST",
    );
  }
}
