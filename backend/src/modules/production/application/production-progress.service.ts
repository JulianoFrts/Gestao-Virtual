import {
  ProductionProgressRepository,
  ActivityStatus,
  ProductionProgress as IProductionProgress,
} from "../domain/production.repository";
import { ProjectElementRepository } from "../domain/project-element.repository";
import { ProductionSyncRepository } from "../domain/production-sync.repository";
import { ProductionScheduleRepository } from "../domain/production-schedule.repository";
import { ProductionProgress } from "../domain/production-progress.entity";
import { logger } from "@/lib/utils/logger";
import { PRODUCTION_STATUS } from "@/lib/constants";

export interface UpdateProductionProgressDTO {
  elementId: string;
  activityId: string;
  projectId?: string | null;
  status: ActivityStatus;
  progress: number;
  metadata?: any;
  userId: string;
  dates?: { start?: string | null; end?: string | null };
  skipSync?: boolean;
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
  ) {}

  async getElementProgress(elementId: string): Promise<ProductionProgress[]> {
    const results = await this.progressRepository.findByElement(elementId);
    return results.map((r) => new ProductionProgress(r));
  }

  async listProjectProgress(
    projectId: string,
    companyId?: string | null,
    siteId?: string,
    skip?: number,
    take?: number,
  ): Promise<any[]> {
    const elements = await this.elementRepository.findByProjectId(
      projectId,
      companyId,
      siteId,
      skip,
      take,
    );

    return elements.map((el) => this.mapElementToProgressResponse(el));
  }

  private mapElementToProgressResponse(el: any) {
    const metadata =
      typeof el.metadata === "string"
        ? JSON.parse(el.metadata)
        : el.metadata || {};

    const mappedMetadata = this.normalizeTechnicalMetadata(metadata);

    const activityStatuses = (el.productionProgress || []).map((p: any) =>
      this.mapProgressToDTO(p),
    );

    // Merge schedule data into statuses
    const schedules = el.activitySchedules || [];
    const enrichedStatuses = activityStatuses.map((status: any) => {
      const schedule = schedules.find(
        (s: any) => s.activityId === status.activityId,
      );
      if (schedule) {
        return {
          ...status,
          plannedStartDate: schedule.plannedStart,
          plannedEndDate: schedule.plannedEnd,
          plannedQuantity: schedule.plannedQuantity,
          plannedHhh: schedule.plannedHhh,
        };
      }
      return status;
    });

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
      activityStatuses: enrichedStatuses,
      activitySchedules: schedules,
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
      FUNÇÃO: "towerType",
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

  async updateProgress(
    dto: UpdateProductionProgressDTO,
  ): Promise<ProductionProgress> {
    const {
      elementId,
      activityId,
      projectId,
      status,
      progress,
      metadata,
      userId,
      dates,
    } = dto;
    logger.info(
      `Atualizando progresso: Elemento ${elementId}, Atividade ${activityId}`,
      { ...this.logContext, userId },
    );

    if (
      !elementId ||
      elementId === "undefined" ||
      !activityId ||
      activityId === "undefined"
    ) {
      throw new Error("ID do Elemento ou da Atividade inválido.");
    }

    if (activityId.startsWith("custom-")) {
      throw new Error(
        "Erro de Vínculo: Esta etapa precisa ser vinculada a uma atividade real antes de registrar progresso.",
      );
    }

    const { projectId: finalProjectId, effectiveElementId } =
      await this.resolveProjectId(elementId, projectId);

    const { finalStartDate, finalEndDate } = await this.determineEffectiveDates(
      effectiveElementId,
      activityId,
      status,
      dates,
    );

    const entity = await this.getOrCreateProgressEntity(
      effectiveElementId,
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

    if (!dto.skipSync) {
      await this.syncRepository.syncWorkStages(
        effectiveElementId,
        activityId,
        finalProjectId,
        userId,
      );
    }

    return new ProductionProgress(saved);
  }

  async updateProgressBatch(
    dtos: UpdateProductionProgressDTO[],
  ): Promise<void> {
    if (dtos.length === 0) return;

    logger.info(
      `[ProductionProgressService] Iniciando processamento em lote de ${dtos.length} atualizações de progresso`,
      this.logContext,
    );

    // 1. Coletar IDs únicos de elementos e atividades para buscas em lote
    const elementIds = Array.from(new Set(dtos.map((d) => d.elementId)));
    const activityIds = Array.from(new Set(dtos.map((d) => d.activityId)));

    // 2. Pré-carregar dados necessários (SELECT em Lote)
    const [elements, schedules, existingProgresses] = await Promise.all([
      this.elementRepository.findByIds(elementIds), // Precisa implementar findByIds
      this.scheduleRepository.findSchedulesBatch(elementIds, activityIds), // Precisa implementar
      this.progressRepository.findByElementsBatch(elementIds), // Precisa implementar
    ]);

    const elementsMap = new Map<string, any>(
      elements.map((e: any) => [e.id, e]),
    );
    const schedulesMap = new Map<string, any>(
      schedules.map((s: any) => [`${s.elementId}:${s.activityId}`, s]),
    );

    // Agrupar progressos existentes por elementId:activityId
    const progressMap = new Map<string, IProductionProgress>();
    existingProgresses.forEach((p: IProductionProgress) => {
      progressMap.set(`${p.elementId}:${p.activityId}`, p);
    });

    const entitiesToSave: ProductionProgress[] = [];

    // 3. Processar cada DTO em memória
    for (const dto of dtos) {
      const {
        elementId,
        activityId,
        status,
        progress,
        metadata,
        userId,
        dates,
        projectId: dtoProjectId,
      } = dto;
      const key = `${elementId}:${activityId}`;

      let finalStartDate = dates?.start;
      let finalEndDate = dates?.end;

      // A. Resolver ProjectId
      const projectId = dtoProjectId || elementsMap.get(elementId)?.projectId;
      if (!projectId) {
        logger.warn(
          `ProjectId não resolvido para elemento ${elementId}`,
          this.logContext,
        );
        continue;
      }

      // B. Determinar Datas Efetivas
      if (
        !finalStartDate ||
        (!finalEndDate && status === PRODUCTION_STATUS.FINISHED)
      ) {
        const schedule = schedulesMap.get(key);
        const now = new Date().toISOString();

        if (
          !finalStartDate &&
          (status === PRODUCTION_STATUS.IN_PROGRESS ||
            status === PRODUCTION_STATUS.FINISHED)
        ) {
          finalStartDate = schedule?.plannedStart
            ? new Date(schedule.plannedStart).toISOString()
            : now;
        }

        if (!finalEndDate && status === PRODUCTION_STATUS.FINISHED) {
          finalEndDate = schedule?.plannedEnd
            ? new Date(schedule.plannedEnd).toISOString()
            : now;
        }
      }

      // C. Obter ou Criar Entidade
      let entity: ProductionProgress;
      const existing = progressMap.get(key);

      if (existing) {
        entity = new ProductionProgress(existing);
        entity.startDate = finalStartDate
          ? new Date(finalStartDate)
          : entity.startDate;
        entity.endDate = finalEndDate ? new Date(finalEndDate) : entity.endDate;
      } else {
        entity = new ProductionProgress({
          projectId,
          elementId,
          activityId,
          currentStatus: PRODUCTION_STATUS.PENDING,
          progressPercent: 0,
          startDate: finalStartDate ? new Date(finalStartDate) : null,
          endDate: finalEndDate ? new Date(finalEndDate) : null,
          history: [],
          dailyProduction: {},
        });
      }

      // D. Gravar Progresso (Lógica da Entidade)
      // SELECT UPDATE PRE-CHECK: Evitar gravar se nada mudou
      if (
        entity.currentStatus === status &&
        Math.abs(entity.progressPercent - progress) < 0.01 &&
        !metadata // Se houver metadata novo, gravamos histórico mesmo com status igual
      ) {
        continue;
      }

      entity.recordProgress(
        status,
        progress,
        { ...(metadata || {}), finalStartDate, finalEndDate },
        userId,
      );

      entitiesToSave.push(entity);
    }

    // 4. Salvar tudo em uma transação (UPDATE/CREATE em Lote)
    if (entitiesToSave.length > 0) {
      await this.progressRepository.saveMany(entitiesToSave);
      logger.info(
        `[ProductionProgressService] Batch de ${entitiesToSave.length} registros persistido com sucesso.`,
      );
    } else {
      logger.info(
        `[ProductionProgressService] Nenhum registro precisou ser persistido após pre-check.`,
      );
    }
  }

  async triggerStageSync(
    elementId: string,
    activityId: string,
    projectId: string,
    userId: string,
  ) {
    return this.syncRepository.syncWorkStages(
      elementId,
      activityId,
      projectId,
      userId,
    );
  }

  private async resolveProjectId(
    elementId: string,
    projectId?: string | null,
  ): Promise<{ projectId: string; effectiveElementId: string }> {
    let effectiveElementId = elementId;
    let finalProjectId = projectId;

    if (elementId.startsWith("virtual-")) {
      const materializedId =
        await this.elementRepository.materializeVirtualElement(elementId);
      if (materializedId) {
        effectiveElementId = materializedId;
      }
    }

    if (!finalProjectId) {
      finalProjectId =
        await this.elementRepository.findProjectId(effectiveElementId);
    }

    if (!finalProjectId) {
      throw new Error(
        `ID do projeto não encontrado para o elemento ${elementId}.`,
      );
    }

    return { projectId: finalProjectId, effectiveElementId };
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
      currentStatus: PRODUCTION_STATUS.PENDING,
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
    if (!record)
      throw new Error(`Registro de progresso ${progressId} não encontrado.`);

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
        (status === PRODUCTION_STATUS.IN_PROGRESS ||
          status === PRODUCTION_STATUS.FINISHED)
      ) {
        finalStartDate = schedule?.plannedStart
          ? new Date(schedule.plannedStart).toISOString()
          : now.toISOString();
      }

      if (!finalEndDate && status === PRODUCTION_STATUS.FINISHED) {
        finalEndDate = schedule?.plannedEnd
          ? new Date(schedule.plannedEnd).toISOString()
          : now.toISOString();
      }
    }
    return { finalStartDate, finalEndDate };
  }
}
