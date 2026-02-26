import { NextRequest } from "next/server";
import { PrismaProductionConfigRepository } from "@/modules/production/infrastructure/prisma-production-config.repository";
import { PrismaProductionCatalogueRepository } from "@/modules/production/infrastructure/prisma-production-catalogue.repository";
import { ProductionConfigService } from "@/modules/production/application/production-config.service";
import * as authSession from "@/lib/auth/session";
import { requireAuth } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { HTTP_STATUS, MESSAGES } from "@/lib/constants";

import { z } from "zod";

const configRepo = new PrismaProductionConfigRepository();
const catalogueRepo = new PrismaProductionCatalogueRepository();
const configService = new ProductionConfigService(configRepo, catalogueRepo);

const upsertCostsSchema = z.object({
  projectId: z.string().min(1, "Project ID required"),
  costs: z.array(z.object({
    activityId: z.string().min(1),
    unitPrice: z.number().min(0),
    measureUnit: z.string().min(1),
  })).min(1, "Invalid data"),
});

// GET: Fetch unit costs for a project
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const user = await authSession.requireAuth();

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return ApiResponse.badRequest("Project ID required");
    }

    // Multitenancy Check
    const { isGlobalAdmin } = await import("@/lib/auth/session");
    const userRole = user.role;
    const userHierarchy = user.hierarchyLevel;
    const userPermissions = user.permissions as Record<string, boolean>;
    const userCompanyId = user.companyId;

    if (!isGlobalAdmin(userRole, userHierarchy, userPermissions)) {
      const { prisma } = await import("@/lib/prisma/client");

      const whereClause: Record<string, string> = { companyId: userCompanyId! };
      if (projectId !== "all") {
        whereClause.id = projectId;
      }

      const project = await prisma.project.findFirst({
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
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth();

    const body = await req.json();
    
    const validation = upsertCostsSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.validationError(validation.error.issues.map(i => i.message));
    }

    const { projectId, costs } = validation.data;

    // Multitenancy Check
    const { isGlobalAdmin } = await import("@/lib/auth/session");
    if (
      !isGlobalAdmin(
        user.role,
        user.hierarchyLevel,
        user.permissions as Record<string, boolean>,
      )
    ) {
      const { prisma } = await import("@/lib/prisma/client");
      const project = await prisma.project.findFirst({
        where: { id: projectId, companyId: user.companyId },
      });
      if (!project) {
        return ApiResponse.forbidden();
      }
    }

    const result = await configService.upsertUnitCosts(projectId, costs as unknown);

    return ApiResponse.json(result);
  } catch (error) {
    return handleApiError(
      error,
      "src/app/api/v1/production/costs/config/route.ts#POST",
    );
  }
}
