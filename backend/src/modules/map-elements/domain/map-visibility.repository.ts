export interface MapVisibilityRepository {
  findMany(where: unknown): Promise<any[]>;
  findFirst(where: unknown): Promise<any | null>;
  create(data: unknown): Promise<unknown>;
  update(id: string, data: unknown): Promise<unknown>;
  updateMany(where: unknown, data: unknown): Promise<{ count: number }>;
}
