import { NextRequest } from "next/server";
import { PrismaTowerConstructionRepository } from "@/modules/tower/infrastructure/prisma-tower-construction.repository";
import { requireAuth } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";

const constructionRepo = new PrismaTowerConstructionRepository();

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return ApiResponse.badRequest("ids array is required");
    }

    for (const id of ids) {
      await constructionRepo.delete(id);
    }

    return ApiResponse.json({ deleted: ids.length });
  } catch (error: any) {
    return handleApiError(
      error,
      "src/app/api/v1/tower-construction/delete/route.ts#POST",
    );
  }
}
