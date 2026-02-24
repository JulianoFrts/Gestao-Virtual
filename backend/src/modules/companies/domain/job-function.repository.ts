export interface JobFunctionRepository {
  findAll(where: any, skip: number, take: number, orderBy: any): Promise<any[]>;
  count(where: any): Promise<number>;
  findFirst(where: any): Promise<any | null>;
  create(data: any): Promise<any>;
  update(id: string, data: any): Promise<any>;
  delete(id: string): Promise<void>;
  checkCompanyExists(companyId: string): Promise<boolean>;
}
