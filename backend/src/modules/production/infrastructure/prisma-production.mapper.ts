import {
  MapElementProductionProgress,
  ProductionActivity,
} from "@prisma/client";
import { ProductionProgress } from "@/modules/production/domain/production-progress.entity";
import {
  ActivityStatus,
  ProgressHistoryEntry,
  DailyProductionRecord,
} from "@/modules/production/domain/production.repository";
import { ActivityStatusDTO } from "@/modules/production/application/dtos/production-progress.dto";

export class ProductionMapper {
  /**
   * Maps a Prisma raw entity to a Domain Entity
   */
  static toDomain(
    raw: MapElementProductionProgress & {
      productionActivity?: ProductionActivity | null;
    },
  ): ProductionProgress {
    return new ProductionProgress({
      id: raw.id,
      projectId: raw.projectId,
      elementId: raw.elementId,
      activityId: raw.activityId,
      currentStatus: raw.currentStatus as ActivityStatus,
      progressPercent: raw.progressPercent ? Number(raw.progressPercent) : 0,
      history: (raw.history as ProgressHistoryEntry[]) || [],
      dailyProduction:
        (raw.dailyProduction as Record<
          string,
          DailyProductionRecord
        >) || {},
      requiresApproval: raw.requiresApproval ?? undefined,
      approvalReason: raw.approvalReason,
      startDate: raw.startDate,
      endDate: raw.endDate,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      activity: raw.productionActivity
        ? {
            id: raw.productionActivity.id,
            name: raw.productionActivity.name,
          }
        : undefined,
    });
  }

  /**
   * Maps a Domain Entity to an Application DTO
   */
  static toDTO(entity: ProductionProgress): ActivityStatusDTO {
    return {
      activityId: entity.activityId,
      status: entity.currentStatus,
      progressPercent: entity.progressPercent,
      startDate: entity.startDate,
      endDate: entity.endDate,
      activity: entity.activity,
      // Any additional fields from the entity can be added here
      ...(entity as unknown),
    };
  }
}
