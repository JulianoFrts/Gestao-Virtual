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
  items: any[];
  total: number;
}

export interface DocumentRepository {
  findAll(params: FindAllDocumentsParams): Promise<DocumentsListResult>;
  create(data: any): Promise<any>;
  findById(id: string): Promise<any | null>;
  update(id: string, data: any): Promise<any>;
  delete(id: string): Promise<void>;
  findByNameAndPath(
    name: string,
    folderPath: string,
    context?: { projectId?: string; siteId?: string; companyId?: string }
  ): Promise<any | null>;
}
