import {
  DocumentRepository,
  FindAllDocumentsParams,
} from "../domain/document.repository";

export class ConstructionDocumentService {
  constructor(private readonly repository: DocumentRepository) {}

  async listDocuments(params: FindAllDocumentsParams) {
    const { items, total } = await this.repository.findAll(params);
    const pages = Math.ceil(total / params.limit);

    return {
      items,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        pages,
        hasNext: params.page < pages,
        hasPrev: params.page > 1,
      },
    };
  }

  async createDocument(data: any) {
    // Check for duplicates to prevent multiple folders/files with same name/path in same context
    const existing = await this.repository.findByNameAndPath(
      data.name,
      data.folderPath,
      {
        projectId: data.projectId,
        siteId: data.siteId,
        companyId: data.companyId,
      }
    );

    if (existing) {
      // If it's a folder, return it (Idempotency)
      if (
        data.documentType === "folder" ||
        data.fileUrl?.startsWith("file://folder")
      ) {
        return existing;
      }
      // For files, we might want to allow versioning or duplicate names (depending on business rule).
      // For now, let's assume we allow duplicates for FILES (timestamps usually differ) 
      // OR we also block. Given the user reports duplication issues likely for folders:
      // We start by blocking/returning triggers only for folders.
    }

    return this.repository.create(data);
  }

  async getDocumentById(id: string) {
    const document = await this.repository.findById(id);
    if (!document) throw new Error("Documento não encontrado");
    return document;
  }

  async updateDocument(id: string, data: any) {
    return this.repository.update(id, data);
  }

  async deleteDocument(id: string) {
    return this.repository.delete(id);
  }
}
