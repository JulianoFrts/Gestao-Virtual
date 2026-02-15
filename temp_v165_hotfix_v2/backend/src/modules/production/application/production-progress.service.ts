import {
  ProductionRepository,
  ActivityStatus,
} from "../domain/production.repository";
import { ProductionProgress } from "../domain/production-progress.entity";
import { logger } from "@/lib/utils/logger";

export class ProductionProgressService {
  private readonly logContext = {
    source: "src/modules/production/application/production-progress.service",
  };

  constructor(private readonly repository: ProductionRepository) { }

  async getElementProgress(elementId: string): Promise<ProductionProgress[]> {
    const results = await this.repository.findByElement(elementId);
    return results.map((r) => new ProductionProgress(r));
  }

  async listProjectProgress(
    projectId: string,
    companyId?: string | null,
    siteId?: string,
  ): Promise<any[]> {
    const elements = await this.repository.findElementsWithProgress(
      projectId,
      companyId,
      siteId,
    );

    return elements.map((el) => {
      const metadata =
        typeof el.metadata === "string"
          ? JSON.parse(el.metadata)
          : el.metadata || {};

      // Mapeamento de campos técnicos de snake_case ou Excel para camelCase (Compatibilidade Frontend)
      const technicalMapping: Record<string, string> = {
        // Snake Case
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

        // Excel / PT-BR Variants (Maiúsculo e formats comuns)
        "SUBTRECHO": "trecho",
        "ESTRUTURA": "towerType",
        "FUNÇÃO": "towerType",
        "FUNCAO": "towerType",
        "TIPO ESTRUTURA": "towerType",
        "TIPO": "towerType",
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

      // Normalização: Tenta encontrar chaves correspondentes no metadata (case-insensitive)
      const metadataKeys = Object.keys(metadata);

      Object.entries(technicalMapping).forEach(([sourceKey, targetKey]) => {
        // Se a chave alvo já estiver preenchida no metadata original, pula
        if (metadata[targetKey] !== undefined && mappedMetadata[targetKey] === undefined) {
          mappedMetadata[targetKey] = metadata[targetKey];
        }

        // Tenta achar a chave de origem no metadata
        const matchingKey = metadataKeys.find(k => k.toUpperCase() === sourceKey.toUpperCase());
        if (matchingKey && mappedMetadata[targetKey] === undefined) {
          mappedMetadata[targetKey] = metadata[matchingKey];
        }
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
        activityStatuses: (el.productionProgress || [])
          // .filter((p: any) => linkedActivityIds.includes(p.activityId)) // REMOVED FILTER AS REQUESTED
          .map((p: any) => {
            const entity = new ProductionProgress(p);
            return {
              ...entity,
              activityId: p.activityId,
              activity: p.activity,
              status: entity.currentStatus,
              progressPercent: Number(entity.progressPercent),
            };
          }),
        activitySchedules: el.activitySchedules || [],
      };
    });
  }

  async getLogsByElement(
    elementId: string,
    companyId?: string | null,
  ): Promise<any[]> {
    const records = await this.repository.findByElement(elementId);

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
    const records = await this.repository.findPendingLogs(companyId);

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
    elementId: string,
    activityId: string,
    projectId: string | null | undefined,
    status: ActivityStatus,
    progress: number,
    metadata: any,
    userId: string,
    dates?: { start?: string | null; end?: string | null },
  ): Promise<ProductionProgress> {
    logger.info(
      `Atualizando progresso: Elemento ${elementId}, Atividade ${activityId}`,
      { ...this.logContext, userId },
    );

    let finalProjectId = projectId;
    if (!finalProjectId) {
      finalProjectId = await this.repository.findElementProjectId(elementId);
    }

    if (!finalProjectId) {
      throw new Error(`ID do projeto não encontrado para o elemento ${elementId}. Certifique-se que o elemento existe.`);
    }

    const { finalStartDate, finalEndDate } = await this.determineEffectiveDates(
      elementId,
      activityId,
      status,
      dates,
    );

    const existing = await this.repository.findByElement(elementId);
    const progressRecord = existing.find((p) => p.activityId === activityId);

    let entity: ProductionProgress;

    const enrichedMetadata = {
      ...(metadata || {}),
      finalStartDate,
      finalEndDate,
    };

    if (progressRecord) {
      entity = new ProductionProgress(progressRecord);
      entity.startDate = finalStartDate ? new Date(finalStartDate) : entity.startDate;
      entity.endDate = finalEndDate ? new Date(finalEndDate) : entity.endDate;
      entity.recordProgress(status, progress, enrichedMetadata, userId);
    } else {
      entity = new ProductionProgress({
        projectId: finalProjectId as string,
        elementId,
        activityId,
        currentStatus: status,
        progressPercent: progress,
        startDate: finalStartDate ? new Date(finalStartDate) : null,
        endDate: finalEndDate ? new Date(finalEndDate) : null,
        history: [],
        dailyProduction: {},
      });
      entity.recordProgress(status, progress, enrichedMetadata, userId);
    }

    const saved = await this.repository.save(entity);

    await this.repository.syncWorkStages?.(
      elementId,
      activityId,
      finalProjectId as string,
      userId,
    );

    return new ProductionProgress(saved);
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

    const record = await this.repository.findById(progressId);
    if (!record) throw new Error(`Registro de progresso ${progressId} não encontrado.`);

    const entity = new ProductionProgress(record);
    entity.approveLog(logTimestamp, approvedBy);

    const saved = await this.repository.save(entity);
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
      const schedule = await this.repository.findSchedule?.(
        elementId,
        activityId,
      );
      const now = new Date();

      if (
        !finalStartDate &&
        (status === "IN_PROGRESS" || status === "FINISHED")
      ) {
        finalStartDate = schedule?.plannedStart
          ? schedule.plannedStart.toISOString()
          : now.toISOString();
      }

      if (!finalEndDate && status === "FINISHED") {
        finalEndDate = schedule?.plannedEnd
          ? schedule.plannedEnd.toISOString()
          : now.toISOString();
      }
    }
    return { finalStartDate, finalEndDate };
  }
}
