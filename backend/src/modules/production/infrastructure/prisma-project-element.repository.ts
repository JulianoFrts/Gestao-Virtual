import { prisma } from "@/lib/prisma/client";
import { ProjectElementRepository } from "../domain/project-element.repository";

export class PrismaProjectElementRepository implements ProjectElementRepository {
  async findById(id: string): Promise<any | null> {
    return prisma.mapElementTechnicalData.findUnique({
      where: { id },
    });
  }

  async findByProjectId(
    projectId: string,
    companyId?: string | null,
    siteId?: string,
  ): Promise<any[]> {
    const where: any = { elementType: "TOWER" };
    if (projectId && projectId !== "all") where.projectId = projectId;
    if (companyId) where.companyId = companyId;

    if (siteId && siteId !== "all") {
      if (siteId === "none") {
        where.OR = [
          { documentId: null },
          { document: { siteId: null } }
        ];
      } else {
        where.constructionDocument = { siteId };
      }
    }

    const results = await prisma.mapElementTechnicalData.findMany({
      where,
      orderBy: { sequence: "asc" },
      include: {
        mapElementProductionProgress: {
          include: {
            productionActivity: true,
          },
        },
        activitySchedules: true,
      },
    });

    return results.map((el: any) => ({
      ...el,
      productionProgress: (el.mapElementProductionProgress || []).map((p: any) => ({
        ...p,
        activity: p.productionActivity
      }))
    }));
  }

  async findLinkedActivityIds(projectId: string, siteId?: string): Promise<string[]> {
    const where: any = {
      productionActivityId: { not: null },
    };

    if (siteId && siteId !== "all") {
      where.siteId = siteId;
    } else {
      where.site = { projectId };
    }

    const stages = await prisma.workStage.findMany({
      where,
      select: { productionActivityId: true },
    });

    return stages
      .map((s: any) => s.productionActivityId)
      .filter((id: any): id is string => !!id);
  }

  async findProjectId(elementId: string): Promise<string | null> {
    const element = await prisma.mapElementTechnicalData.findUnique({
      where: { id: elementId },
      select: { projectId: true },
    });
    return element?.projectId || null;
  }

  async findCompanyId(elementId: string): Promise<string | null> {
    const element = await prisma.mapElementTechnicalData.findUnique({
      where: { id: elementId },
      select: { companyId: true },
    });
    return element?.companyId || null;
  }
}
