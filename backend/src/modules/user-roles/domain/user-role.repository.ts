export interface UserRoleRepository {
  findByUserId(userId: string): Promise<any[]>;
  create(data: unknown): Promise<unknown>;
  update(id: string, data: unknown): Promise<unknown>;
  delete(id: string): Promise<void>;
}
