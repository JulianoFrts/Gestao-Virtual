import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { DatabaseDiagramService } from "@/modules/common/application/database-diagram.service";
import { PrismaDatabaseDiagramRepository } from "@/modules/common/infrastructure/prisma-database-diagram.repository";

// DI
const diagramService = new DatabaseDiagramService(
  new PrismaDatabaseDiagramRepository(),
);

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;

    try {
      const diagram = await diagramService.getDiagram(id);
      return ApiResponse.json(diagram);
    } catch (error: any) {
      if (error.message === "NOT_FOUND") {
        return ApiResponse.notFound("Diagrama não encontrado");
      }
      throw error;
    }
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const diagram = await diagramService.updateDiagram(id, body);

    return ApiResponse.json(diagram);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;

    await diagramService.deleteDiagram(id);

    return ApiResponse.noContent();
  } catch (error) {
    return handleApiError(error);
  }
}
