import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { ConstructionDocumentService } from "@/modules/documents/application/document.service";
import { PrismaDocumentRepository } from "@/modules/documents/infrastructure/prisma-document.repository";

// DI
const documentService = new ConstructionDocumentService(
  new PrismaDocumentRepository(),
);

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    if (!id) {
      return ApiResponse.badRequest("ID do documento é obrigatório");
    }

    // TODO: Adicionar verificação de permissão (canDeleteDocument)
    const doc = await documentService.getDocumentById(id);
    if(!doc) {
      return ApiResponse.notFound("Documento não encontrado");
    }

    await documentService.deleteDocument(id);

    logger.info("Documento removido", {
      documentId: id,
      userId: user.id,
      documentName: doc.name
    });

    return ApiResponse.json(null, "Documento removido com sucesso");
  } catch (error) {
    return handleApiError(
      error,
      "src/app/api/v1/construction_documents/[id]/route.ts#DELETE",
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return ApiResponse.badRequest("ID do documento é obrigatório");
    }

    const { id: bodyId, ...updates } = body;

    const document = await documentService.updateDocument(id, updates);

    logger.info("Documento atualizado via ID", {
      documentId: id,
      userId: user.id,
      updates: Object.keys(updates)
    });

    return ApiResponse.json(document, "Documento atualizado com sucesso");
  } catch (error) {
    return handleApiError(
      error,
      "src/app/api/v1/construction_documents/[id]/route.ts#PUT",
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    if (!id) {
      return ApiResponse.badRequest("ID do documento é obrigatório");
    }

    const document = await documentService.getDocumentById(id);
    if (!document) {
      return ApiResponse.notFound("Documento não encontrado");
    }

    return ApiResponse.json(document);
  } catch (error) {
    return handleApiError(
      error,
      "src/app/api/v1/construction_documents/[id]/route.ts#GET",
    );
  }
}
