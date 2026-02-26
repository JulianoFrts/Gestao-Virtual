import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { ReportMetadataService } from "@/modules/production/application/report-metadata.service";
import { z } from "zod";
import { requireAuth, requireScope } from "@/lib/auth/session";

const metadataService = new ReportMetadataService();

const previewSchema = z.object({
    projectId: z.string().min(1),
    subPointType: z.enum(['TORRE', 'VAO', 'TRECHO', 'GERAL', 'ESTRUTURA']),
    subPoint: z.string(),
    subPointEnd: z.string().optional(),
    isMultiSelection: z.boolean().default(false),
    stageId: z.string().optional(),
});

export async function POST(request: NextRequest): Promise<Response> {
    try {
        await requireAuth();
        const body = await request.json();
        
        const validation = previewSchema.safeParse(body);
        if (!validation.success) {
            return ApiResponse.badRequest("Corpo da requisição inválido", validation.error.errors.map(e => e.message));
        }

        // Validação de Escopo
        const { PrismaProjectRepository } = await import("@/modules/projects/infrastructure/prisma-project.repository");
        const project = await new PrismaProjectRepository().findById(validation.data.projectId);
        if (project) {
            await requireScope(project.companyId, "COMPANY", request);
        }

        const data = await metadataService.previewInterval(validation.data);
        return ApiResponse.json(data);
    } catch (error: unknown) {
        return handleApiError(error, "src/app/api/v1/reports/metadata/preview/route.ts#POST");
    }
}
