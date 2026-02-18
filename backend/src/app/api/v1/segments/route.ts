import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { PrismaSegmentRepository } from "@/infrastructure/repositories/prisma-segment.repository";
import { SegmentService } from "@/core/segment/application/segment.service";
import { z } from "zod";
import { Validator } from "@/lib/utils/api/validator";
import {
  idSchema,
  paginationQuerySchema,
} from "@/core/common/domain/common.schema";

const segmentRepository = new PrismaSegmentRepository();
const segmentService = new SegmentService(segmentRepository);

// Schema for filters
const getSegmentsSchema = paginationQuerySchema.extend({
  projectId: idSchema.optional(),
  companyId: idSchema.optional(),
  select: z.string().optional(),
});

// GET /api/v1/segments?projectId=... or ?companyId=...
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    
    // Alias project_id -> projectId para compatibilidade
    if (params.project_id && !params.projectId) {
      params.projectId = params.project_id;
    }

    const validation = Validator.validate(
      getSegmentsSchema,
      params
    );
    if (!validation.success) return validation.response;

    const { projectId, companyId } = validation.data;

    // Security: Ensure users only see data from their own company unless admin
    const effectiveCompanyId = companyId || user.companyId;

    if (projectId) {
      const segments = await segmentService.getProjectSegments(projectId);
      return ApiResponse.json(segments);
    }

    if (effectiveCompanyId) {
      const segments =
        await segmentService.getCompanySegments(effectiveCompanyId);
      return ApiResponse.json(segments);
    }

    return ApiResponse.badRequest("projectId or companyId is required");
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/segments/route.ts#GET");
  }
}

// POST /api/v1/segments
export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();

    // Check if array or single
    if (Array.isArray(body)) {
      const results = await segmentService.saveSegments(body);
      return ApiResponse.json(results);
    } else {
      const result = await segmentService.saveSegment(body);
      return ApiResponse.json(result);
    }
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/segments/route.ts#POST");
  }
}

// DELETE /api/v1/segments?id=...
export async function DELETE(request: NextRequest) {
  try {
    await requireAuth();
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return ApiResponse.badRequest("ID is required");

    await segmentService.deleteSegment(id);
    return ApiResponse.json(null, "Segment deleted");
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/segments/route.ts#DELETE");
  }
}
