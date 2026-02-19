import { prisma } from "@/lib/prisma/client";
import { ProductionSyncRepository } from "../domain/production-sync.repository";

export class PrismaProductionSyncRepository implements ProductionSyncRepository {
  async syncWorkStages(
    towerId: string,
    activityId: string,
    projectId: string,
    updatedBy: string,
  ): Promise<void> {
    try {
      const element = await prisma.mapElementTechnicalData.findUnique({
        where: { id: towerId },
      });
      if (!element) return;

      const linkedStages = await (prisma as any).workStage.findMany({
        where: { productionActivityId: activityId },
      });

      for (const stage of linkedStages as any[]) {
        await this.syncWorkStageItem(stage, activityId, projectId, updatedBy);
      }
    } catch (error) {
      console.error("Error syncing work stages:", error);
    }
  }

  private async syncWorkStageItem(
    stage: any,
    activityId: string,
    projectId: string,
    updatedBy: string,
  ) {
    const aggregate = await prisma.mapElementProductionProgress.aggregate({
      where: {
        activityId,
        project: { id: projectId },
      },
      _avg: { progressPercent: true },
    });

    const avgProgress = aggregate._avg.progressPercent
      ? Number(aggregate._avg.progressPercent)
      : 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const id = `auto_${stage.id}_${today.getTime()}`;

    await prisma.stageProgress.upsert({
      where: { id },
      update: { actualPercentage: avgProgress, updatedBy: updatedBy },
      create: {
        id,
        stageId: stage.id,
        actualPercentage: avgProgress,
        plannedPercentage: 0,
        recordedDate: today,
        updatedBy: updatedBy,
        notes: "Sincronização Automática (Modelo DDD)",
      },
    });
  }
}
