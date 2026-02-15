export interface MapVisibilityRepository {
  findMany(where: any): Promise<any[]>;
  findFirst(where: any): Promise<any | null>;
  create(data: any): Promise<any>;
  update(id: string, data: any): Promise<any>;
  updateMany(where: any, data: any): Promise<{ count: number }>;
}
