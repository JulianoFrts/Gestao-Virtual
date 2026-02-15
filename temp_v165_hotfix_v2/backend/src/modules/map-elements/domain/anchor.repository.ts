export interface AnchorRepository {
  findFirst(where: any): Promise<any | null>;
  findMany(where: any): Promise<any[]>;
  upsert(where: any, update: any, create: any): Promise<any>;
  delete(where: any): Promise<void>;

  // Technical metadata ops
  findTechnicalData(projectId: string, externalId: string): Promise<any | null>;
  listTechnicalData(projectId: string): Promise<any[]>;
  upsertTechnicalData(params: {
    where: any;
    update: any;
    create: any;
  }): Promise<any>;

  // Legacy support
  findLegacyMany(where: any): Promise<any[]>;
  createLegacy(data: any): Promise<any>;
  deleteLegacy(id: string): Promise<void>;
}
