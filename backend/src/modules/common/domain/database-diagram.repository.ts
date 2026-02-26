export interface DatabaseDiagramRepository {
  findAll(orderBy: unknown): Promise<any[]>;
  findById(id: string): Promise<any | null>;
  create(data: unknown): Promise<unknown>;
  update(id: string, data: unknown): Promise<unknown>;
  delete(id: string): Promise<void>;
}
