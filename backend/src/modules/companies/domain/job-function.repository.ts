export interface JobFunctionRepository {
  findAll(where: unknown, skip: number, take: number, orderBy: unknown): Promise<any[]>;
  count(where: unknown): Promise<number>;
  findFirst(where: unknown): Promise<any | null>;
  create(data: unknown): Promise<unknown>;
  update(id: string, data: unknown): Promise<unknown>;
  delete(id: string): Promise<void>;
  checkCompanyExists(companyId: string): Promise<boolean>;
}
