import { ProductionRepository } from "../domain/production.repository";
import { ProductionProgress } from "../domain/production-progress.entity";
import { logger } from "@/lib/utils/logger";
import { RecordDailyProductionDTO } from "./dtos/record-daily-production.dto";

export class DailyProductionService {
  private readonly logContext = {
    source: "src/modules/production/application/daily-production.service",
  };

  constructor(private readonly repository: ProductionRepository) { }

  async recordDailyProduction(
    dto: RecordDailyProductionDTO,
  ): Promise<ProductionProgress> {
    const { elementId, activityId, projectId, date, data, userId } = dto;

    logger.info(
      `Registrando produção diária: Elemento ${elementId}, Atividade ${activityId}, Data ${date}`,
      { ...this.logContext, userId },
    );

    const existing = await this.repository.findByElement(elementId);
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
      });
    }

    entity.recordDailyProduction(date, data, userId);
    const saved = await this.repository.save(entity);
    return new ProductionProgress(saved);
  }

  async listDailyProduction(
    towerId: string,
    activityId?: string,
    user?: { role: string; companyId?: string | null },
  ) {
    const progress = await this.repository.findProgress(towerId, activityId);
    if (!progress) return [];

    if (user) {
      const { isUserAdmin } = await import("@/lib/auth/session");
      const isAdmin = isUserAdmin(user.role);
      if (!isAdmin || !user.role.includes("SUPER_ADMIN")) {
        const elementCompanyId =
          await this.repository.findElementCompanyId(towerId);
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
