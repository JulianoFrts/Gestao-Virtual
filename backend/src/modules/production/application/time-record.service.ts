import { TimeRecordRepository } from "../domain/time-record.repository";

export class TimeRecordService {
  constructor(private readonly repository: TimeRecordRepository) {}

  async listRecords(params: any) {
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
    if (companyId) where.companyId = companyId;
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

  async createRecord(data: any) {
    let finalCompanyId = data.companyId;
    if (!finalCompanyId) {
      finalCompanyId = await this.repository.findUserCompanyId(data.userId);
    }

    return this.repository.create({
      ...data,
      companyId: finalCompanyId,
      recordedAt: new Date(data.recordedAt),
    });
  }

  async updateRecord(id: string, data: any) {
    // Validação básica se o registro existe
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error("Registro de ponto não encontrado");

    // Formatação de data se vier no payload
    const updateData = { ...data };
    if (updateData.recordedAt) {
      updateData.recordedAt = new Date(updateData.recordedAt);
    }

    return this.repository.update(id, updateData);
  }

  async deleteRecord(id: string) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error("Registro de ponto não encontrado");

    return this.repository.delete(id);
  }
}
