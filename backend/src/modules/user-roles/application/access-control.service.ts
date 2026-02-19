import {
  AccessControlRepository,
  FindAllLevelsParams,
} from "../domain/access-control.repository";

import { PermissionMatrixHandler } from "../../common/infrastructure/worker/handlers/permission-matrix.handler";

export class AccessControlService {
  constructor(private readonly repository: AccessControlRepository) {}

  async listLevels(params: FindAllLevelsParams) {
    const { items, total } = await this.repository.findAllLevels(params);
    const pages = Math.ceil(total / params.limit);

    return {
      items,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        pages,
        hasNext: params.page < pages,
        hasPrev: params.page > 1,
      },
    };
  }

  async createLevel(data: {
    name: string;
    rank?: number;
    description?: string;
    permissions?: string[];
  }) {
    const existing = await this.repository.findLevelByName(data.name);
    if (existing) {
      throw new Error("Nível de permissão com este nome já existe");
    }

    const { randomUUID } = require('crypto');
    const { permissions, ...sanitizedData } = data;
    
    const enrichedData = {
      ...sanitizedData,
      id: randomUUID(),
    };

    return this.repository.createLevel(enrichedData);
  }

  async listMatrix() {
    const matrix = await this.repository.findAllMatrix();

    // Map to legacy format used by frontend if necessary (matches route.ts)
    return matrix.map((m) => ({
      level_id: m.levelId,
      module_id: m.moduleId,
      is_granted: m.isGranted,
    }));
  }

  async queueMatrixUpdate(updates: any[]) {
    if (updates.length === 0) {
      return { message: "Nenhuma alteração para processar", taskId: null };
    }

    const task = await this.repository.createQueueTask(
      "permission_matrix_update",
      updates,
    );

    // [ANTI-GRAVITY]: Execução síncrona em ambiente de desenvolvimento (sem worker)
    if (process.env.NODE_ENV === "development") {
      try {
        const handler = new PermissionMatrixHandler();
        await handler.handle(updates);
        await this.repository.updateTaskStatus(task.id, "completed");
      } catch (error) {
        console.error("Erro ao processar tarefa síncrona em dev:", error);
        await this.repository.updateTaskStatus(task.id, "failed");
      }
    }

    return {
      message:
        "Solicitação recebida! As permissões estão sendo atualizadas em segundo plano.",
      taskId: task.id,
    };
  }
}
