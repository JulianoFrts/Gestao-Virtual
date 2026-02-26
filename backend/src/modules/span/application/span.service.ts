import { Span, SpanRepository } from "../domain/span.repository";
import { spanSchema, mapDtoToEntity } from "../domain/span.schema";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";

export class SpanService {
  constructor(private spanRepository: SpanRepository) {}

  async getProjectSpans(projectId: string): Promise<Span[]> {
    return this.spanRepository.findByProject(projectId);
  }

  async getCompanySpans(companyId: string): Promise<Span[]> {
    return this.spanRepository.findByCompany(companyId);
  }

  async saveSpans(data: unknown): Promise<Span[]> {
    const items = Array.isArray(data) ? data : [data];
    const spansToSave: Span[] = [];

    for (const element of items) {
      const span = await this.processAndValidateSpan(element);
      spansToSave.push(span);
    }

    return this.spanRepository.saveMany(spansToSave);
  }

  private async processAndValidateSpan(element: unknown): Promise<Span> {
    const parseResult = spanSchema.safeParse(element);
    if (!parseResult.success) {
      console.error("Erro ao salvar vãos:", parseResult.error);
      throw new Error(
        "Falha na validação dos dados do vão: " +
          parseResult.error.issues.map((e: unknown) => e.message).join(", "),
      );
    }

    const entity = mapDtoToEntity(parseResult.data);

    // --- VALIDAÇÃO DE SEQUÊNCIA (Business Logic) ---
    await this.validateTowerSequence(entity);

    return entity;
  }

  private async validateTowerSequence(span: Span) {
    if (!span.projectId || !span.towerStartId || !span.towerEndId) return;

    const towers = await this.fetchValidationTowers(
      span.projectId,
      span.towerStartId,
      span.towerEndId,
    );

    if (towers.length < 2) {
      logger.warn(
        `[Domain] Vão ignorado: Uma ou ambas as torres não encontradas: ${span.towerStartId}, ${span.towerEndId}`,
      );
      return;
    }

    const startTower = towers.find(
      (t: unknown) => t.objectId === span.towerStartId,
    );
    const endTower = towers.find((t: unknown) => t.objectId === span.towerEndId);

    if (startTower && endTower) {
      await this.detectSequenceGaps(span, startTower, endTower);
    }
  }

  private async fetchValidationTowers(
    projectId: string,
    startId: string,
    endId: string,
  ) {
    return (prisma as unknown).towerTechnicalData.findMany({
      where: {
        projectId: projectId,
        objectId: { in: [startId, endId] },
      },
      select: { objectId: true, objectSeq: true },
    });
  }

  private async detectSequenceGaps(
    span: Span,
    startTower: { objectSeq: number },
    endTower: { objectSeq: number },
  ) {
    const minSeq = Math.min(startTower.objectSeq, endTower.objectSeq);
    const maxSeq = Math.max(startTower.objectSeq, endTower.objectSeq);

    if (maxSeq - minSeq > 1) {
      const intermediates = await (prisma as unknown).towerTechnicalData.findMany({
        where: {
          projectId: span.projectId!,
          objectSeq: { gt: minSeq, lt: maxSeq },
        },
        select: { objectId: true },
      });

      if (intermediates.length > 0) {
        const skipList = intermediates.map((t: unknown) => t.objectId).join(", ");
        logger.warn(
          `[Domain] Detectado salto de torres entre ${span.towerStartId} e ${span.towerEndId}. Intermediárias: ${skipList}`,
          { projectId: span.projectId },
        );
      }
    }
  }

  async deleteSpan(id: string): Promise<void> {
    return this.spanRepository.deleteById(id);
  }

  async deleteSpansBetweenTowers(
    projectId: string,
    towerStartId: string,
    towerEndId: string,
  ): Promise<number> {
    return this.spanRepository.deleteByTowers(
      projectId,
      towerStartId,
      towerEndId,
    );
  }

  async deleteAllFromProject(projectId: string): Promise<number> {
    return this.spanRepository.deleteByProject(projectId);
  }
}
