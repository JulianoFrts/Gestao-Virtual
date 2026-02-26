export interface FindAllDocumentsParams {
  page: number;
  limit: number;
  companyId?: string;
  projectId?: string;
  siteId?: string;
  documentType?: string;
  search?: string;
  folderPath?: string;
}

export interface DocumentsListResult {
  items: unknown[];
  total: number;
}

export interface DocumentRepository {
  findAll(params: FindAllDocumentsParams): Promise<DocumentsListResult>;
  create(data: unknown): Promise<unknown>;
  findById(id: string): Promise<any | null>;
  update(id: string, data: unknown): Promise<unknown>;
  delete(id: string): Promise<void>;
  findByNameAndPath(
    name: string,
    folderPath: string,
    context?: { projectId?: string; siteId?: string; companyId?: string }
  ): Promise<any | null>;
}
