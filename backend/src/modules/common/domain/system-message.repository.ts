export interface SystemMessageRepository {
  findAll(where: unknown, skip: number, take: number, orderBy: unknown): Promise<any[]>;
  count(where: unknown): Promise<number>;
  create(data: unknown): Promise<unknown>;
}
