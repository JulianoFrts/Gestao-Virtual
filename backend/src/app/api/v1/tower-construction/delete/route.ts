import { NextRequest } from "next/server";
import { PrismaTowerConstructionRepository } from "@/modules/tower/infrastructure/prisma-tower-construction.repository";
import { requireAuth } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";

import { z } from "zod";

const constructionRepo = new PrismaTowerConstructionRepository();

const deleteTowersSchema = z.object({
  ids: z.array(z.string()).min(1, "O array de IDs é obrigatório e não pode estar vazio"),
});

export async function POST(req: NextRequest): Promise<Response> {
  try {
    await requireAuth();
    const body = await req.json();
    
    const validation = deleteTowersSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.validationError(validation.error.issues.map(i => i.message));
    }

    const { ids } = validation.data;

    for (const id of ids) {
      await constructionRepo.delete(id);
    }

    return ApiResponse.json({ deleted: ids.length });
  } catch (error: unknown) {
    return handleApiError(
      error,
      "src/app/api/v1/tower-construction/delete/route.ts#POST",
    );
  }
}
