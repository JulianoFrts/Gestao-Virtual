export interface AnchorRepository {
  findFirst(where: Record<string, any>): Promise<Record<string, any> | null>;
  findMany(where: Record<string, any>): Promise<Record<string, any>[]>;
  upsert(where: Record<string, any>, update: Record<string, any>, create: Record<string, any>): Promise<Record<string, any>>;
  delete(where: Record<string, any>): Promise<void>;

  // Technical metadata ops
  findTechnicalData(projectId: string, externalId: string): Promise<Record<string, any> | null>;
  listTechnicalData(projectId: string): Promise<Record<string, any>[]>;
  upsertTechnicalData(params: {
    where: Record<string, any>;
    update: Record<string, any>;
    create: Record<string, any>;
  }): Promise<Record<string, any>>;

  // Legacy support
  findLegacyMany(where: Record<string, any>): Promise<Record<string, any>[]>;
  createLegacy(data: Record<string, any>): Promise<Record<string, any>>;
  deleteLegacy(id: string): Promise<void>;
}
