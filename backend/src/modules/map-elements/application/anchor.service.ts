import { AnchorRepository } from "../domain/anchor.repository";

export class AnchorService {
  constructor(private readonly repository: AnchorRepository) {}

  async getAnchors(params: {
    companyId?: string | null;
    projectId?: string | null;
    towerId?: string | null;
    modelUrl?: string | null;
  }) {
    const { companyId, projectId, towerId, modelUrl } = params;

    if (projectId) {
      if (towerId) {
        // Specific tower or template
        let modelAnchor = await this.repository.findFirst({
          companyId: companyId || undefined,
          projectId: projectId || undefined,
          towerId: towerId,
        });

        if (!modelAnchor) {
          modelAnchor = await this.repository.findFirst({
            companyId: companyId || undefined,
            projectId: projectId || undefined,
            towerId: null,
          });
        }

        const techData = await this.repository.findTechnicalData(
          projectId,
          towerId,
        );
        const meta = techData?.metadata || {};

        return {
          anchors: modelAnchor?.anchors || [],
          technicalKm: meta.technicalKm || 0,
          technicalIndex: meta.technicalIndex || 0,
          circuitId: meta.circuitId || "C1",
        };
      }

      // All anchors for project
      const projectAnchors = await this.repository.findMany({
        projectId: projectId || undefined,
        companyId: companyId || undefined,
      });
      const techDataList = await this.repository.listTechnicalData(projectId);

      const anchorsMap = projectAnchors.reduce((acc: unknown, curr: unknown) => {
        const key = curr.towerId || "template";
        acc[key] = curr.anchors;
        return acc;
      }, {});

      const towerMetadata = techDataList.reduce((acc: unknown, curr: unknown) => {
        const meta = curr.metadata || {};
        acc[curr.externalId] = {
          technicalKm: meta.technicalKm || 0,
          technicalIndex: meta.technicalIndex || 0,
          circuitId: meta.circuitId || "C1",
        };
        return acc;
      }, {});

      return { anchorsMap, towerMetadata };
    }

    if (modelUrl) {
      return this.repository.findLegacyMany({ modelUrl });
    }

    return [];
  }

  async saveAnchors(data: unknown) {
    const { companyId, projectId, towerId, anchors, ...techMeta } = data;

    if (companyId && projectId && towerId && Array.isArray(anchors)) {
      // Logic for company/project existence could be moved to service if needed,
      // but for DDD we might assume they exist or let repo handle implicit creation if it's "infrastructure" detail.
      // However, the route had robust creation logic. I'll move it to AnchorService or Repository.

      // To keep simple for now, I'll pass everything to repo and let it handle the transaction/upserts.

      await this.repository.upsertTechnicalData({
        where: { projectId_externalId: { projectId, externalId: towerId } },
        update: {
          metadata: {
            technicalKm: techMeta.technicalKm,
            technicalIndex: techMeta.technicalIndex,
            circuitId: techMeta.circuitId,
          },
        },
        create: {
          externalId: towerId,
          projectId,
          companyId,
          elementType: "TOWER",
          sequence: 0 /* literal */,
          metadata: {
            technicalKm: techMeta.technicalKm || 0,
            technicalIndex: techMeta.technicalIndex || 0,
            circuitId: techMeta.circuitId || "C1",
          },
        },
      });

      return this.repository.upsert(
        { companyId_projectId_towerId: { companyId, projectId, towerId } },
        { anchors },
        { companyId, projectId, towerId, anchors },
      );
    }

    if (data.modelUrl) {
      return this.repository.createLegacy(data);
    }

    throw new Error("Invalid payload");
  }

  async deleteAnchors(params: {
    id?: string | null;
    companyId?: string | null;
    projectId?: string | null;
    towerId?: string | null;
  }) {
    if (params.companyId && params.projectId && params.towerId) {
      return this.repository.delete({
        companyId_projectId_towerId: {
          companyId: params.companyId,
          projectId: params.projectId,
          towerId: params.towerId,
        },
      });
    }
    if (params.id) {
      return this.repository.deleteLegacy(params.id);
    }
    throw new Error("ID or Context required");
  }
}
