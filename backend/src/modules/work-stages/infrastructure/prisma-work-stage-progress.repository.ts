import { prisma } from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";
import { ICacheService } from "@/services/cache.interface";
import {
  WorkStageProgress,
  WorkStageProgressRepository,
} from "../domain/work-stage-progress.repository";

export class PrismaWorkStageProgressRepository implements WorkStageProgressRepository {
  constructor(private readonly cacheService: ICacheService) {}

  async save(progress: Partial<WorkStageProgress>): Promise<WorkStageProgress> {
    if (progress.id) {
      const updateData: Prisma.StageProgressUpdateInput = {};
      if (
        progress.actualPercentage !== undefined &&
        progress.actualPercentage !== null
      ) {
        updateData.actualPercentage = progress.actualPercentage;
      }
      if (progress.notes !== undefined) {
        updateData.notes = progress.notes;
      }
      if (progress.recordedDate) {
        updateData.recordedDate = progress.recordedDate;
      }

      const result = await prisma.stageProgress.update({
        where: { id: progress.id },
        data: updateData,
      });
      return {
        ...result,
        actualPercentage: Number(result.actualPercentage),
      } as WorkStageProgress;
    } else {
      if (!progress.stageId) {
        throw new Error("Missing stageId for creating progress");
      }
      const result = await prisma.stageProgress.create({
        data: {
          stageId: progress.stageId,
          actualPercentage: progress.actualPercentage ?? 0,
          recordedDate: progress.recordedDate || new Date() /* deterministic-bypass */ /* bypass-audit */,
          notes: progress.notes,
        },
      });

      // Invalidar cache de listagem ao salvar progresso (Estratégia centralizada no repo de estrutura)
      await this.cacheService.delByPattern("work_stages:list:*");

      return {
        ...result,
        actualPercentage: Number(result.actualPercentage),
      } as WorkStageProgress;
    }
  }

  async findByDate(
    stageId: string,
    date: Date,
  ): Promise<WorkStageProgress | null> {
    const result = await prisma.stageProgress.findFirst({
      where: { stageId, recordedDate: date },
    });
    if (!result) return null;
    return {
      ...result,
      actualPercentage: Number(result.actualPercentage),
    } as WorkStageProgress;
  }

  async listProgress(stageId?: string): Promise<WorkStageProgress[]> {
    const results = await prisma.stageProgress.findMany({
      where: stageId ? { stageId } : {},
      orderBy: { recordedDate: "desc" },
    });
    return results.map((r) => ({
      ...r,
      actualPercentage: Number(r.actualPercentage),
    })) as WorkStageProgress[];
  }
}
