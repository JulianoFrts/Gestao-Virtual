import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";
import { Validator } from "@/lib/utils/api/validator";
import { paginationQuerySchema } from "@/core/common/domain/common.schema";
import { ConstructionDocumentService } from "@/modules/documents/application/document.service";
import { PrismaDocumentRepository } from "@/modules/documents/infrastructure/prisma-document.repository";

// DI
const documentService = new ConstructionDocumentService(
  new PrismaDocumentRepository(),
);

// Schema para criação de documentos
const createDocumentSchema = z.object({
  companyId: z.string().optional(),
  projectId: z.string().optional(),
  siteId: z.string().optional(),
  name: z.string().min(1, "Nome do documento é obrigatório").max(255),
  documentType: z.string().min(1, "Tipo do documento é obrigatório"),
  fileUrl: z
    .string()
    .refine(
      (val) =>
        val.startsWith("file://") ||
        val.startsWith("http://") ||
        val.startsWith("https://"),
      { message: "URL do arquivo inválida" },
    ),
  fileSize: z.number().optional().default(0),
  folderPath: z.string().default("/"),
  status: z.string().default("valid"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// Schema para listagem (GET)
const querySchema = paginationQuerySchema.extend({
  companyId: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => val || undefined),
  projectId: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => val || undefined),
  siteId: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => val || undefined),
  documentType: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => val || undefined),
  search: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => val || undefined),
});

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const validation = Validator.validateQuery(
      querySchema,
      request.nextUrl.searchParams,
    );
    if (!validation.success) return validation.response;

    const result = await documentService.listDocuments(validation.data as any);

    return ApiResponse.json(result);
  } catch (error) {
    return handleApiError(
      error,
      "src/app/api/v1/construction_documents/route.ts#GET",
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const validation = Validator.validate(createDocumentSchema, body);
    if (!validation.success) return validation.response;

    const document = await documentService.createDocument({
      ...validation.data,
      createdById: user.id,
    });

    logger.info("Novo documento registrado no sistema", {
      documentId: document.id,
      userId: user.id,
      projectId: document.projectId,
    });

    return ApiResponse.created(document, "Documento criado com sucesso");
  } catch (error) {
    return handleApiError(
      error,
      "src/app/api/v1/construction_documents/route.ts#POST",
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return ApiResponse.badRequest("ID do documento é obrigatório");
    }

    const document = await documentService.updateDocument(id, updates);

    logger.info("Documento atualizado", {
      documentId: id,
      userId: user.id,
      updates: Object.keys(updates)
    });

    return ApiResponse.json(document, "Documento atualizado com sucesso");
  } catch (error) {
    return handleApiError(
      error,
      "src/app/api/v1/construction_documents/route.ts#PUT",
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return ApiResponse.badRequest("ID do documento é obrigatório");
    }

    const document = await documentService.getDocumentById(id);

    // TODO: Adicionar verificação de permissão (canDeleteDocument)

    await documentService.deleteDocument(id);

    logger.info("Documento removido", {
      documentId: id,
      userId: user.id,
      documentName: document.name
    });

    return ApiResponse.json(null, "Documento removido com sucesso");
  } catch (error) {
    return handleApiError(
      error,
      "src/app/api/v1/construction_documents/route.ts#DELETE",
    );
  }
}
