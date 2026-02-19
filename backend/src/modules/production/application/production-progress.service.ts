import {
  ProductionProgressRepository,
  ActivityStatus,
} from "../domain/production.repository";
import { ProjectElementRepository } from "../domain/project-element.repository";
import { ProductionSyncRepository } from "../domain/production-sync.repository";
import { ProductionScheduleRepository } from "../domain/production-schedule.repository";
import { ProductionProgress } from "../domain/production-progress.entity";
import { logger } from "@/lib/utils/logger";

export interface UpdateProductionProgressDTO {
  elementId: string;
  activityId: string;
  projectId?: string | null;
  status: ActivityStatus;
  progress: number;
  metadata?: any;
  userId: string;
  dates?: { start?: string | null; end?: string | null };
}

export class ProductionProgressService {
  private readonly logContext = {
    source: "src/modules/production/application/production-progress.service",
  };

  constructor(
    private readonly progressRepository: ProductionProgressRepository,
    private readonly elementRepository: ProjectElementRepository,
    private readonly syncRepository: ProductionSyncRepository,
    private readonly scheduleRepository: ProductionScheduleRepository,
  ) { }

  async getElementProgress(elementId: string): Promise<ProductionProgress[]> {
    const results = await this.progressRepository.findByElement(elementId);
    return results.map((r) => new ProductionProgress(r));
  }

  async listProjectProgress(
    projectId: string,
    companyId?: string | null,
    siteId?: string,
  ): Promise<any[]> {
    const elements = await this.elementRepository.findByProjectId(
      projectId,
      companyId,
      siteId,
    );

    return elements.map((el) => this.mapElementToProgressResponse(el));
  }

  private mapElementToProgressResponse(el: any) {
    const metadata =
      typeof el.metadata === "string"
        ? JSON.parse(el.metadata)
        : el.metadata || {};

    const mappedMetadata = this.normalizeTechnicalMetadata(metadata);

    return {
      ...mappedMetadata,
      id: el.id,
      elementId: el.id,
      objectId: el.externalId,
      objectSeq: el.sequence,
      elementType: el.elementType,
      name: el.name,
      latitude: el.latitude,
      longitude: el.longitude,
      elevation: el.elevation,
      activityStatuses: (el.productionProgress || []).map((p: any) =>
        this.mapProgressToDTO(p),
      ),
      activitySchedules: el.activitySchedules || [],
    };
  }

  private mapProgressToDTO(p: any) {
    const entity = new ProductionProgress(p);
    return {
      ...entity,
      activityId: p.activityId,
      activity: p.activity,
      status: entity.currentStatus,
      progressPercent: Number(entity.progressPercent),
    };
  }

  private normalizeTechnicalMetadata(metadata: any) {
    const technicalMapping: Record<string, string> = {
      tower_type: "towerType",
      tipo_fundacao: "tipoFundacao",
      total_concreto: "totalConcreto",
      peso_armacao: "pesoArmacao",
      peso_estrutura: "pesoEstrutura",
      tramo_lancamento: "tramoLancamento",
      tipificacao_estrutura: "tipificacaoEstrutura",
      go_forward: "goForward",
      technical_km: "technicalKm",
      subtrecho: "trecho",
      SUBTRECHO: "trecho",
      ESTRUTURA: "towerType",
      "FUNÇÃO": "towerType",
      FUNCAO: "towerType",
      "TIPO ESTRUTURA": "towerType",
      TIPO: "towerType",
      "VÃO (M)": "goForward",
      "VAO (M)": "goForward",
      "VOL (M3)": "totalConcreto",
      "VOL CONCRETO": "totalConcreto",
      "AÇO (KG)": "pesoArmacao",
      "ACO (KG)": "pesoArmacao",
      "PESO ARMACAO": "pesoArmacao",
      "TORRE (T)": "pesoEstrutura",
      "PESO ESTRUTURA": "pesoEstrutura",
      "PESO TORRE": "pesoEstrutura",
    };

    const mappedMetadata = { ...metadata };
    const metadataKeys = Object.keys(metadata);

    Object.entries(technicalMapping).forEach(([sourceKey, targetKey]) => {
      if (
        metadata[targetKey] !== undefined &&
        mappedMetadata[targetKey] === undefined
      ) {
        mappedMetadata[targetKey] = metadata[targetKey];
      }

      const matchingKey = metadataKeys.find(
        (k) => k.toUpperCase() === sourceKey.toUpperCase(),
      );
      if (matchingKey && mappedMetadata[targetKey] === undefined) {
        mappedMetadata[targetKey] = metadata[matchingKey];
      }
    });

    return mappedMetadata;
  }

  async getLogsByElement(
    elementId: string,
    companyId?: string | null,
  ): Promise<any[]> {
    const records = await this.progressRepository.findByElement(elementId);

    const results: any[] = [];
    for (const record of records) {
      if (
        companyId &&
        (record as any).companyId &&
        (record as any).companyId !== companyId
      )
        continue;

      const history = Array.isArray(record.history) ? record.history : [];
      history.forEach((h: any) => {
        results.push({
          ...h,
          progressId: record.id,
          elementId: record.elementId,
          activityId: record.activityId,
        });
      });
    }

    return results.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  async getPendingLogs(companyId?: string | null): Promise<any[]> {
    const records = await this.progressRepository.findPendingLogs(companyId);

    return records.map((record) => {
      const history = Array.isArray(record.history) ? record.history : [];
      const latestLog = history.length > 0 ? history[history.length - 1] : {};

      return {
        ...latestLog,
        id: record.id,
        progressId: record.id,
        elementId: record.elementId,
        activityId: record.activityId,
        progressPercent: Number(record.progressPercent),
        createdAt: record.createdAt,
        requiresApproval: (record as any).requiresApproval,
        tower: {
          objectId:
            (record as any).element?.externalId ||
            (record as any).element?.name ||
            "N/A",
          name: (record as any).element?.name,
        },
        activity: (record as any).activity,
        project: (record as any).project,
      };
    });
  }

  async updateProgress(dto: UpdateProductionProgressDTO): Promise<ProductionProgress> {
    const { elementId, activityId, projectId, status, progress, metadata, userId, dates } = dto;
    logger.info(
      `Atualizando progresso: Elemento ${elementId}, Atividade ${activityId}`,
      { ...this.logContext, userId },
    );

    const finalProjectId = await this.resolveProjectId(elementId, projectId);

    const { finalStartDate, finalEndDate } = await this.determineEffectiveDates(
      elementId,
      activityId,
      status,
      dates,
    );

    const entity = await this.getOrCreateProgressEntity(
      elementId,
      activityId,
      finalProjectId,
      finalStartDate,
      finalEndDate,
    );

    entity.recordProgress(
      status,
      progress,
      { ...(metadata || {}), finalStartDate, finalEndDate },
      userId,
    );

    const saved = await this.progressRepository.save(entity);

    await this.syncRepository.syncWorkStages(
      elementId,
      activityId,
      finalProjectId,
      userId,
    );

    return new ProductionProgress(saved);
  }

  private async resolveProjectId(
    elementId: string,
    projectId?: string | null,
  ): Promise<string> {
    const finalProjectId =
      projectId || (await this.elementRepository.findProjectId(elementId));

    if (!finalProjectId) {
      throw new Error(
        `ID do projeto não encontrado para o elemento ${elementId}.`,
      );
    }
    return finalProjectId;
  }

  private async getOrCreateProgressEntity(
    elementId: string,
    activityId: string,
    projectId: string,
    startDate?: string | null,
    endDate?: string | null,
  ): Promise<ProductionProgress> {
    const existing = await this.progressRepository.findByElement(elementId);
    const record = existing.find((p) => p.activityId === activityId);

    if (record) {
      const entity = new ProductionProgress(record);
      entity.startDate = startDate ? new Date(startDate) : entity.startDate;
      entity.endDate = endDate ? new Date(endDate) : entity.endDate;
      return entity;
    }

    return new ProductionProgress({
      projectId,
      elementId,
      activityId,
      currentStatus: "PENDING",
      progressPercent: 0,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      history: [],
      dailyProduction: {},
    });
  }

  async approveLog(
    progressId: string,
    logTimestamp: string,
    approvedBy: string,
    userId: string,
  ): Promise<ProductionProgress> {
    logger.info(
      `Aprovando log: Registro ${progressId}, Timestamp ${logTimestamp}`,
      { ...this.logContext, userId },
    );

    const record = await this.progressRepository.findById(progressId);
    if (!record) throw new Error(`Registro de progresso ${progressId} não encontrado.`);

    const entity = new ProductionProgress(record);
    entity.approveLog(logTimestamp, approvedBy);

    const saved = await this.progressRepository.save(entity);
    return new ProductionProgress(saved);
  }

  private async determineEffectiveDates(
    elementId: string,
    activityId: string,
    status: ActivityStatus,
    dates?: { start?: string | null; end?: string | null },
  ) {
    let finalStartDate = dates?.start;
    let finalEndDate = dates?.end;

    if (!finalStartDate || (!finalEndDate && status === "FINISHED")) {
      const schedule = await this.scheduleRepository.findSchedule(
        elementId,
        activityId,
      );
      const now = new Date();

      if (
        !finalStartDate &&
        (status === "IN_PROGRESS" || status === "FINISHED")
      ) {
        finalStartDate = schedule?.plannedStart
          ? new Date(schedule.plannedStart).toISOString()
          : now.toISOString();
      }

      if (!finalEndDate && status === "FINISHED") {
        finalEndDate = schedule?.plannedEnd
          ? new Date(schedule.plannedEnd).toISOString()
          : now.toISOString();
      }
    }
    return { finalStartDate, finalEndDate };
  }
}
