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

const createDiagramSchema = z.object({
  name: z.string().min(1, "O nome do diagrama é obrigatório"),
  description: z.string().optional(),
  tables: z.array(z.string()).optional(),
  layout: z.record(z.unknown()).optional(),
});

export async function GET(request: NextRequest): Promise<Response> {
  try {
    await requireAdmin();
    const diagrams = await diagramService.listDiagrams();
    return ApiResponse.json(diagrams);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    await requireAdmin();
    const body = await request.json();
    
    const validation = createDiagramSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.validationError(validation.error.issues.map(i => i.message));
    }
    
    const diagram = await diagramService.createDiagram(validation.data);
    return ApiResponse.created(diagram);
  } catch (error) {
    return handleApiError(error);
  }
}
