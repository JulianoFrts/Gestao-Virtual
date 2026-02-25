import { ProductionProgressRepository } from "../domain/production.repository";
import { ProjectElementRepository } from "../domain/project-element.repository";
import { ProductionProgress } from "../domain/production-progress.entity";
import { logger } from "@/lib/utils/logger";
import { RecordDailyProductionDTO } from "./dtos/record-daily-production.dto";

export class DailyProductionService {
  private readonly logContext = {
    source: "src/modules/production/application/daily-production.service",
  };

  constructor(
    private readonly progressRepository: ProductionProgressRepository,
    private readonly elementRepository: ProjectElementRepository,
  ) {}

  async recordDailyProduction(
    dto: RecordDailyProductionDTO,
  ): Promise<ProductionProgress> {
    const { elementId, activityId, projectId, date, data, userId } = dto;

    logger.info(
      `Registrando produção diária: Elemento ${elementId}, Atividade ${activityId}, Data ${date}`,
      { ...this.logContext, userId },
    );

    const existing = await this.progressRepository.findByElement(elementId);
    const progressRecord = existing.find((p) => p.activityId === activityId);

    let entity: ProductionProgress;

    if (progressRecord) {
      entity = new ProductionProgress(progressRecord);
    } else {
      entity = new ProductionProgress({
        projectId,
        elementId,
        activityId,
        currentStatus: "PENDING",
        progressPercent: 0,
        history: [],
        dailyProduction: {},
        updatedAt: new Date(),
      });
    }

    entity.recordDailyProduction(date, data, userId);
    const saved = await this.progressRepository.save(entity);
    return new ProductionProgress(saved);
  }

  async getElementCompanyId(elementId: string) {
    return this.elementRepository.findCompanyId(elementId);
  }

  async getElementProjectId(elementId: string) {
    return this.elementRepository.findProjectId(elementId);
  }

  async listDailyProduction(
    towerId: string,
    activityId?: string,
    user?: {
      role: string;
      companyId?: string | null;
      hierarchyLevel?: number;
      permissions?: Record<string, boolean>;
    },
  ) {
    const progress = await this.progressRepository.findProgress(
      towerId,
      activityId,
    );
    if (!progress) return [];

    if (user) {
      const { isGlobalAdmin } = await import("@/lib/auth/session");
      const isGlobal = isGlobalAdmin(
        user.role,
        user.hierarchyLevel,
        user.permissions,
      );
      if (!isGlobal) {
        const elementCompanyId =
          await this.elementRepository.findCompanyId(towerId);
        if (elementCompanyId !== user.companyId) {
          throw new Error("Forbidden: You do not have access to this element");
        }
      }
    }

    const daily = progress.dailyProduction || {};

    return Object.entries(daily).map(([date, data]: [string, any]) => ({
      workDate: date,
      ...data,
      elementId: progress.elementId,
      activityId: progress.activityId,
    }));
  }
}
