import { prisma } from "@/lib/prisma/client";
import {
  DocumentRepository,
  FindAllDocumentsParams,
  DocumentsListResult,
} from "../domain/document.repository";

export class PrismaDocumentRepository implements DocumentRepository {
  async findAll(params: FindAllDocumentsParams): Promise<DocumentsListResult> {
    const { page, limit, companyId, projectId, siteId, documentType, search, folderPath } =
      params;
    const skip = (page - 1) * limit;

    const where: unknown = {};
    if (folderPath) where.folderPath = folderPath;
    if (companyId) where.companyId = companyId;
    if (projectId) where.projectId = projectId;
    if (siteId) where.siteId = siteId;
    if (documentType) where.documentType = documentType;
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const [rawItems, total] = await Promise.all([
      prisma.constructionDocument.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          company: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          site: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      }),
      prisma.constructionDocument.count({ where }),
    ]);

    // Convert BigInt to Number for JSON serialization
    const items = rawItems.map((element) => ({
      ...element,
      fileSize: element.fileSize ? Number(element.fileSize) : 0,
    }));

    return { items, total };
  }

  async create(data: unknown): Promise<unknown> {
    const result = await prisma.constructionDocument.create({
      data,
      include: {
        project: { select: { id: true, name: true } },
        site: { select: { id: true, name: true } },
      },
    });

    // Convert BigInt to Number for JSON serialization
    return {
      ...result,
      fileSize: result.fileSize ? Number(result.fileSize) : 0,
    };
  }

  async findById(id: string): Promise<any | null> {
    return prisma.constructionDocument.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        site: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: string, data: unknown): Promise<unknown> {
    return prisma.constructionDocument.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.constructionDocument.delete({
      where: { id },
    });
  }

  async findByNameAndPath(
    name: string,
    folderPath: string,
    context?: { projectId?: string; siteId?: string; companyId?: string }
  ): Promise<any | null> {
    const where: unknown = {
      name,
      folderPath,
      // Ensure specific context matches or global if not provided
      projectId: context?.projectId || null,
      siteId: context?.siteId || null,
      companyId: context?.companyId || null,
    };

    return prisma.constructionDocument.findFirst({
      where,
      include: {
        project: { select: { id: true, name: true } },
        site: { select: { id: true, name: true } },
      },
    });
  }
}
