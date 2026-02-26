import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { DatabaseDiagramService } from "@/modules/common/application/database-diagram.service";
import { PrismaDatabaseDiagramRepository } from "@/modules/common/infrastructure/prisma-database-diagram.repository";

import { z } from "zod";

// DI
const diagramService = new DatabaseDiagramService(
  new PrismaDatabaseDiagramRepository(),
);

const updateDiagramSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional().nullable(),
  tables: z.array(z.string()).optional(),
  layout: z.record(z.unknown()).optional(),
});

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<Response> {
  try {
    await requireAdmin();
    const { id } = await params;

    try {
      const diagram = await diagramService.getDiagram(id);
      return ApiResponse.json(diagram);
    } catch (error: unknown) {
      const err = error as Error;
      if (err.message === "NOT_FOUND") {
        return ApiResponse.notFound("Diagrama não encontrado");
      }
      throw error;
    }
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams): Promise<Response> {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const validation = updateDiagramSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.validationError(validation.error.issues.map(i => i.message));
    }

    const diagram = await diagramService.updateDiagram(id, validation.data);

    return ApiResponse.json(diagram);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams): Promise<Response> {
  try {
    await requireAdmin();
    const { id } = await params;

    await diagramService.deleteDiagram(id);

    return ApiResponse.noContent();
  } catch (error) {
    return handleApiError(error);
  }
}
