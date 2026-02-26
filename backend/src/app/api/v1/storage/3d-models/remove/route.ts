import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import fs from "fs";
import path from "path";
import { z } from "zod";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "3d-models");

const removeModelSchema = z.object({
  path: z.string().min(1, "Caminho ausente").refine(schemaInput => !input.includes(".."), {
    message: "Caminho inválido (Directory Traversal detectado)"
  })
});

export async function DELETE(req: NextRequest): Promise<Response> {
  try {
    await requireAuth();
    const body = await req.json();
    
    const validation = removeModelSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.validationError(validation.error.issues.map(i => i.message));
    }
    
    const relPath = validation.data.path;

    const fullPath = path.join(STORAGE_ROOT, relPath.replace(/^models\//, ""));
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return ApiResponse.json({ success: true });
    }
    return ApiResponse.notFound("Arquivo não encontrado");
  } catch (err: unknown) {
    return handleApiError(err, "src/app/api/v1/storage/3d-models/remove/route.ts#DELETE");
  }
}
