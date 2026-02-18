import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { ReportMetadataService } from "@/modules/production/application/report-metadata.service";
import { z } from "zod";

const metadataService = new ReportMetadataService();

const previewSchema = z.object({
    projectId: z.string().min(1),
    subPointType: z.enum(['TORRE', 'VAO', 'TRECHO', 'GERAL']),
    subPoint: z.string(),
    subPointEnd: z.string().optional(),
    isMultiSelection: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        const validation = previewSchema.safeParse(body);
        if (!validation.success) {
            return ApiResponse.badRequest("Corpo da requisição inválido", validation.error.errors.map(e => e.message));
        }

        const data = await metadataService.previewInterval(validation.data);
        return ApiResponse.json(data);
    } catch (error: any) {
        return handleApiError(error, "src/app/api/v1/reports/metadata/preview/route.ts#POST");
    }
}
