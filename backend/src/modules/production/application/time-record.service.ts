import { TimeRecordRepository } from "../domain/time-record.repository";

export class TimeRecordService {
  constructor(private readonly repository: TimeRecordRepository) {}

  async listRecords(params: unknown, securityContext?: unknown) {
    const {
      page = 1,
      limit = 20,
      userId,
      teamId,
      companyId,
      startDate,
      endDate,
    } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {};
    if (userId) where.userId = userId;
    if (teamId) where.teamId = teamId;

    // Multi-tenancy: Se não for Global Admin, forçar empresa do usuário
    if (securityContext) {
      const { isGlobalAdmin } = await import("@/lib/auth/session");
      const isGlobal = isGlobalAdmin(
        securityContext.role,
        securityContext.hierarchyLevel,
        securityContext.permissions,
      );

      if (!isGlobal) {
        where.companyId = securityContext.companyId;
      } else if (companyId) {
        where.companyId = companyId;
      }
    } else if (companyId) {
      where.companyId = companyId;
    }

    if (startDate || endDate) {
      where.recordedAt = {};
      if (startDate) where.recordedAt.gte = new Date(startDate);
      if (endDate) where.recordedAt.lte = new Date(endDate);
    }

    const [items, total] = await Promise.all([
      this.repository.findAll(where, skip, limit, { recordedAt: "desc" }),
      this.repository.count(where),
    ]);

    const pages = Math.ceil(total / limit);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1,
      },
    };
  }

  async createRecord(data: unknown, securityContext?: unknown) {
    let finalCompanyId = data.companyId;

    // Se vier do segurança de contexto e não for global admin, forçar a própria empresa
    if (securityContext) {
      const { isGlobalAdmin } = await import("@/lib/auth/session");
      const isGlobal = isGlobalAdmin(
        securityContext.role,
        securityContext.hierarchyLevel,
        securityContext.permissions,
      );

      if (!isGlobal || !finalCompanyId) {
        finalCompanyId = securityContext.companyId;
      }
    }

    if (!finalCompanyId) {
      finalCompanyId = await this.repository.findUserCompanyId(data.userId);
    }

    return this.repository.create({
      ...data,
      companyId: finalCompanyId,
      recordedAt: new Date(data.recordedAt),
    });
  }

  async updateRecord(id: string, data: unknown, securityContext?: unknown) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error("Registro de ponto não encontrado");

    // Validação de Escopo
    if (securityContext) {
      const { isGlobalAdmin } = await import("@/lib/auth/session");
      const isGlobal = isGlobalAdmin(
        securityContext.role,
        securityContext.hierarchyLevel,
        securityContext.permissions,
      );

      if (!isGlobal && existing.companyId !== securityContext.companyId) {
        throw new Error(
          "Forbidden: Não autorizado a alterar registros de outra empresa",
        );
      }
    }

    const updateData = { ...data };
    if (updateData.recordedAt) {
      updateData.recordedAt = new Date(updateData.recordedAt);
    }

    return this.repository.update(id, updateData);
  }

  async deleteRecord(id: string, securityContext?: unknown) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error("Registro de ponto não encontrado");

    // Validação de Escopo
    if (securityContext) {
      const { isGlobalAdmin } = await import("@/lib/auth/session");
      const isGlobal = isGlobalAdmin(
        securityContext.role,
        securityContext.hierarchyLevel,
        securityContext.permissions,
      );

      if (!isGlobal && existing.companyId !== securityContext.companyId) {
        throw new Error(
          "Forbidden: Não autorizado a excluir registros de outra empresa",
        );
      }
    }

    return this.repository.delete(id);
  }
}
