import { prisma } from "@/lib/prisma/client";
import { cacheService } from "@/services/cacheService";

export interface WorkStageProgress {
  id: string;
  stageId: string;
  actualPercentage: number;
  recordedDate: Date;
  notes?: string | null;
}

export interface WorkStageProgressRepository {
  save(progress: Partial<WorkStageProgress>): Promise<WorkStageProgress>;
  findByDate(stageId: string, date: Date): Promise<WorkStageProgress | null>;
  listProgress(stageId?: string): Promise<WorkStageProgress[]>;
}

export class PrismaWorkStageProgressRepository implements WorkStageProgressRepository {
  async save(progress: Partial<WorkStageProgress>): Promise<WorkStageProgress> {
    if (progress.id) {
      const updateData: any = {};
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
      const result = await prisma.stageProgress.create({
        data: {
          stageId: progress.stageId!,
          actualPercentage: progress.actualPercentage ?? 0,
          recordedDate: progress.recordedDate || new Date(),
          notes: progress.notes,
        },
      });

      // Invalidar cache de listagem ao salvar progresso (Estratégia centralizada no repo de estrutura)
      await cacheService.delByPattern("work_stages:list:*");

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
