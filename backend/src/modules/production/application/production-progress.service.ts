import {
  ProductionProgressRepository,
  ActivityStatus,
  ProductionProgress as IProductionProgress,
  ProgressHistoryEntry,
} from "@/modules/production/domain/production.repository";
import { ProjectElementRepository } from "@/modules/production/domain/project-element.repository";
import { ProductionSyncRepository } from "@/modules/production/domain/production-sync.repository";
import { ProductionScheduleRepository } from "@/modules/production/domain/production-schedule.repository";
import { ProductionProgress } from "@/modules/production/domain/production-progress.entity";
import { ProductionMapper } from "@/modules/production/infrastructure/prisma-production.mapper";
import { logger } from "@/lib/utils/logger";
import { TimeProvider } from "@/lib/utils/time-provider";
import { PRODUCTION_STATUS } from "@/lib/constants";
import {
  MapElementTechnicalData,
  ActivitySchedule,
  MapElementProductionProgress,
} from "@prisma/client";
import {
  UpdateProductionProgressDTO,
  ElementProgressResponse,
  ActivityStatusDTO,
  ProductionLogDTO,
} from "./dtos/production-progress.dto";
export type {
  UpdateProductionProgressDTO,
  ElementProgressResponse,
  ActivityStatusDTO,
  ProductionLogDTO,
};

export class ProductionProgressService {
  private readonly logContext = {
    source: "src/modules/production/application/production-progress.service",
  };

  constructor(
    private readonly progressRepository: ProductionProgressRepository,
    private readonly elementRepository: ProjectElementRepository,
    private readonly syncRepository: ProductionSyncRepository,
    private readonly scheduleRepository: ProductionScheduleRepository,
    private readonly timeProvider: TimeProvider,
  ) {}

  async getElementProgress(elementId: string): Promise<ProductionProgress[]> {
    const results = await this.progressRepository.findByElement(elementId);
    return results.map((r: IProductionProgress) => new ProductionProgress(r));
  }

  async listProjectProgress(
    projectId: string,
    companyId?: string | null,
    siteId?: string,
    skip?: number,
    take?: number,
  ): Promise<ElementProgressResponse[]> {
    const elements = await this.elementRepository.findByProjectId(
      projectId,
      companyId,
      siteId,
      skip,
      take,
    );

    return elements.map((el) => this.mapElementToProgressResponse(el));
  }

  private mapElementToProgressResponse(
    el: MapElementTechnicalData & {
      productionProgress?: MapElementProductionProgress[];
      activitySchedules?: ActivitySchedule[];
    },
  ): ElementProgressResponse {
    const metadata = (
      typeof el.metadata === "string"
        ? JSON.parse(el.metadata)
        : el.metadata || {}
    ) as Record<string, unknown>;

    const mappedMetadata = this.normalizeTechnicalMetadata(metadata);

    const activityStatuses = (el.productionProgress || []).map(
      (p: MapElementProductionProgress) => this.mapProgressToDTO(p),
    );

    // [O(n) Optimization] Map schedules by activityId for fast lookup
    const schedules = el.activitySchedules || [];
    const scheduleMap = new Map(
      schedules.map((s: ActivitySchedule) => [s.activityId, s]),
    );

    const enrichedStatuses = activityStatuses.map(
      (status: ActivityStatusDTO) => {
        const schedule = scheduleMap.get(status.activityId);
        if (schedule) {
          return {
            ...status,
            plannedStartDate: schedule.plannedStart,
            plannedEndDate: schedule.plannedEnd,
            plannedQuantity: Number(schedule.plannedQuantity),
            plannedHhh: Number(schedule.plannedHhh),
          };
        }
        return status;
      },
    );

    return {
      ...mappedMetadata,
      id: el.id,
      elementId: el.id,
      objectId: el.externalId || null,
      objectSeq: el.sequence ? Number(el.sequence) : null,
      elementType: el.elementType,
      name: el.name,
      latitude: el.latitude ? Number(el.latitude) : null,
      longitude: el.longitude ? Number(el.longitude) : null,
      elevation: el.elevation ? Number(el.elevation) : null,
      activityStatuses: enrichedStatuses,
      activitySchedules: schedules,
    };
  }

  private mapProgressToDTO(p: MapElementProductionProgress): ActivityStatusDTO {
    const entity = ProductionMapper.toDomain(p);
    return ProductionMapper.toDTO(entity);
  }

  private normalizeTechnicalMetadata(metadata: Record<string, unknown>) {
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

    const mappedMetadata: Record<string, unknown> = { ...metadata };
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

  async getLogsByElement(elementId: string): Promise<ProductionLogDTO[]> {
    const records = await this.progressRepository.findByElement(elementId);

    const results: ProductionLogDTO[] = [];
    for (const record of records) {
      const history = record.history || [];
      history.forEach((h: ProgressHistoryEntry) => {
        results.push({
          ...h,
          progressId: record.id ?? "",
          elementId: record.elementId,
          activityId: record.activityId,
          progress: h.progressPercent ?? 0,
          userId: h.changedBy ?? "system",
          status: h.status as ActivityStatus,
          timestamp: h.timestamp ?? this.timeProvider.toISOString(),
        });
      });
    }

    return results.sort(
      (a, b) =>
        new Date(b.timestamp as string).getTime() -
        new Date(a.timestamp as string).getTime(),
    );
  }

  async getPendingLogs(companyId?: string | null): Promise<ProductionLogDTO[]> {
    const records = await this.progressRepository.findPendingLogs(companyId);

    return records.map((record) => {
      const history = Array.isArray(record.history) ? record.history : [];
      const latestLog =
        history.length > 0
          ? (history[history.length - 1] as ProgressHistoryEntry)
          : ({} as ProgressHistoryEntry);

      return {
        ...latestLog,
        id: record.id,
        progressId: record.id ?? "",
        elementId: record.elementId,
        activityId: record.activityId,
        progressPercent: Number(record.progressPercent),
        progress: Number(record.progressPercent),
        userId: latestLog.changedBy ?? "system",
        createdAt: record.createdAt,
        requiresApproval: record.requiresApproval,
        tower: {
          objectId:
            (record.element?.externalId as string) ||
            (record.element?.name as string) ||
            "N/A",
          name: record.element?.name as string,
        },
        activity: record.activity,
        project: record.project,
        status: (latestLog.status as ActivityStatus) || record.currentStatus,
        timestamp:
          latestLog.timestamp ??
          record.createdAt?.toISOString() ??
          this.timeProvider.toISOString(),
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

    const elementsMap = new Map<string, MapElementTechnicalData>(
      elements.map((e) => [e.id, e]),
    );
    const schedulesMap = new Map<string, ActivitySchedule>(
      schedules.map((s) => [`${s.elementId}:${s.activityId}`, s as unknown]),
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
        const now = this.timeProvider.toISOString();

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
          progressPercent: 0 /* literal */,
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
  ): Promise<void> {
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
    const record = existing.find(
      (p: IProductionProgress) => p.activityId === activityId,
    );

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
      progressPercent: 0 /* literal */,
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
      const now = this.timeProvider.now();

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
