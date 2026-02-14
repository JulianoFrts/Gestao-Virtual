import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { DatabaseDiagramService } from "@/modules/common/application/database-diagram.service";
import { PrismaDatabaseDiagramRepository } from "@/modules/common/infrastructure/prisma-database-diagram.repository";

// DI
const diagramService = new DatabaseDiagramService(
  new PrismaDatabaseDiagramRepository(),
);

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const diagrams = await diagramService.listDiagrams();
    return ApiResponse.json(diagrams);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const diagram = await diagramService.createDiagram(body);
    return ApiResponse.created(diagram);
  } catch (error) {
    return handleApiError(error);
  }
}
